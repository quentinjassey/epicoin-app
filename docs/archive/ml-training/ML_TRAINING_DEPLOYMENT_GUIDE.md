# 🤖 Guide complet : Entraînement et déploiement du modèle ML enrichi

## Vue d'ensemble

Ce guide vous explique comment entraîner un nouveau modèle de Machine Learning qui utilise **toutes les nouvelles features enrichies** (country, device, provider, etc.) et le déployer pour qu'il soit utilisé par votre application.

## 📋 Prérequis

1. **Données** : Au moins 1000-5000 transactions avec les nouveaux champs
2. **Python 3.8+** installé
3. **Compte Hugging Face** (gratuit) : https://huggingface.co/join
4. **Git LFS** installé : `brew install git-lfs` (macOS) ou `apt-get install git-lfs` (Linux)

---

## 🎯 Étape 1 : Collecter les données depuis Supabase

### 1.1 Exporter les transactions enrichies

Allez dans Supabase Dashboard > SQL Editor et exécutez :

```sql
COPY (
  SELECT 
    -- Identifiants
    id,
    initiator_user_id,
    
    -- Montants
    amount,
    currency,
    
    -- Types
    type,
    transaction_type,
    direction,
    provider,
    
    -- Géographie
    country,
    city,
    
    -- Device
    device_info->>'device_id' as device_id,
    device_info->>'device_model' as device_model,
    device_info->>'os_name' as os_name,
    
    -- Temporel
    EXTRACT(HOUR FROM created_at) as hour_of_day,
    EXTRACT(DOW FROM created_at) as day_of_week,
    created_at,
    executed_at,
    
    -- Statut et fraude
    status,
    fraud_score,
    
    -- Label pour ML (1 = fraude, 0 = légitime)
    CASE 
      WHEN status = 'failed' AND fraud_score > 70 THEN 1
      WHEN status IN ('completed', 'pending') THEN 0
      ELSE NULL
    END as is_fraud,
    
    -- Features calculées
    (SELECT balance FROM profiles WHERE id = initiator_user_id) as user_balance,
    (SELECT created_at FROM profiles WHERE id = initiator_user_id) as user_created_at
    
  FROM transactions
  WHERE created_at > '2026-01-22'  -- Depuis la migration
    AND country IS NOT NULL          -- Avec données enrichies
    AND status IN ('completed', 'failed', 'pending')
  ORDER BY created_at DESC
) TO '/tmp/enriched_transactions.csv' WITH CSV HEADER;
```

**Alternative** : Si l'export direct ne fonctionne pas, utilisez le client Supabase :

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"
```

Créez un fichier `export_data.py` :

```python
from supabase import create_client, Client
import pandas as pd
import os

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Récupérer les transactions
response = supabase.table('transactions')\
    .select('*')\
    .gte('created_at', '2026-01-22')\
    .not_.is_('country', 'null')\
    .in_('status', ['completed', 'failed', 'pending'])\
    .execute()

# Convertir en DataFrame
df = pd.DataFrame(response.data)

# Labelliser
df['is_fraud'] = ((df['status'] == 'failed') & (df['fraud_score'] > 70)).astype(int)

# Sauvegarder
df.to_csv('enriched_transactions.csv', index=False)
print(f"✅ Exported {len(df)} transactions")
```

Exécutez :

```bash
python export_data.py
```

### 1.2 Vérifier les données

```python
import pandas as pd

df = pd.read_csv('enriched_transactions.csv')

print(f"📊 Dataset: {len(df)} transactions")
print(f"🔴 Fraudes: {df['is_fraud'].sum()} ({df['is_fraud'].mean()*100:.2f}%)")
print(f"✅ Légitimes: {(df['is_fraud']==0).sum()} ({(df['is_fraud']==0).mean()*100:.2f}%)")
print(f"\n📍 Pays uniques: {df['country'].nunique()}")
print(f"📱 Appareils uniques: {df['device_id'].nunique()}")
print(f"🏦 Providers: {df['provider'].unique()}")
```

**Minimum requis** : 
- Au moins **500 transactions** dont **50 fraudes** (10%)
- Si vous avez moins, attendez d'avoir plus de données

---

## 🛠️ Étape 2 : Entraîner le modèle enrichi

### 2.1 Installer les dépendances

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# Créer un environnement virtuel
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# ou venv\Scripts\activate  # Windows

# Installer les packages
pip install pandas numpy scikit-learn xgboost imbalanced-learn joblib
```

