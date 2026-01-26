# 🤖 Fraud Detection ML API - FastAPI

API REST haute performance pour servir le modèle XGBoost de détection de fraude.

## 🚀 Démarrage Rapide

### Local (Développement)

```bash
cd fraud-ml-api

# Créer environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installer dépendances
pip install -r requirements.txt

# Lancer l'API
uvicorn app:app --reload --port 8000
```

Accéder à :
- API : http://localhost:8000
- Docs interactive : http://localhost:8000/docs
- Métriques : http://localhost:8000/metrics

### Docker (Production)

```bash
# Build image
docker build -t epicoin-fraud-ml-api .

# Run container
docker run -p 8000:8000 \
  -v $(pwd)/../supabase/functions/fraud-detection/trained_models:/app/models \
  epicoin-fraud-ml-api
```

---

## 📡 Endpoints

### `GET /`
Health check de l'API

**Réponse :**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_type": "XGBoost",
  "version": "1.0.0"
}
```

### `POST /predict`
Prédire si une transaction est frauduleuse

**Request :**
```json
{
  "amount": 5000,
  "oldbalanceOrg": 10000,
  "newbalanceOrig": 5000,
  "oldbalanceDest": 0,
  "newbalanceDest": 5000,
  "type_TRANSFER": 1,
  "step": 1
}
```

**Response :**
```json
{
  "fraud_probability": 0.89,
  "fraud_score": 89,
  "prediction": "fraud",
  "latency_ms": 0.23
}
```

### `GET /metrics`
Obtenir les métriques du modèle

**Réponse :**
```json
{
  "model": "XGBoost",
  "recall": 0.997,
  "precision": 0.965,
  "f1_score": 0.981,
  "auc_roc": 1.0,
  "latency_p95_ms": 0.23,
  "trained_on": "2026-01-20"
}
```

---

## 🔗 Intégration avec Supabase Edge Functions

Modifier `supabase/functions/fraud-detection/index.ts` :

```typescript
// Remplacer l'URL Hugging Face par votre API FastAPI
const ML_API_URL = Deno.env.get('FRAUD_ML_API_URL') || 'http://localhost:8000'

async function callMLModel(features: Record<string, any>): Promise<number> {
    const response = await fetch(`${ML_API_URL}/predict`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(features)
    })

    if (!response.ok) {
        throw new Error(`ML API error: ${response.statusText}`)
    }

    const result = await response.json()
    return result.fraud_score
}
```

Décommenter les lignes 268-276 dans `fraud-detection/index.ts` pour activer le ML.

---

## ☁️ Déploiement Production

### Option 1: AWS Lambda (Serverless)

```bash
# Installer AWS SAM CLI
brew install aws-sam-cli

# Template SAM
sam init --runtime python3.11 --app-template hello-world

# Déployer
sam build
sam deploy --guided
```

### Option 2: Google Cloud Run

```bash
# Build et push image
gcloud builds submit --tag gcr.io/PROJECT_ID/fraud-ml-api

# Deploy
gcloud run deploy fraud-ml-api \
  --image gcr.io/PROJECT_ID/fraud-ml-api \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1
```

### Option 3: AWS ECS Fargate

```bash
# Push vers ECR
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com

docker tag epicoin-fraud-ml-api:latest ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/fraud-ml-api:latest
docker push ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/fraud-ml-api:latest

# Créer service ECS
aws ecs create-service \
  --cluster epicoin-cluster \
  --service-name fraud-ml-api \
  --task-definition fraud-ml-api:1 \
  --desired-count 2 \
  --launch-type FARGATE
```

---

## 📊 Performance

**Latency Benchmarks :**
- Local : ~0.2-0.5ms
- Docker : ~0.3-0.7ms
- Cloud Run : ~5-10ms (cold start: ~2s)
- Lambda : ~10-20ms (cold start: ~3s)

**Throughput :**
- 1 worker : ~500 req/s
- 2 workers : ~800 req/s
- 4 workers : ~1200 req/s

---

## 🧪 Tests

```bash
# Test santé
curl http://localhost:8000/

# Test prédiction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "oldbalanceOrg": 10000,
    "newbalanceOrig": 5000,
    "type_TRANSFER": 1
  }'

# Test métriques
curl http://localhost:8000/metrics
```

**Load test avec Apache Bench :**
```bash
ab -n 1000 -c 10 -p test_payload.json -T application/json http://localhost:8000/predict
```

---

## 🔒 Sécurité

### API Key Authentication (Production)

Ajouter dans `app.py` :

```python
from fastapi import Security, HTTPException
from fastapi.security.api_key import APIKeyHeader

API_KEY = "your-secret-key"
api_key_header = APIKeyHeader(name="X-API-Key")

def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")

@app.post("/predict", dependencies=[Depends(verify_api_key)])
async def predict_fraud(features: TransactionFeatures):
    ...
```

### HTTPS/TLS

En production, toujours utiliser HTTPS (géré automatiquement par Cloud Run/Lambda).

---

## 📈 Monitoring

### Logs

```python
# Ajouter dans app.py
import logging
from pythonjsonlogger import jsonlogger

logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)
```

### Metrics (Prometheus)

```bash
pip install prometheus-fastapi-instrumentator

# Dans app.py
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
```

Métriques disponibles sur : `http://localhost:8000/metrics` (Prometheus format)

---

## 🚨 Troubleshooting

**Erreur: "Modèles non chargés"**
- Vérifier que les fichiers `.pkl` existent dans `trained_models/`
- Vérifier les permissions de lecture

**Latency élevée**
- Utiliser plusieurs workers : `uvicorn app:app --workers 4`
- Activer le cache de prédictions (Redis)
- Optimiser la taille du modèle (pruning XGBoost)

**Memory leak**
- Vérifier que les modèles ne sont chargés qu'une fois (au startup)
- Limiter la taille des batches (`/batch_predict`)

---

## 📚 Ressources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [XGBoost Python API](https://xgboost.readthedocs.io/en/stable/python/index.html)
- [Deploying ML Models](https://madewithml.com/courses/mlops/deployment/)

