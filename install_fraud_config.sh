#!/bin/bash

# Script d'installation de la configuration dynamique du système de fraude
# Date: 26 janvier 2026

set -e  # Arrêter en cas d'erreur

echo "=========================================="
echo "Installation Configuration Fraude"
echo "=========================================="
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour afficher un message de succès
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Fonction pour afficher un avertissement
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Fonction pour afficher une erreur
error() {
    echo -e "${RED}✗${NC} $1"
}

# Vérifier que nous sommes dans le bon dossier
if [ ! -f "package.json" ]; then
    error "Erreur: package.json introuvable. Assurez-vous d'être dans le dossier racine du projet."
    exit 1
fi

echo "Étape 1: Installation des dépendances NPM"
echo "----------------------------------------"
if npm install; then
    success "Dépendances installées avec succès"
else
    error "Échec de l'installation des dépendances"
    exit 1
fi
echo ""

echo "Étape 2: Vérification de Supabase CLI"
echo "----------------------------------------"
if ! command -v supabase &> /dev/null; then
    warning "Supabase CLI n'est pas installé"
    echo "Pour l'installer: https://supabase.com/docs/guides/cli"
    echo "Vous devrez appliquer la migration manuellement"
    SKIP_MIGRATION=true
else
    success "Supabase CLI détecté"
    SKIP_MIGRATION=false
fi
echo ""

if [ "$SKIP_MIGRATION" = false ]; then
    echo "Étape 3: Application de la migration"
    echo "----------------------------------------"
    echo "Cette étape va créer la table fraud_config et les fonctions associées"
    read -p "Voulez-vous appliquer la migration maintenant? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        if supabase db push; then
            success "Migration appliquée avec succès"
        else
            error "Échec de l'application de la migration"
            echo "Vous pouvez l'appliquer manuellement plus tard avec:"
            echo "  supabase db push"
            echo "  ou"
            echo "  psql -f supabase/migrations/20260126000003_fraud_config.sql"
        fi
    else
        warning "Migration ignorée. N'oubliez pas de l'appliquer manuellement!"
    fi
    echo ""
    
    echo "Étape 4: Redéploiement de la fonction Edge"
    echo "----------------------------------------"
    read -p "Voulez-vous redéployer la fonction fraud-detection? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        if supabase functions deploy fraud-detection; then
            success "Fonction fraud-detection redéployée avec succès"
        else
            error "Échec du redéploiement de la fonction"
            echo "Vous pouvez la redéployer manuellement plus tard avec:"
            echo "  supabase functions deploy fraud-detection"
        fi
    else
        warning "Redéploiement ignoré. N'oubliez pas de le faire manuellement!"
    fi
    echo ""
else
    echo "Étape 3 & 4: Migration et redéploiement"
    echo "----------------------------------------"
    warning "Étapes ignorées car Supabase CLI n'est pas installé"
    echo ""
    echo "Pour appliquer la migration manuellement:"
    echo "  1. Connectez-vous à votre base de données"
    echo "  2. Exécutez: psql -f supabase/migrations/20260126000003_fraud_config.sql"
    echo ""
    echo "Pour redéployer la fonction:"
    echo "  1. Installez Supabase CLI: https://supabase.com/docs/guides/cli"
    echo "  2. Exécutez: supabase functions deploy fraud-detection"
    echo ""
fi

echo "=========================================="
echo "Résumé de l'installation"
echo "=========================================="
echo ""
success "Dépendances NPM installées"

if [ "$SKIP_MIGRATION" = false ]; then
    echo -e "${GREEN}✓${NC} Migration et fonction configurées"
else
    warning "Migration et fonction à configurer manuellement"
fi

echo ""
echo "Nouveaux fichiers créés:"
echo "  - supabase/migrations/20260126000003_fraud_config.sql"
echo "  - app/admin/fraud-config.tsx"
echo "  - GUIDE_CONFIGURATION_FRAUDE.md"
echo "  - CHANGEMENTS_CONFIGURATION_FRAUDE.md"
echo ""
echo "Fichiers modifiés:"
echo "  - supabase/functions/fraud-detection/index.ts"
echo "  - app/admin/index.tsx"
echo "  - app/(tabs)/index.tsx"
echo "  - package.json"
echo ""
echo "=========================================="
echo "Prochaines étapes"
echo "=========================================="
echo ""
echo "1. Testez l'interface de configuration:"
echo "   - Connectez-vous en tant qu'admin"
echo "   - Accédez au menu Administration > Configuration fraude"
echo ""
echo "2. Vérifiez que les paramètres sont appliqués:"
echo "   - Créez une transaction de test"
echo "   - Consultez les logs: supabase functions logs fraud-detection"
echo ""
echo "3. Consultez la documentation:"
echo "   - Guide: GUIDE_CONFIGURATION_FRAUDE.md"
echo "   - Changements: CHANGEMENTS_CONFIGURATION_FRAUDE.md"
echo ""
echo "=========================================="
echo "Installation terminée!"
echo "=========================================="