### 2.2 Exécuter l'entraînement

Le script `train_enriched_model.py` est déjà créé. Modifiez la ligne 24 pour pointer vers vos données :

```python
# Dans train_enriched_model.py, ligne 24
df = pd.read_csv('enriched_transactions.csv')
```

Exécutez :

```bash
python train_enriched_model.py
```

**Sortie attendue** :

```
🚀 Entraînement du modèle ML enrichi pour détection de fraude

1️⃣ Chargement des données...
   Données chargées : 2543 transactions
   Fraudes : 127 (5.00%)

2️⃣ Feature engineering...
   Features créées : 13

3️⃣ Entraînement des modèles...
🔹 Training Random Forest...
✅ Random Forest accuracy: 0.9821

🔹 Training XGBoost...
✅ XGBoost accuracy: 0.9876

📊 XGBoost Classification Report:
              precision    recall  f1-score   support
           0       0.99      1.00      0.99       483
           1       0.96      0.88      0.92        26

    accuracy                           0.99       509
   macro avg       0.97      0.94      0.95       509
weighted avg       0.99      0.99      0.99       509

🎯 Top 10 Most Important Features (XGBoost):
                       feature  importance
0                       amount    0.285341
1          amount_balance_ratio    0.178923
2               country_encoded    0.142567
3                   hour_of_day    0.098234
4              provider_encoded    0.087654
...

4️⃣ Sauvegarde des modèles...
✅ Modèles sauvegardés dans trained_models_enriched/

✅ Entraînement terminé !
```

### 2.3 Vérifier les modèles sauvegardés

```bash
ls -lh trained_models_enriched/
```

Vous devriez voir :
- `xgboost_enriched.pkl` (~2-5 MB)
- `random_forest_enriched.pkl` (~5-15 MB)
- `scaler_enriched.pkl` (~10 KB)
- `encoders.pkl` (~5 KB)
- `metadata.json` (~500 bytes)

---

## ☁️ Étape 3 : Uploader sur Hugging Face

### 3.1 Créer un compte et un repo Hugging Face

1. Allez sur https://huggingface.co/join et créez un compte
2. Créez un nouveau modèle : https://huggingface.co/new
   - **Nom** : `epicoin-fraud-detection-enriched`
   - **Type** : Model
   - **Visibilité** : Private (recommandé) ou Public
3. Notez l'URL : `https://huggingface.co/VOTRE_USERNAME/epicoin-fraud-detection-enriched`

### 3.2 Créer un token d'accès

1. Allez sur https://huggingface.co/settings/tokens
2. Cliquez sur "New token"
3. **Nom** : `epicoin-fraud-api`
4. **Type** : Write
5. Copiez le token (commence par `hf_...`)

### 3.3 Uploader les modèles

Créez un fichier `upload_to_hf.py` :

```python
from huggingface_hub import HfApi, create_repo
import os

# Configuration
HF_TOKEN = "hf_VOTRE_TOKEN_ICI"  # Remplacer par votre token
HF_USERNAME = "VOTRE_USERNAME"   # Remplacer par votre username
REPO_NAME = "epicoin-fraud-detection-enriched"

# Créer l'API client
api = HfApi()

# Créer le repo (si pas déjà fait)
try:
    create_repo(
        repo_id=f"{HF_USERNAME}/{REPO_NAME}",
        token=HF_TOKEN,
        private=True,
        exist_ok=True
    )
    print(f"✅ Repo créé : {HF_USERNAME}/{REPO_NAME}")
except Exception as e:
    print(f"⚠️ Repo existe déjà ou erreur : {e}")

# Uploader tous les fichiers
files_to_upload = [
    "trained_models_enriched/xgboost_enriched.pkl",
    "trained_models_enriched/scaler_enriched.pkl",
    "trained_models_enriched/encoders.pkl",
    "trained_models_enriched/metadata.json"
]

for file_path in files_to_upload:
    print(f"📤 Upload {file_path}...")
    api.upload_file(
        path_or_fileobj=file_path,
        path_in_repo=os.path.basename(file_path),
        repo_id=f"{HF_USERNAME}/{REPO_NAME}",
        token=HF_TOKEN
    )
    print(f"✅ {file_path} uploaded")

print("\n🎉 Tous les fichiers ont été uploadés !")
print(f"🔗 Votre modèle : https://huggingface.co/{HF_USERNAME}/{REPO_NAME}")
```

