"""
Upload du modèle enrichi vers Hugging Face pour utilisation dans Edge Functions
"""

import json
import os
import pickle

from huggingface_hub import HfApi, create_repo

# Configuration
HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN")
REPO_NAME = "epicoin-fraud-detection-enriched"
USERNAME = os.getenv("HUGGINGFACE_USERNAME", "votre-username")  # À remplacer

if not HUGGINGFACE_TOKEN:
    print("❌ HUGGINGFACE_TOKEN non configuré !")
    print("   1. Allez sur https://huggingface.co/settings/tokens")
    print("   2. Créez un token avec write access")
    print("   3. Exportez: export HUGGINGFACE_TOKEN='hf_xxx...'")
    exit(1)

print("=" * 80)
print("📤 Upload du Modèle Enrichi vers Hugging Face")
print("=" * 80)
print()

api = HfApi()

# Créer le repo
repo_id = f"{USERNAME}/{REPO_NAME}"

print(f"📦 Création/Vérification du repo: {repo_id}")
try:
    create_repo(
        repo_id=repo_id,
        repo_type="model",
        exist_ok=True,
        token=HUGGINGFACE_TOKEN
    )
    print(f"  ✅ Repo prêt: https://huggingface.co/{repo_id}")
except Exception as e:
    print(f"  ⚠️  Repo existe déjà ou erreur: {e}")

print()

# Fichiers à uploader
files = [
    ("fraud_model_enriched.pkl", "Model XGBoost entraîné"),
    ("scaler_enriched.pkl", "StandardScaler pour normalisation"),
    ("label_encoders_enriched.pkl", "Encoders pour variables catégorielles"),
    ("model_metadata_enriched.json", "Métadonnées du modèle")
]

for filename, description in files:
    print(f"📤 Upload: {filename} ({description})...")
    try:
        api.upload_file(
            path_or_fileobj=filename,
            path_in_repo=filename,
            repo_id=repo_id,
            repo_type="model",
            token=HUGGINGFACE_TOKEN
        )
        print(f"  ✅ Uploadé")
    except Exception as e:
        print(f"  ❌ Erreur: {e}")

print()

# Créer le README
print("📝 Création du README...")

with open("model_metadata_enriched.json", "r") as f:
    metadata = json.load(f)

readme_content = f"""---
tags:
- fraud-detection
- xgboost
- financial
- epicoin
library_name: xgboost
pipeline_tag: tabular-classification
---

# EpiCoin Fraud Detection Model - Enriched Version

Modèle de détection de fraude enrichi pour EpiCoin, entraîné sur {metadata['training_samples']} transactions avec 19 features enrichies.

## Performances

| Métrique | Valeur |
|----------|--------|
| Accuracy | {metadata['accuracy']:.2%} |
| AUC-ROC | {metadata['auc_roc']:.3f} |
| Latence | {metadata['latency_ms']:.2f} ms |
| Model | {metadata['model_type']} |
| Training Date | {metadata['training_date']} |

## Features Utilisées

Les {len(metadata['features'])} features suivantes sont utilisées :

```
{chr(10).join('- ' + f for f in metadata['features'])}
```

## Utilisation

### Via Python

```python
import pickle
from huggingface_hub import hf_hub_download

# Télécharger le modèle
model_path = hf_hub_download(repo_id="{repo_id}", filename="fraud_model_enriched.pkl")
scaler_path = hf_hub_download(repo_id="{repo_id}", filename="scaler_enriched.pkl")

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
  'https://api-inference.huggingface.co/models/{repo_id}',
  {{
    method: 'POST',
    headers: {{
      'Authorization': 'Bearer YOUR_HF_TOKEN',
      'Content-Type': 'application/json'
    }},
    body: JSON.stringify({{
      inputs: features  // Array de 19 features
    }})
  }}
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
"""

with open("README.md", "w") as f:
    f.write(readme_content)

api.upload_file(
    path_or_fileobj="README.md",
    path_in_repo="README.md",
    repo_id=repo_id,
    repo_type="model",
    token=HUGGINGFACE_TOKEN
)
print(f"  ✅ README créé")

print()

# Créer le handler d'inférence
print("📝 Création du handler d'inférence...")

inference_handler = '''"""
Handler d'inférence pour Hugging Face Inference API
"""

import pickle
import numpy as np
from typing import Dict, Any

def load_models():
    """Charge le modèle, scaler et encoders"""
    with open('fraud_model_enriched.pkl', 'rb') as f:
        model = pickle.load(f)
    
    with open('scaler_enriched.pkl', 'rb') as f:
        scaler = pickle.load(f)
    
    with open('label_encoders_enriched.pkl', 'rb') as f:
        encoders = pickle.load(f)
    
    return model, scaler, encoders

# Charger au démarrage
model, scaler, encoders = load_models()

def handler(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handler pour l'API Inference de Hugging Face
    
    Input:
        data: {
            "inputs": [19 features numériques déjà encodées et normalisées]
        }
    
    Output:
        {
            "fraud_score": int (0-100),
            "fraud_probability": float (0-1),
            "is_fraud": bool
        }
    """
    try:
        inputs = data.get("inputs", [])
        
        # Si c'est une liste de listes (batch), prendre la première
        if isinstance(inputs[0], list):
            inputs = inputs[0]
        
        # Prédire
        features = np.array([inputs])
        fraud_proba = model.predict_proba(features)[0][1]
        fraud_score = int(fraud_proba * 100)
        
        return {
            "fraud_score": fraud_score,
            "fraud_probability": float(fraud_proba),
            "is_fraud": fraud_score > 70
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "fraud_score": 0,
            "fraud_probability": 0.0,
            "is_fraud": False
        }
'''

with open("handler.py", "w") as f:
    f.write(inference_handler)

api.upload_file(
    path_or_fileobj="handler.py",
    path_in_repo="handler.py",
    repo_id=repo_id,
    repo_type="model",
    token=HUGGINGFACE_TOKEN
)
print(f"  ✅ Handler créé")

print()
print("=" * 80)
print("✅ UPLOAD TERMINÉ AVEC SUCCÈS !")
print("=" * 80)
print()
print(f"🌐 Votre modèle est disponible sur: https://huggingface.co/{repo_id}")
print()
print("🔑 Configuration Supabase:")
print(f"   1. Allez dans Supabase Dashboard > Project Settings > Edge Functions")
print(f"   2. Ajoutez les secrets:")
print(f"      HUGGINGFACE_API_KEY = votre_token_hf")
print(f"      HUGGINGFACE_MODEL_ID = {repo_id}")
print()
print("🚀 Prochaines étapes:")
print("   1. Configurer les secrets Supabase")
print("   2. Déployer l'Edge Function fraud-detection mise à jour")
print("   3. Tester avec une vraie transaction")
print()
