#!/usr/bin/env python3
"""
Script d'upload du modèle ML indépendant vers Hugging Face
"""

import os
import sys
from huggingface_hub import HfApi, login

# Configuration
REPO_ID = "QuentinJassey/epicoin-fraud-detection-enriched"
FILES_TO_UPLOAD = [
    "fraud_model_independent.pkl",
    "scaler_independent.pkl",
    "label_encoders_independent.pkl",
    "model_metadata_independent.json"
]

print("=" * 80)
print("📤 Upload du Modèle ML Indépendant vers Hugging Face")
print("=" * 80)
print()

# 1. Vérifier que les fichiers existent
print("📂 Vérification des fichiers...")
missing_files = []
for file in FILES_TO_UPLOAD:
    if not os.path.exists(file):
        missing_files.append(file)
        print(f"  ❌ {file} - MANQUANT")
    else:
        size_mb = os.path.getsize(file) / (1024 * 1024)
        print(f"  ✅ {file} ({size_mb:.2f} MB)")

if missing_files:
    print(f"\n❌ {len(missing_files)} fichier(s) manquant(s) !")
    print("💡 Lancez d'abord : python3 train_independent_model.py")
    sys.exit(1)

print()

# 2. Vérifier le token Hugging Face
hf_token = os.getenv("HUGGINGFACE_TOKEN")
if not hf_token:
    print("⚠️  HUGGINGFACE_TOKEN non configuré !")
    print()
    print("📝 Deux options :")
    print()
    print("Option 1 : Login interactif")
    print("   huggingface-cli login")
    print()
    print("Option 2 : Variable d'environnement")
    print("   export HUGGINGFACE_TOKEN='ton_token'")
    print()
    
    # Essayer le login interactif
    try:
        print("🔐 Tentative de login interactif...")
        login()
        print("✅ Login réussi !")
    except Exception as e:
        print(f"❌ Erreur de login : {e}")
        print()
        print("💡 Obtenir un token :")
        print("   1. Aller sur https://huggingface.co/settings/tokens")
        print("   2. Créer un token avec droits 'write'")
        print("   3. Lancer : huggingface-cli login")
        sys.exit(1)
else:
    print("✅ HUGGINGFACE_TOKEN configuré")
    try:
        login(token=hf_token)
        print("✅ Login réussi !")
    except Exception as e:
        print(f"❌ Erreur de login : {e}")
        sys.exit(1)

print()

# 3. Upload des fichiers
print(f"📤 Upload vers {REPO_ID}...")
print()

api = HfApi()

for file in FILES_TO_UPLOAD:
    print(f"  📤 Upload de {file}...")
    try:
        api.upload_file(
            path_or_fileobj=file,
            path_in_repo=file,
            repo_id=REPO_ID,
            repo_type="model",
            commit_message=f"Update {file} - Modèle indépendant (sans fraud_score)"
        )
        print(f"     ✅ {file} uploadé avec succès")
    except Exception as e:
        print(f"     ❌ Erreur : {e}")
        print()
        print("💡 Vérifiez que :")
        print("   1. Le repository existe : https://huggingface.co/" + REPO_ID)
        print("   2. Vous avez les droits d'écriture")
        print("   3. Votre token est valide")
        sys.exit(1)

print()
print("=" * 80)
print("✅ SUCCÈS ! Tous les fichiers ont été uploadés")
print("=" * 80)
print()
print("📝 Prochaines étapes :")
print()
print("1️⃣  Mettre à jour handler.py sur Hugging Face")
print("   Remplacer les noms de fichiers :")
print("   - fraud_model_enriched.pkl → fraud_model_independent.pkl")
print("   - scaler_enriched.pkl → scaler_independent.pkl")
print("   - label_encoders_enriched.pkl → label_encoders_independent.pkl")
print()
print("2️⃣  Mettre à jour index.ts localement")
print("   Dans buildMLFeatures(), enlever fraud_score (feature #2)")
print("   → Passer de 19 features à 18 features")
print()
print("3️⃣  Redéployer la fonction fraud-detection")
print("   cd /Users/quent/Documents/PGD\\ 5/epicoin-app")
print("   npx supabase functions deploy fraud-detection --no-verify-jwt")
print()
print("4️⃣  Tester avec une transaction réelle")
print("   Le ML devrait maintenant retourner des scores plus nuancés !")
print()
print("🔗 Liens utiles :")
print(f"   - Repository : https://huggingface.co/{REPO_ID}")
print(f"   - Files : https://huggingface.co/{REPO_ID}/tree/main")
print()