Installez la lib et exécutez :

```bash
pip install huggingface_hub
python upload_to_hf.py
```

### 3.4 Créer un fichier d'inférence

Sur Hugging Face, créez un fichier `inference.py` dans votre repo :

```python
import pickle
import json
import numpy as np

def handler(event, context):
    """
    Handler pour Hugging Face Inference API
    """
    try:
        # Charger les modèles (cachés en mémoire)
        if not hasattr(handler, 'model'):
            with open('xgboost_enriched.pkl', 'rb') as f:
                handler.model = pickle.load(f)
            with open('scaler_enriched.pkl', 'rb') as f:
                handler.scaler = pickle.load(f)
            with open('encoders.pkl', 'rb') as f:
                handler.encoders = pickle.load(f)
        
        # Extraire les features depuis la requête
        inputs = event.get('inputs', {})
        
        # Construire le vecteur de features
        features = [
            inputs.get('amount', 0),
            inputs.get('country_encoded', 0),
            inputs.get('provider_encoded', 0),
            inputs.get('transaction_type_encoded', 0),
            inputs.get('direction_encoded', 0),
            inputs.get('is_high_risk_country', 0),
            inputs.get('device_id_hash', 0),
            inputs.get('hour_of_day', 12),
            inputs.get('is_night_hour', 0),
            inputs.get('is_business_hour', 1),
            inputs.get('amount_balance_ratio', 0),
            inputs.get('is_high_amount', 0),
            inputs.get('is_round_amount', 0)
        ]
        
        # Scaler et prédire
        features_scaled = handler.scaler.transform([features])
        fraud_probability = handler.model.predict_proba(features_scaled)[0][1]
        
        return {
            'fraud_probability': float(fraud_probability),
            'fraud_score': int(fraud_probability * 100)
        }
        
    except Exception as e:
        return {'error': str(e)}
```

---

## 🔗 Étape 4 : Configurer Supabase pour utiliser le nouveau modèle

### 4.1 Mettre à jour les secrets Supabase

1. Allez sur https://supabase.com/dashboard/project/srvkyiugewdjrpvcmquq/settings/vault/secrets
2. Mettez à jour ou créez ces secrets :

```
HUGGINGFACE_API_KEY = hf_VOTRE_TOKEN
HUGGINGFACE_MODEL_URL = https://api-inference.huggingface.co/models/VOTRE_USERNAME/epicoin-fraud-detection-enriched
```

### 4.2 Tester l'API Hugging Face

Créez un fichier `test_hf_api.py` :

```python
import requests
import os

HF_API_KEY = "hf_VOTRE_TOKEN"
HF_MODEL_URL = "https://api-inference.huggingface.co/models/VOTRE_USERNAME/epicoin-fraud-detection-enriched"

headers = {
    "Authorization": f"Bearer {HF_API_KEY}"
}

# Test avec des données d'exemple
test_data = {
    "inputs": {
        "amount": 500,
        "country_encoded": 1,
        "provider_encoded": 2,
        "transaction_type_encoded": 1,
        "direction_encoded": 1,
        "is_high_risk_country": 0,
        "device_id_hash": 123,
        "hour_of_day": 14,
        "is_night_hour": 0,
        "is_business_hour": 1,
        "amount_balance_ratio": 0.3,
        "is_high_amount": 0,
        "is_round_amount": 0
    }
}

response = requests.post(HF_MODEL_URL, headers=headers, json=test_data)

print("Status:", response.status_code)
print("Response:", response.json())
```

Exécutez :

```bash
python test_hf_api.py
```

**Sortie attendue** :

```
Status: 200
Response: {'fraud_probability': 0.023, 'fraud_score': 2}
```

---

## 🚀 Étape 5 : Redéployer fraud-detection avec le nouveau modèle

La fonction `fraud-detection` est déjà configurée pour utiliser Hugging Face ! Assurez-vous juste que :

1. ✅ Les secrets sont configurés dans Supabase
2. ✅ L'API Hugging Face répond correctement (test ci-dessus)

### 5.1 Vérifier que fraud-detection utilise le ML

Regardez les logs après un top-up :

```bash
# Via Supabase Dashboard > Functions > fraud-detection > Logs
```

