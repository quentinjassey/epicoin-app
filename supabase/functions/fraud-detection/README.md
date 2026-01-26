---
tags:
- fraud-detection
- xgboost
- financial
- epicoin
library_name: xgboost
pipeline_tag: tabular-classification
---

# EpiCoin Fraud Detection Model - Enriched Version

Modèle de détection de fraude enrichi pour EpiCoin, entraîné sur 960 transactions avec 19 features enrichies.

## Performances

| Métrique | Valeur |
|----------|--------|
| Accuracy | 99.59% |
| AUC-ROC | 0.980 |
| Latence | 0.19 ms |
| Model | xgboost |
| Training Date | 2026-01-23T00:07:30.575176 |

## Features Utilisées

Les 19 features suivantes sont utilisées :

```
- amount_numeric
- fraud_score
- hour
- day_of_week
- execution_delay
- transaction_type_encoded
- direction_encoded
- country_encoded
- city_encoded
- provider_encoded
- status_encoded
- os_name_encoded
- type_encoded
- user_avg_amount
- user_std_amount
- user_tx_count
- user_fraud_ratio
- amount_deviation
- device_tx_count
```

## Utilisation

### Via Python

```python
import pickle
from huggingface_hub import hf_hub_download

# Télécharger le modèle
model_path = hf_hub_download(repo_id="QuentinJassey/epicoin-fraud-detection-enriched", filename="fraud_model_enriched.pkl")
scaler_path = hf_hub_download(repo_id="QuentinJassey/epicoin-fraud-detection-enriched", filename="scaler_enriched.pkl")

# Charger
with open(model_path, 'rb') as f:
    model = pickle.load(f)
    
with open(scaler_path, 'rb') as f:
    scaler = pickle.load(f)

# Prédire
features = [...19 features...]
features_scaled = scaler.transform([features])
fraud_proba = model.predict_proba(features_scaled)[0][1]
fraud_score = int(fraud_proba * 100)
```

### Via API Inference

```typescript
const response = await fetch(
  'https://api-inference.huggingface.co/models/QuentinJassey/epicoin-fraud-detection-enriched',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_HF_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: features  // Array de 19 features
    })
  }
)
```

## Déploiement Production

Ce modèle est utilisé en production dans les Edge Functions Supabase d'EpiCoin pour détecter les transactions frauduleuses en temps réel.

### Architecture

1. Transaction entrante → Collecte features enrichies
2. Règles heuristiques → fraud_score initial (0-100)
3. Modèle ML → Affine le score avec patterns appris
4. Décision finale → APPROVE / REVIEW / BLOCK

## License

MIT
