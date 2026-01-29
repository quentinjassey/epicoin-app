#!/bin/bash

# Script pour appliquer les migrations de correction du système de fraude
# Ce script corrige le problème JWT lors du top-up avec Stripe

echo "🔧 Application des migrations de correction du système de fraude..."
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier si le CLI Supabase est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Le CLI Supabase n'est pas installé.${NC}"
    echo "Installez-le avec: brew install supabase/tap/supabase"
    exit 1
fi

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ Fichier supabase/config.toml introuvable.${NC}"
    echo "Assurez-vous d'être dans le répertoire racine du projet."
    exit 1
fi

echo -e "${YELLOW}📋 Migrations à appliquer :${NC}"
echo "  1. 20260129110657_fix_fraud_config_rls.sql - Ajout de politique pour service_role"
echo "  2. 20260129110812_disable_fraud_config_rls.sql - Désactivation complète du RLS"
echo ""

# Demander confirmation
read -p "Voulez-vous appliquer ces migrations ? (o/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo -e "${YELLOW}⚠️  Opération annulée.${NC}"
    exit 0
fi

# Vérifier si Supabase est linké
if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Projet Supabase non linké. Tentative de link...${NC}"
    supabase link
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Impossible de linker le projet Supabase.${NC}"
        exit 1
    fi
fi

# Appliquer les migrations
echo ""
echo -e "${YELLOW}📤 Application des migrations...${NC}"
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Migrations appliquées avec succès !${NC}"
    echo ""
    echo -e "${GREEN}🎉 Le problème JWT lors du top-up est maintenant corrigé.${NC}"
    echo ""
    echo "Vous pouvez maintenant tester le rechargement avec Stripe."
else
    echo ""
    echo -e "${RED}❌ Erreur lors de l'application des migrations.${NC}"
    echo ""
    echo "Solutions alternatives :"
    echo "  1. Allez sur le dashboard Supabase : https://supabase.com/dashboard"
    echo "  2. Ouvrez le SQL Editor"
    echo "  3. Exécutez le contenu de : supabase/migrations/20260129110812_disable_fraud_config_rls.sql"
    exit 1
fi
