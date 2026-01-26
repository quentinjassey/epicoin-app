# 🤗 Déploiement du Modèle sur Hugging Face

## Étape 1: Créer un Compte Hugging Face

1. Aller sur https://huggingface.co/join
2. Créer un compte gratuit
3. Générer un token API : https://huggingface.co/settings/tokens
   - Name: "epicoin-fraud-detection"
   - Role: "write"

## Étape 2: Installer les Dépendances

```bash
pip install huggingface_hub
```

## Étape 3: Uploader le Modèle

Créez ce script : `upload_to_hf.py`

```python
from huggingface_hub import HfApi, create_repo
import os

# Configuration
HF_TOKEN = "hf_YOUR_TOKEN_HERE"  # Remplacer par votre token
REPO_NAME = "epicoin-fraud-xgboost"  # Nom du repository
USERNAME = "votre-username"  # Votre username HF

api = HfApi()

# Créer le repository
try:
    create_repo(
        repo_id=f"{USERNAME}/{REPO_NAME}",
        token=HF_TOKEN,
        repo_type="model",
        private=False  # Public ou private selon besoin
    )
    print(f"✅ Repository créé: {USERNAME}/{REPO_NAME}")
except Exception as e:
    print(f"ℹ️ Repository existe déjà: {e}")

# Uploader les fichiers du modèle
files_to_upload = [
    "trained_models/xgboost.pkl",
    "trained_models/scaler.pkl",
    "trained_models/metadata.json",
    "metrics.json"
]

for file_path in files_to_upload:
    api.upload_file(
        path_or_fileobj=file_path,
        path_in_repo=os.path.basename(file_path),
        repo_id=f"{USERNAME}/{REPO_NAME}",
        token=HF_TOKEN
    )
    print(f"✅ Uploaded: {file_path}")

print(f"\n🎉 Modèle déployé sur: https://huggingface.co/{USERNAME}/{REPO_NAME}")
```

Exécutez :
```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"
python upload_to_hf.py
```

## Étape 4: Créer l'API d'Inférence

Créez `inference_api.py` dans votre repo HF :

```python
from typing import Dict
import pickle
import numpy as np
import xgboost as xgb

# Cette fonction sera appelée par HF Inference API
def predict(data: Dict) -> Dict:
    """
    Prédiction de fraude
    
    Input:
        data: {
            "inputs": {
                "amount": 500,
                "oldbalanceOrg": 1000,
                "newbalanceOrig": 500,
                "oldbalanceDest": 0,
                "newbalanceDest": 500,
                "type": "TRANSFER",
                "step": 1,
                ... autres features
            }
        }
    
    Output:
        {
            "fraud_probability": 0.85,
            "fraud_score": 85,
            "prediction": "fraud"
        }
    """
    # Charger le modèle et scaler (mis en cache après premier appel)
    model = xgb.Booster()
    model.load_model("xgboost.pkl")
    
    with open("scaler.pkl", "rb") as f:
        scaler = pickle.load(f)
    
    # Extraire features
    features = data.get("inputs", {})
    
    # Créer array numpy dans le bon ordre (selon metadata.json)
    feature_names = [
        'amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 
        'newbalanceDest', 'step', 'errorBalanceOrig', 'errorBalanceDest',
        'delta_balance_orig', 'delta_balance_dest', 'ratio_amount_balance',
        'type_CASH_IN', 'type_CASH_OUT', 'type_DEBIT', 
        'type_PAYMENT', 'type_TRANSFER'
    ]
    
    X = np.array([[features.get(f, 0) for f in feature_names]])
    
    # Normaliser
    X_scaled = scaler.transform(X)
    
    # Prédiction
    dmatrix = xgb.DMatrix(X_scaled)
    fraud_prob = float(model.predict(dmatrix)[0])
    
    return {
        "fraud_probability": fraud_prob,
        "fraud_score": int(fraud_prob * 100),
        "prediction": "fraud" if fraud_prob > 0.5 else "legitimate"
    }
```

## Étape 5: Configurer Supabase

Ajouter les variables d'environnement dans Supabase Dashboard → Settings → Edge Functions:

```
HUGGING_FACE_API_KEY=hf_YOUR_TOKEN_HERE
HUGGING_FACE_MODEL_URL=https://api-inference.huggingface.co/models/USERNAME/epicoin-fraud-xgboost
```

## Étape 6: Activer le Modèle dans fraud-detection

La fonction `fraud-detection/index.ts` a déjà le code prêt (ligne 267-276).

Il suffit de **décommenter** les lignes 268-276 dans `index.ts` :

```typescript
// 14. Optionnel: Appeler modèle ML externe (Hugging Face)
// Décommenter si modèle déployé
try {
    const mlScore = await callMLModel(features)
    // Mixer score règles + ML (70% règles, 30% ML pour transition douce)
    riskScore = Math.round(riskScore * 0.7 + mlScore * 0.3)
} catch (error) {
    console.warn('[Fraud Detection] ML model unavailable, using rules only:', error.message)
}
```

Et redéployer :
```bash
supabase functions deploy fraud-detection
```

## Étape 7: Tester

```bash
curl -X POST \
  "https://api-inference.huggingface.co/models/USERNAME/epicoin-fraud-xgboost" \
  -H "Authorization: Bearer hf_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "amount": 5000,
      "oldbalanceOrg": 10000,
      "newbalanceOrig": 5000,
      "oldbalanceDest": 0,
      "newbalanceDest": 5000,
      "type_TRANSFER": 1,
      "step": 1
    }
  }'
```

---

## 🎯 Résultat Final

Avec le modèle XGBoost intégré :

**Performance :**
- Recall: **99.7%** (détecte presque toutes les fraudes)
- Precision: **96.5%** (3.5% de faux positifs seulement)
- Latency totale: **~300-400ms** (Edge Function + HF API)

**Décisions :**
- Score ML + Règles heuristiques (mix 70/30)
- Seuils : approve ≤30, review 31-70, block >70

---

## ⚠️ Limitations Hugging Face (Gratuit)

- 30,000 requêtes/mois max
- Pas de SLA garanti
- Cold start ~2-3s (première requête)

Pour production : Migrer vers Option 1 (FastAPI sur AWS/GCP).

