# 🤖 Guide Complet - Entraînement et Déploiement du Modèle ML Enrichi

## 📋 Résumé du Système

Vous avez maintenant un système de détection de fraude complet avec :

### ✅ Données Enrichies (1200 transactions synthétiques)
- **Identifiants** : `transaction_id`, `provider`, `provider_tx_id`
- **Acteurs** : `initiator_user_id`, `sender_id`, `receiver_id`
- **Financier** : `amount`, `currency`
- **Type** : `transaction_type` (P2P, MERCHANT, CASHIN), `direction`
- **Statut** : `status`, `reason_code`
- **Temporel** : `created_at`, `provider_created_at`, `executed_at`
- **Géographique** : `country`, `city`
- **Technique** : `device_info` (device_id, os_name, ip, etc.)
- **Fraude** : `fraud_score`, `fraud_features`

### ✅ 60 Profils Utilisateurs
- Créés via l'API Auth de Supabase
- Emails : `synthetic_xxx@test.epicoin.app`
- Balances aléatoires entre 100 et 10000 EPC

---

## 🚀 Étape 1 : Entraînement du Modèle (EN COURS)

### 1.1 Exporter la clé Supabase

```bash
export SUPABASE_SERVICE_ROLE_KEY='votre_clé_complète'
```

### 1.2 Lancer l'entraînement

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"
python3 train_enriched_model.py
```

### 1.3 Ce que fait le script

1. **Récupération** : Télécharge les 1200 transactions depuis Supabase
2. **Préparation** : 
   - Extrait `is_fraud` depuis `fraud_features`
   - Parse `device_info` (JSON → colonnes)
   - Calcule des features temporelles (hour, day_of_week, execution_delay)
3. **Feature Engineering** :
   - Encode les variables catégorielles (country, city, transaction_type, etc.)
   - Calcule des statistiques par utilisateur (avg_amount, fraud_ratio)
   - Calcule des déviations (amount_deviation)
   - Compte les transactions par device
4. **Entraînement** : 
   - Split 80/20 (train/test)
   - Entraîne **Random Forest** et **XGBoost**
   - Normalise avec `StandardScaler`
5. **Évaluation** :
   - Accuracy, Precision, Recall, F1-score
   - AUC-ROC
   - Latence moyenne (< 300ms requis)
6. **Sauvegarde** :
   - `fraud_model_enriched.pkl` (modèle XGBoost ou RF)
   - `scaler_enriched.pkl` (normalisation)
   - `label_encoders_enriched.pkl` (encodage catégoriel)
   - `model_metadata_enriched.json` (métadonnées)

### 1.4 Résultats attendus

- ✅ **Precision** : > 80% (peu de faux positifs)
- ✅ **Recall** : > 85% (détecte la majorité des fraudes)
- ✅ **AUC-ROC** : > 0.90 (excellente séparation)
- ✅ **Latence** : < 300ms (temps réel)

---

## 📤 Étape 2 : Upload vers Hugging Face (Optionnel)

### 2.1 Créer un repo Hugging Face

```bash
# Installer huggingface_hub
pip install huggingface_hub

# Login
huggingface-cli login
```

### 2.2 Script d'upload

Créer `upload_enriched_model.py` :

```python
from huggingface_hub import HfApi
import os

api = HfApi()

# Upload du modèle
api.upload_file(
    path_or_fileobj="/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection/fraud_model_enriched.pkl",
    path_in_repo="fraud_model_enriched.pkl",
    repo_id="votre-username/epicoin-fraud-detection-enriched",
    repo_type="model",
    token=os.getenv("HUGGINGFACE_TOKEN")
)

# Upload du scaler
api.upload_file(
    path_or_fileobj="/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection/scaler_enriched.pkl",
    path_in_repo="scaler_enriched.pkl",
    repo_id="votre-username/epicoin-fraud-detection-enriched",
    repo_type="model"
)

# Upload des encoders
api.upload_file(
    path_or_fileobj="/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection/label_encoders_enriched.pkl",
    path_in_repo="label_encoders_enriched.pkl",
    repo_id="votre-username/epicoin-fraud-detection-enriched",
    repo_type="model"
)

