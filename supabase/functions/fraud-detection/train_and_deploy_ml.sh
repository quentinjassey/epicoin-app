#!/bin/bash

echo "================================================================================"
echo "🚀 Script Complet : Génération, Entraînement et Déploiement ML"
echo "================================================================================"
echo ""

# Vérifier que la clé Supabase est configurée
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY non définie !"
    echo ""
    echo "💡 Pour configurer :"
    echo "   export SUPABASE_SERVICE_ROLE_KEY='ta_cle_service_role'"
    echo ""
    exit 1
fi

echo "✅ SUPABASE_SERVICE_ROLE_KEY configurée"
echo ""

# Étape 1 : Générer les transactions synthétiques
echo "📊 Étape 1/4 : Génération de 5000 transactions synthétiques..."
echo "─────────────────────────────────────────────────────────────────────────────"
python3 generate_synthetic_transactions.py
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la génération des transactions"
    exit 1
fi
echo ""

# Étape 2 : Entraîner le modèle indépendant
echo "🤖 Étape 2/4 : Entraînement du modèle ML indépendant (sans fraud_score)..."
echo "─────────────────────────────────────────────────────────────────────────────"
python3 train_independent_model.py
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'entraînement du modèle"
    exit 1
fi
echo ""

# Étape 3 : Tester le modèle
echo "🧪 Étape 3/4 : Test du modèle avec différents scénarios..."
echo "─────────────────────────────────────────────────────────────────────────────"
python3 test_ml_scenarios.py
if [ $? -ne 0 ]; then
    echo "⚠️  Erreur lors des tests (non bloquant)"
fi
echo ""

# Étape 4 : Upload sur Hugging Face
echo "📤 Étape 4/4 : Upload sur Hugging Face..."
echo "─────────────────────────────────────────────────────────────────────────────"
python3 upload_to_huggingface.py
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'upload sur Hugging Face"
    echo "💡 Vous pouvez uploader manuellement les fichiers *_independent.* sur :"
    echo "   https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched"
    exit 1
fi
echo ""

echo "================================================================================"
echo "✅ SUCCÈS ! Modèle ML entraîné et déployé"
echo "================================================================================"
echo ""
echo "📝 Prochaines étapes :"
echo "   1. Mettre à jour handler.py sur Hugging Face (utiliser fichiers *_independent.*)"
echo "   2. Mettre à jour index.ts (enlever fraud_score de buildMLFeatures)"
echo "   3. Redéployer la fonction : npx supabase functions deploy fraud-detection --no-verify-jwt"
echo "   4. Tester avec une transaction réelle"
echo ""
echo "📊 Fichiers générés :"
echo "   - fraud_model_independent.pkl"
echo "   - scaler_independent.pkl"
echo "   - label_encoders_independent.pkl"
echo "   - model_metadata_independent.json"
echo ""
