#!/bin/bash

echo "================================================================================"
echo "🧪 Lancement du Test ML (17 Features)"
echo "================================================================================"
echo ""
echo "Ce script va :"
echo "  1. Vérifier la configuration"
echo "  2. Tester le modèle sur Hugging Face"
echo "  3. Valider que les scores varient"
echo ""
echo "================================================================================"
echo ""

# Vérifier si le token HF est configuré
if [ -z "$HUGGINGFACE_TOKEN" ]; then
    echo "⚠️  HUGGINGFACE_TOKEN non configuré"
    echo ""
    echo "💡 Option 1 : Configurer maintenant"
    echo "   export HUGGINGFACE_TOKEN='hf_...'"
    echo "   ./LANCER_TEST.sh"
    echo ""
    echo "💡 Option 2 : Tester directement via l'app"
    echo "   1. Ouvre l'app"
    echo "   2. Fais une transaction (top-up, achat, ou transfert)"
    echo "   3. Vérifie les logs :"
    echo "      cd '../../../'"
    echo "      npx supabase functions logs fraud-detection --tail"
    echo ""
    echo "📖 Guide complet : TEST_MODELE_FINAL.md"
    echo ""
    exit 1
fi

echo "✅ Token HF configuré"
echo ""

# Vérifier que Python et les dépendances sont installées
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 non installé"
    exit 1
fi

echo "✅ Python 3 installé"
echo ""

# Vérifier que requests est installé
python3 -c "import requests" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "📦 Installation de requests..."
    pip3 install requests
fi

echo "✅ Dépendances installées"
echo ""

# Lancer le test
echo "🚀 Lancement du test..."
echo ""
python3 test_model_hf_live.py

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "================================================================================"
    echo "🎉 Test terminé avec succès !"
    echo "================================================================================"
    echo ""
    echo "🚀 Prochaine étape : Tester dans l'app"
    echo ""
    echo "   1. Ouvre l'app Epicoin"
    echo "   2. Fais une transaction (top-up, achat, ou transfert)"
    echo "   3. Vérifie que la transaction se passe bien"
    echo ""
    echo "📊 Pour voir les logs ML en temps réel :"
    echo "   cd '../../../'"
    echo "   npx supabase functions logs fraud-detection --tail"
    echo ""
else
    echo "================================================================================"
    echo "⚠️  Des problèmes ont été détectés"
    echo "================================================================================"
    echo ""
    echo "📖 Consulte TEST_MODELE_FINAL.md pour le dépannage"
    echo ""
    echo "🔍 Vérifications rapides :"
    echo "   1. Le modèle est-il déployé sur HF ?"
    echo "      → https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/deployments"
    echo ""
    echo "   2. Le status est-il 'Running' ?"
    echo ""
    echo "   3. Attendre 2-3 min si cold start"
    echo ""
fi