# Upload metadata
api.upload_file(
    path_or_fileobj="/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection/model_metadata_enriched.json",
    path_in_repo="model_metadata_enriched.json",
    repo_id="votre-username/epicoin-fraud-detection-enriched",
    repo_type="model"
)

print("✅ Modèle uploadé sur Hugging Face !")
```

---

## 🔧 Étape 3 : Intégration dans l'Edge Function

### 3.1 Option A : Utiliser le modèle local (POC)

Modifier `supabase/functions/fraud-detection/index.ts` pour charger le modèle enrichi :

```typescript
// Appeler le modèle via une API locale (FastAPI)
const mlResponse = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    features: {
      amount: transaction.amount,
      transaction_type: transaction.transaction_type,
      country: transaction.country,
      city: transaction.city,
      device_id: transaction.device_info.device_id,
      // ... autres features
    }
  })
})
```

### 3.2 Option B : Utiliser Hugging Face Inference API

```typescript
const mlResponse = await fetch(
  'https://api-inference.huggingface.co/models/votre-username/epicoin-fraud-detection-enriched',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('HUGGINGFACE_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: [
        transaction.amount,
        transaction_type_encoded,
        country_encoded,
        // ... features dans le bon ordre
      ]
    })
  }
)
```

### 3.3 Option C : FastAPI local (Recommandé pour tests)

Créer `fraud-ml-api/app_enriched.py` :

```python
from fastapi import FastAPI
import pickle
import numpy as np

app = FastAPI()

# Charger le modèle au démarrage
with open('fraud_model_enriched.pkl', 'rb') as f:
    model = pickle.load(f)

with open('scaler_enriched.pkl', 'rb') as f:
    scaler = pickle.load(f)

with open('label_encoders_enriched.pkl', 'rb') as f:
    encoders = pickle.load(f)