Vous devriez voir :
```
[Fraud Detection Enhanced] ML model active, mixed score: 45
```

Si vous voyez :
```
[Fraud Detection Enhanced] ML model unavailable, using rules only: ...
```

➡️ Vérifiez les secrets Supabase et l'URL Hugging Face.

---

## 📊 Étape 6 : Monitorer et améliorer

### 6.1 Collecter les métriques

Après 1-2 semaines d'utilisation, analysez les performances :

```sql
-- Taux de faux positifs (transactions légitimes bloquées)
SELECT 
  COUNT(*) FILTER (WHERE fraud_score > 70 AND status = 'completed') as false_positives,
  COUNT(*) FILTER (WHERE fraud_score > 70) as total_high_risk,
  ROUND(100.0 * COUNT(*) FILTER (WHERE fraud_score > 70 AND status = 'completed') / 
        NULLIF(COUNT(*) FILTER (WHERE fraud_score > 70), 0), 2) as false_positive_rate
FROM transactions
WHERE created_at > NOW() - INTERVAL '7 days';

-- Taux de faux négatifs (fraudes non détectées)
SELECT 
  COUNT(*) FILTER (WHERE fraud_score <= 70 AND status = 'failed') as false_negatives,
  COUNT(*) FILTER (WHERE status = 'failed') as total_frauds,
  ROUND(100.0 * COUNT(*) FILTER (WHERE fraud_score <= 70 AND status = 'failed') / 
        NULLIF(COUNT(*) FILTER (WHERE status = 'failed'), 0), 2) as false_negative_rate
FROM transactions
WHERE created_at > NOW() - INTERVAL '7 days';

-- Distribution des scores
SELECT 
  CASE 
    WHEN fraud_score <= 30 THEN '0-30 (Low)'
    WHEN fraud_score <= 70 THEN '31-70 (Medium)'
    ELSE '71-100 (High)'
  END as risk_category,
  COUNT(*) as count,
  ROUND(AVG(fraud_score), 2) as avg_score
FROM transactions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;
```

### 6.2 Réentraîner périodiquement

**Recommandation** : Réentraîner le modèle tous les 1-3 mois avec les nouvelles données.

1. Exportez les nouvelles transactions
2. Réexécutez `train_enriched_model.py`
3. Uploadez sur Hugging Face (écrase les anciens fichiers)
4. Pas besoin de redéployer fraud-detection (il utilise automatiquement la dernière version)

---

## 🎯 Résumé des étapes

```
1. ✅ Collecter données (1000+ transactions avec nouveaux champs)
   └─→ export_data.py ou SQL COPY

2. ✅ Entraîner modèle enrichi
   └─→ python train_enriched_model.py

3. ✅ Uploader sur Hugging Face
   ├─→ Créer compte + repo
   ├─→ Créer token
   └─→ python upload_to_hf.py

4. ✅ Configurer Supabase
   ├─→ HUGGINGFACE_API_KEY
   └─→ HUGGINGFACE_MODEL_URL

5. ✅ Tester
   ├─→ python test_hf_api.py
   └─→ Vérifier logs fraud-detection

6. ✅ Monitorer & améliorer
   └─→ Réentraîner tous les 1-3 mois
```

---

## ⚠️ FAQ et dépannage

**Q: Combien de temps prend l'entraînement ?**
A: 2-10 minutes selon la taille des données (1000 tx ≈ 2 min)

**Q: Hugging Face est-il gratuit ?**
A: Oui, l'API Inference est gratuite avec limites (30k requêtes/mois). Pour production intensive, prévoir $9/mois.

**Q: Puis-je héberger le modèle ailleurs ?**
A: Oui ! Voir le guide `ML_INTEGRATION_GUIDE.md` pour FastAPI, AWS Lambda, ou ONNX.

**Q: Le modèle ne détecte pas bien les fraudes**
A: 
1. Vérifiez que vous avez assez de données (>1000 transactions dont >50 fraudes)
2. Vérifiez le feature engineering (les encodages sont-ils corrects ?)
3. Ajustez les seuils dans fraud-detection/index.ts (RISK_THRESHOLDS)

**Q: Erreur "Model is loading" sur Hugging Face**
A: Normal au premier appel. Attendez 30-60s et réessayez.

---

**Date de création** : 2026-01-22
**Auteur** : Guide complet ML pour EpiCoin fraud detection
