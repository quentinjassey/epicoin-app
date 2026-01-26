#!/bin/bash

echo "================================================================================"
echo "🚀 Déploiement Final : Modèle ML Sans Data Leakage (17 Features)"
echo "================================================================================"
echo ""
echo "Ce script va :"
echo "  1. Nettoyer les anciennes données de test"
echo "  2. Régénérer 5000 transactions propres"
echo "  3. Entraîner le modèle (17 features - SANS fraud_score NI status)"
echo "  4. Uploader sur Hugging Face"
echo "  5. Mettre à jour l'Edge Function"
echo "  6. Tester le résultat"
echo ""
echo "================================================================================"
echo ""

# Vérifier les clés
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY non définie !"
    echo ""
    echo "💡 Lancer : export SUPABASE_SERVICE_ROLE_KEY='ta_cle'"
    echo ""
    exit 1
fi

if [ -z "$HUGGINGFACE_TOKEN" ]; then
    echo "⚠️  HUGGINGFACE_TOKEN non définie !"
    echo "L'upload sur HF sera fait manuellement après."
    echo ""
    read -p "Continuer quand même ? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Variables d'environnement OK"
echo ""

# Étape 1 : Nettoyer les anciennes données
echo "🧹 Étape 1/6 : Nettoyage des anciennes données de test..."
echo "─────────────────────────────────────────────────────────────────────────────"

read -p "Nettoyer les transactions synthétiques dans Supabase ? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Nettoyage des données synthétiques..."
    # Note: Le script CLEANUP_SYNTHETIC_DATA.sql existe déjà
    echo "⚠️  Nettoyage à faire manuellement via Supabase Dashboard :"
    echo "   DELETE FROM transactions WHERE metadata->>'synthetic' = 'true';"
    echo ""
    read -p "Appuyer sur Entrée quand c'est fait..."
else
    echo "⏭️  Nettoyage ignoré"
fi
echo ""

# Étape 2 : Générer les transactions
echo "📊 Étape 2/6 : Génération de 5000 transactions synthétiques..."
echo "─────────────────────────────────────────────────────────────────────────────"
python3 generate_synthetic_transactions.py
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la génération"
    exit 1
fi
echo ""

# Étape 3 : Entraîner le modèle
echo "🤖 Étape 3/6 : Entraînement du modèle (17 features - sans fraud_score ni status)..."
echo "─────────────────────────────────────────────────────────────────────────────"
python3 train_independent_model.py
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'entraînement"
    exit 1
fi
echo ""

# Vérifier que les fichiers ont été générés
if [ ! -f "fraud_model_independent.pkl" ]; then
    echo "❌ fraud_model_independent.pkl n'a pas été généré !"
    exit 1
fi

echo "✅ Modèle entraîné avec succès !"
echo ""

# Étape 4 : Vérifier les features importantes
echo "📊 Étape 4/6 : Vérification des features importantes..."
echo "─────────────────────────────────────────────────────────────────────────────"
python3 << 'EOF'
import pickle
with open('fraud_model_independent.pkl', 'rb') as f:
    model = pickle.load(f)

if hasattr(model, 'feature_importances_'):
    feature_names = [
        'amount', 'hour', 'day_of_week', 'execution_delay', 'transaction_type',
        'direction', 'country', 'city', 'provider', 'os_name',
        'type_old', 'user_avg_amount', 'user_std_amount', 'user_tx_count',
        'user_fraud_ratio', 'amount_deviation', 'device_tx_count'
    ]
    
    importance = model.feature_importances_
    feature_importance = sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True)
    
    print("\n🏆 Top 5 Features Importantes :")
    for i, (feat, imp) in enumerate(feature_importance[:5], 1):
        print(f"  {i}. {feat:25s}: {imp*100:5.2f}%")
    
    # Vérifier que status et fraud_score ne sont PAS là
    if 'status' in feature_names or 'fraud_score' in feature_names:
        print("\n❌ ERREUR : status ou fraud_score présent dans les features !")
        exit(1)
    
    # Vérifier qu'aucune feature ne domine trop
    if feature_importance[0][1] > 0.5:
        print(f"\n⚠️  WARNING : {feature_importance[0][0]} domine à {feature_importance[0][1]*100:.1f}% !")
        print("   Le modèle risque de ne pas être équilibré.")
    else:
        print("\n✅ Features équilibrées - Aucune ne domine")
else:
    print("⚠️  Impossible de vérifier les features importantes")
EOF

if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Problème détecté avec le modèle !"
    read -p "Continuer quand même ? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Étape 5 : Upload sur Hugging Face
echo "📤 Étape 5/6 : Upload sur Hugging Face..."
echo "─────────────────────────────────────────────────────────────────────────────"

if [ -z "$HUGGINGFACE_TOKEN" ]; then
    echo "⚠️  HUGGINGFACE_TOKEN non défini - Upload manuel requis"
    echo ""
    echo "📁 Fichiers à uploader :"
    echo "   - fraud_model_independent.pkl"
    echo "   - scaler_independent.pkl"
    echo "   - label_encoders_independent.pkl"
    echo "   - model_metadata_independent.json"
    echo ""
    echo "🔗 URL : https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched"
    echo ""
    read -p "Appuyer sur Entrée quand l'upload est terminé..."
else
    python3 upload_to_huggingface.py
    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors de l'upload"
        exit 1
    fi
fi
echo ""

# Étape 6 : Instructions finales
echo "🔧 Étape 6/6 : Mise à jour de l'Edge Function..."
echo "─────────────────────────────────────────────────────────────────────────────"
echo ""
echo "📝 Actions à faire manuellement :"
echo ""
echo "1️⃣  Mettre à jour index.ts (buildMLFeatures)"
echo "   Retirer la ligne :"
echo "   encodeStatus(features.status),  // ← SUPPRIMER"
echo ""
echo "   Passer de 18 à 17 features"
echo ""
echo "2️⃣  Mettre à jour les logs dans index.ts :"
echo "   '18 features' → '17 features'"
echo "   '(SANS fraud_score)' → '(SANS fraud_score ni status)'"
echo ""
echo "3️⃣  Redéployer :"
echo "   cd /Users/quent/Documents/PGD\\ 5/epicoin-app"
echo "   npx supabase functions deploy fraud-detection --no-verify-jwt"
echo ""
echo "4️⃣  Tester :"
echo "   - Faire une transaction dans l'app"
echo "   - Vérifier les logs : npx supabase functions logs fraud-detection --tail"
echo "   - Le ML score doit VARIER (pas toujours 0.0002)"
echo ""

echo "================================================================================"
echo "✅ ENTRAÎNEMENT TERMINÉ !"
echo "================================================================================"
echo ""
echo "📊 Résumé :"
echo "   - Modèle : XGBoost avec 17 features"
echo "   - Features retirées : fraud_score (circulaire) + status (data leakage)"
echo "   - Fichiers générés : fraud_model_independent.pkl + 3 autres"
echo ""
echo "🎯 Prochaines étapes :"
echo "   1. Mettre à jour index.ts (17 features)"
echo "   2. Redéployer l'Edge Function"
echo "   3. Tester avec transactions réelles"
echo ""
echo "📁 Guide détaillé : CORRECTION_STATUS_LEAKAGE.md"
echo ""
