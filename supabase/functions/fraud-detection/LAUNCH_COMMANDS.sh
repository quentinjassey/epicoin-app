#!/bin/bash

# 🚀 Commandes pour Déployer le Modèle ML Final (17 features)

cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# ─────────────────────────────────────────────────────────────────────────────
# 1️⃣  CONFIGURER LES CLÉS
# ─────────────────────────────────────────────────────────────────────────────

# Supabase (OBLIGATOIRE)
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Hugging Face (OBLIGATOIRE)
export HUGGINGFACE_TOKEN="hf_..."

# ─────────────────────────────────────────────────────────────────────────────
# 2️⃣  ENTRAÎNER LE MODÈLE (17 features - sans fraud_score ni status)
# ─────────────────────────────────────────────────────────────────────────────

python3 train_independent_model.py

# ─────────────────────────────────────────────────────────────────────────────
# 3️⃣  UPLOAD SUR HUGGING FACE
# ─────────────────────────────────────────────────────────────────────────────

python3 upload_to_huggingface.py

# ─────────────────────────────────────────────────────────────────────────────
# 4️⃣  ATTENDRE REDÉPLOIEMENT HUGGING FACE (~2 min)
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "⏳ Attendre 2 minutes pour le redéploiement sur Hugging Face..."
echo "🔗 Vérifier : https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/deployments"
echo ""
sleep 120

# ─────────────────────────────────────────────────────────────────────────────
# 5️⃣  METTRE À JOUR index.ts ET REDÉPLOYER
# ─────────────────────────────────────────────────────────────────────────────

cd "/Users/quent/Documents/PGD 5/epicoin-app"

# NOTE: Il faut MANUELLEMENT retirer 'status' de buildMLFeatures() dans index.ts
# Voir CORRECTION_STATUS_LEAKAGE.md pour les détails

# Une fois index.ts mis à jour, redéployer :
npx supabase functions deploy fraud-detection --no-verify-jwt

# ─────────────────────────────────────────────────────────────────────────────
# 6️⃣  TESTER
# ─────────────────────────────────────────────────────────────────────────────

# Faire une transaction dans l'app, puis :
npx supabase functions logs fraud-detection --tail