@app.post("/predict")
async def predict(features: dict):
    # Encoder les features catégorielles
    encoded_features = []
    
    for feature_name, value in features.items():
        if feature_name in encoders:
            try:
                encoded = encoders[feature_name].transform([value])[0]
            except:
                encoded = -1  # Unknown value
        else:
            encoded = value
        encoded_features.append(encoded)
    
    # Normaliser
    features_scaled = scaler.transform([encoded_features])
    
    # Prédire
    fraud_proba = model.predict_proba(features_scaled)[0][1]
    fraud_score = int(fraud_proba * 100)
    
    return {
        "fraud_score": fraud_score,
        "is_fraud": fraud_score > 70
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
```

Lancer :

```bash
cd fraud-ml-api
uvicorn app_enriched:app --reload --port 8000
```

---

## 🧪 Étape 4 : Tests

### 4.1 Tester le modèle localement

```python
import pickle
import json

# Charger le modèle
with open('fraud_model_enriched.pkl', 'rb') as f:
    model = pickle.load(f)

with open('scaler_enriched.pkl', 'rb') as f:
    scaler = pickle.load(f)

# Transaction test (légitime)
features = [
    50.0,  # amount
    30,    # fraud_score
    14,    # hour
    2,     # day_of_week
    2.5,   # execution_delay
    0,     # transaction_type_encoded (P2P)
    0,     # direction_encoded (outgoing)
    10,    # country_encoded (FR)
    5,     # city_encoded (Paris)
    0,     # provider_encoded (stripe)
    0,     # status_encoded (completed)
    0,     # os_name_encoded (iOS)
    1,     # type_encoded (transfer)
    45.0,  # user_avg_amount
    15.0,  # user_std_amount
    10,    # user_tx_count
    0.0,   # user_fraud_ratio
    0.33,  # amount_deviation
    3      # device_tx_count
]

features_scaled = scaler.transform([features])
proba = model.predict_proba(features_scaled)[0][1]

print(f"Probabilité de fraude: {proba * 100:.1f}%")
```

### 4.2 Tester via l'API FastAPI

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.0,
    "transaction_type": "P2P",
    "country": "FR",
    "city": "Paris",
    "provider": "stripe",
    "status": "completed",
    "os_name": "iOS",
    "type": "transfer"
  }'
```

---

## 📊 Étape 5 : Monitoring & Amélioration Continue

### 5.1 Collecter les vraies transactions

- ✅ Les transactions réelles vont enrichir la base
- ✅ Récupérer toutes les features (country, device_info, etc.)
- ✅ Enregistrer les `fraud_score` prédits

### 5.2 Réentraîner régulièrement

```bash
# Tous les mois ou quand 1000+ nouvelles transactions
python3 train_enriched_model.py
```

### 5.3 A/B Testing

- **Groupe A** : Modèle actuel (règles heuristiques 100%)
- **Groupe B** : Modèle mixte (60% règles + 40% ML)
- **Groupe C** : ML pur (100% ML)

Comparer :
- Taux de faux positifs (légitimes bloqués)
- Taux de faux négatifs (fraudes non détectées)
- Latence moyenne

---

## 🎯 Métriques de Succès

### Objectifs réglementaires (du cahier des charges)

| Métrique | Objectif | Statut |
|----------|----------|--------|
| Latence ML | < 300ms | ✅ À vérifier après entraînement |
| Recall (détection fraudes) | ≥ 85% | ✅ À vérifier après entraînement |
| Precision (peu faux positifs) | ≥ 80% | ✅ À vérifier après entraînement |
| Compréhension utilisateur | 80%+ | ⏳ Tests utilisateurs requis |

### Conformité

- ✅ **KYC** : Profils utilisateurs avec email
- ✅ **AML** : Détection patterns suspects (structuring, montants élevés)
- ✅ **DSP2** : Authentification Supabase Auth
- ⚠️ **PCI-DSS** : POC uniquement (pas certifié Level 1)
- ✅ **GDPR** : Données pseudonymisées pour tests

---

## 📝 Checklist Finale

### Avant production

- [ ] Migrations SQL appliquées (`APPLY_FINAL_FIXED.sql`)
- [ ] Données synthétiques insérées (1200 transactions + 60 profils)
- [ ] Modèle ML entraîné (XGBoost ou Random Forest)
- [ ] Performances validées (Precision ≥ 80%, Recall ≥ 85%, Latence < 300ms)
- [ ] Edge Function `fraud-detection` mise à jour pour utiliser le nouveau modèle
- [ ] Edge Functions `confirm-payment`, `transfer`, `purchase` intégrées
- [ ] Edge Functions `intercampus-send` et `intercampus-receive` déployées
- [ ] Tests utilisateurs (5 personnes, objectif 80% compréhension)
- [ ] Interface admin enrichie (affichage country, device, type, etc.)
- [ ] Tests end-to-end (top-up, P2P, achat, intercampus)

### Pour migration vers production certifiée

- [ ] Architecture cloud certifiée (AWS/GCP/Azure PCI-DSS Level 1)
- [ ] KYC avec Onfido ou équivalent
- [ ] AML avec screening listes OFAC/UE
- [ ] DSP2 avec 2FA (Authy, SMS)
- [ ] PCI-DSS : Audit externe
- [ ] GDPR : DPO désigné
- [ ] FastAPI pour ML serving (au lieu de Deno)
- [ ] PostgreSQL managé (RDS/Cloud SQL)
- [ ] Redis pour cache (ElastiCache/Memorystore)

---

## 🚀 Résumé de ce qui a été fait

1. ✅ **Migrations SQL** : Enrichissement table `transactions` + création `wallets`
2. ✅ **Frontend Context** : `lib/transactionContext.ts` (device + location)
3. ✅ **Fraud Detection Refonte** : 13 catégories de règles heuristiques enrichies
4. ✅ **Edge Functions** : `confirm-payment`, `intercampus-send`, `intercampus-receive`
5. ✅ **Données Synthétiques** : 1200 transactions + 60 profils utilisateurs
6. ⏳ **Entraînement ML** : Script prêt, en attente d'exécution

---

## 📞 Support

Si erreurs pendant l'entraînement :

1. **ModuleNotFoundError** : `pip install scikit-learn xgboost pandas numpy`
2. **Supabase error** : Vérifier `SUPABASE_SERVICE_ROLE_KEY`
3. **Pas de transactions** : Relancer `generate_synthetic_transactions.py`
4. **Mauvaises performances** : Augmenter les données (2000+ transactions)

---

**Date de création** : 2026-01-22  
**Status** : Entraînement en cours  
**Prochaine étape** : Lancer `train_enriched_model.py`
