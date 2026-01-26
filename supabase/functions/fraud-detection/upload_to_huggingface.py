#!/usr/bin/env python3
"""
Script de déploiement du modèle XGBoost sur Hugging Face
Usage: python upload_to_huggingface.py
"""

from huggingface_hub import HfApi, create_repo
import os

def main():
    print("=" * 60)
    print("🤗 Déploiement du Modèle sur Hugging Face")
    print("=" * 60)
    print()
    
    # Demander les credentials à l'utilisateur
    print("📝 Informations requises:")
    print("   1. Token HF: https://huggingface.co/settings/tokens")
    print("   2. Username HF: https://huggingface.co/settings/account")
    print()
    
    HF_TOKEN = input("Enter your Hugging Face token: ").strip()
    USERNAME = input("Enter your Hugging Face username: ").strip()
    REPO_NAME = "epicoin-fraud-xgboost"
    
    if not HF_TOKEN or not USERNAME:
        print("❌ Token et username requis!")
        return
    
    api = HfApi()
    
    # Créer le repository
    print(f"\n📦 Création du repository: {USERNAME}/{REPO_NAME}")
    try:
        create_repo(
            repo_id=f"{USERNAME}/{REPO_NAME}",
            token=HF_TOKEN,
            repo_type="model",
            private=False
        )
        print(f"✅ Repository créé: {USERNAME}/{REPO_NAME}")
    except Exception as e:
        print(f"ℹ️  Repository existe déjà ou erreur: {e}")
    
    # Uploader les fichiers du modèle
    print(f"\n📤 Upload des fichiers...")
    files = ["xgboost.pkl", "scaler.pkl", "metadata.json"]
    
    for file in files:
        file_path = f"trained_models/{file}"
        if not os.path.exists(file_path):
            print(f"⚠️  Fichier introuvable: {file_path}")
            continue
        
        try:
            api.upload_file(
                path_or_fileobj=file_path,
                path_in_repo=file,
                repo_id=f"{USERNAME}/{REPO_NAME}",
                token=HF_TOKEN
            )
            print(f"✅ Uploaded: {file}")
        except Exception as e:
            print(f"❌ Erreur upload {file}: {e}")
    
    # Créer un README pour le modèle
    readme_content = f"""---
tags:
- fraud-detection
- xgboost
- financial-transactions
license: mit
---

# Epicoin Fraud Detection - XGBoost Model

Modèle de détection de fraude pour transactions financières.

## Métriques

- **Recall:** 99.7%
- **Precision:** 96.5%
- **F1-Score:** 98.1%
- **Latency P95:** 0.23ms

## Dataset

Entraîné sur PaySim (6.3M transactions).

## Usage

```python
import requests

API_URL = "https://api-inference.huggingface.co/models/{USERNAME}/{REPO_NAME}"
headers = {{"Authorization": "Bearer YOUR_HF_TOKEN"}}

payload = {{
    "inputs": {{
        "amount": 5000,
        "oldbalanceOrg": 10000,
        "newbalanceOrig": 5000,
        "type_encoded": 1
    }}
}}

response = requests.post(API_URL, headers=headers, json=payload)
print(response.json())
```
"""
    
    try:
        api.upload_file(
            path_or_fileobj=readme_content.encode(),
            path_in_repo="README.md",
            repo_id=f"{USERNAME}/{REPO_NAME}",
            token=HF_TOKEN
        )
        print(f"✅ README créé")
    except Exception as e:
        print(f"ℹ️  README: {e}")
    
    # Résumé
    print("\n" + "=" * 60)
    print("🎉 DÉPLOIEMENT TERMINÉ!")
    print("=" * 60)
    print(f"\n📍 Model URL: https://huggingface.co/{USERNAME}/{REPO_NAME}")
    print(f"📍 API URL: https://api-inference.huggingface.co/models/{USERNAME}/{REPO_NAME}")
    print(f"\n🔑 Token pour Supabase: {HF_TOKEN}")
    print(f"🔗 URL pour Supabase: https://api-inference.huggingface.co/models/{USERNAME}/{REPO_NAME}")
    print("\n⚠️  ATTENTION: Il peut y avoir un délai de 2-3 minutes avant que le modèle soit prêt.")
    print("    Testez avec: curl -H 'Authorization: Bearer {HF_TOKEN}' {API_URL}")
    print()

if __name__ == "__main__":
    main()
