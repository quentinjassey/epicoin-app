#!/bin/bash

# Script pour ajouter TEMPORAIREMENT la service role key pour les tests locaux
# ⚠️ À utiliser UNIQUEMENT pour tester, puis supprimer la clé du .env

echo "🔐 Configuration de la Service Role Key pour tests locaux"
echo ""
echo "⚠️  ATTENTION : Cette clé est TRÈS puissante et contourne toutes les sécurités !"
echo "   Elle doit rester secrète et ne JAMAIS être commitée dans Git."
echo ""

# Vérifier que .env existe et est dans .gitignore
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env introuvable"
    exit 1
fi

if ! grep -q "^.env$" .gitignore 2>/dev/null; then
    echo "❌ .env n'est pas dans .gitignore ! DANGER !"
    echo "Ajoutez '.env' dans .gitignore avant de continuer."
    exit 1
fi

echo "✅ .env est bien dans .gitignore"
echo ""

# Vérifier si la clé existe déjà
if grep -q "^SUPABASE_SERVICE_ROLE_KEY=" .env 2>/dev/null; then
    echo "ℹ️  SUPABASE_SERVICE_ROLE_KEY existe déjà dans .env"
    exit 0
fi

echo "📋 Pour obtenir votre Service Role Key :"
echo "   1. Allez sur https://supabase.com/dashboard/project/srvkyiugewdjrpvcmquq/settings/api"
echo "   2. Section 'Project API keys'"
echo "   3. Copiez la clé 'service_role' (commence par 'eyJ...')"
echo ""
read -p "Collez votre Service Role Key ici : " SERVICE_KEY

if [ -z "$SERVICE_KEY" ]; then
    echo "❌ Aucune clé fournie"
    exit 1
fi

# Vérifier que la clé ressemble à un JWT
if [[ ! "$SERVICE_KEY" =~ ^eyJ ]]; then
    echo "❌ La clé ne ressemble pas à un JWT valide (devrait commencer par 'eyJ')"
    exit 1
fi

# Ajouter la clé au .env
echo "" >> .env
echo "# Service Role Key - ⚠️ POUR TESTS LOCAUX UNIQUEMENT - SUPPRIMER APRÈS TEST" >> .env
echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY" >> .env

echo ""
echo "✅ Service Role Key ajoutée au .env"
echo ""
echo "🧪 Vous pouvez maintenant tester avec :"
echo "   ./test_fraud_detection.sh"
echo ""
echo "⚠️  IMPORTANT : Après vos tests, SUPPRIMEZ cette ligne du .env :"
echo "   sed -i '' '/SUPABASE_SERVICE_ROLE_KEY/d' .env"
echo ""
