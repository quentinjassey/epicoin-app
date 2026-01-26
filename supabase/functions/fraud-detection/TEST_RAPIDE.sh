#!/bin/bash

echo "================================================================================"
echo "🧪 Test Rapide du Modèle ML (17 Features)"
echo "================================================================================"
echo ""

# Demander le token si pas configuré
if [ -z "$HUGGINGFACE_TOKEN" ]; then
    echo "💡 Colle ton HUGGINGFACE_TOKEN (ou laisse vide pour skip) :"
    read -r token
    if [ -n "$token" ]; then
        export HUGGINGFACE_TOKEN="$token"
    else
        echo "⏭️  Test skippé - Token non fourni"
        exit 1
    fi
fi

echo "✅ Token configuré"
echo ""

# Lancer le test
python3 test_model_hf_live.py
