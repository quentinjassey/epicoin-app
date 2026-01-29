#!/bin/bash

# Script pour tester la fonction fraud-detection directement
# Ce script permet de diagnostiquer l'erreur JWT

echo "🔍 Test de la fonction fraud-detection..."
echo ""

# Lire les variables d'environnement
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env introuvable"
    exit 1
fi

source .env

if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Variables EXPO_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes dans .env"
    exit 1
fi

SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL"
SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

echo "📍 URL Supabase: $SUPABASE_URL"
echo "🔑 Service Role Key: ${SERVICE_KEY:0:20}..."
echo ""

# Payload de test pour fraud-detection
TEST_PAYLOAD='{
  "transaction": {
    "userId": "test-user-id",
    "initiator_user_id": "test-user-id",
    "amount": 100,
    "type": "topup",
    "transaction_type": "CASHIN",
    "provider": "stripe",
    "currency": "EPC"
  }
}'

echo "📤 Envoi de la requête de test..."
echo ""

# Appeler fraud-detection
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/fraud-detection" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD")

# Séparer le corps de la réponse et le code HTTP
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "📊 Code HTTP: $HTTP_CODE"
echo "📄 Réponse:"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
echo ""

# Analyser la réponse
if [ "$HTTP_CODE" = "200" ]; then
    if echo "$HTTP_BODY" | grep -q '"error"'; then
        echo "⚠️  La fonction retourne une erreur:"
        echo "$HTTP_BODY" | jq '.error' 2>/dev/null || echo "$HTTP_BODY"
        
        if echo "$HTTP_BODY" | grep -q "Invalid JWT"; then
            echo ""
            echo "🐛 Erreur JWT détectée !"
            echo ""
            echo "Causes possibles:"
            echo "  1. La migration n'a pas été correctement appliquée"
            echo "  2. Le RLS est encore actif sur fraud_config"
            echo "  3. La SUPABASE_SERVICE_ROLE_KEY dans les Edge Functions est incorrecte"
            echo "  4. La fonction get_fraud_config() a été modifiée"
            echo ""
            echo "Actions à faire:"
            echo "  1. Exécutez diagnostic_jwt.sql dans le SQL Editor"
            echo "  2. Vérifiez les variables d'environnement des Edge Functions"
            echo "  3. Redéployez les Edge Functions si nécessaire"
        fi
    else
        echo "✅ La fonction fonctionne correctement !"
        echo "   Risk Score: $(echo "$HTTP_BODY" | jq '.riskScore' 2>/dev/null)"
        echo "   Decision: $(echo "$HTTP_BODY" | jq -r '.decision' 2>/dev/null)"
    fi
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ Erreur d'authentification (401)"
    echo "   La SERVICE_ROLE_KEY est peut-être incorrecte"
else
    echo "❌ Erreur HTTP $HTTP_CODE"
fi

echo ""
echo "Pour voir les logs détaillés:"
echo "  1. Allez sur https://supabase.com/dashboard"
echo "  2. Edge Functions → fraud-detection → Logs"
