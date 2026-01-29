#!/bin/bash

# Script pour redéployer les Edge Functions après correction du système de fraude
# Ce script corrige définitivement l'erreur JWT

echo "🚀 Redéploiement des Edge Functions..."
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Le CLI Supabase n'est pas installé.${NC}"
    echo "Installez-le avec: brew install supabase/tap/supabase"
    exit 1
fi

# Vérifier qu'on est dans le bon répertoire
if [ ! -d "supabase/functions" ]; then
    echo -e "${RED}❌ Dossier supabase/functions introuvable.${NC}"
    echo "Assurez-vous d'être dans le répertoire racine du projet."
    exit 1
fi

echo -e "${BLUE}📋 Fonctions à redéployer :${NC}"
echo "  1. fraud-detection - Analyse de fraude avec ML"
echo "  2. confirm-payment - Confirmation des paiements Stripe"
echo ""

# Vérifier le statut du projet
echo -e "${YELLOW}🔍 Vérification du projet Supabase...${NC}"
if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Projet non linké. Lancement de supabase link...${NC}"
    supabase link
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Impossible de linker le projet.${NC}"
        echo ""
        echo "Solutions :"
        echo "  1. Exécutez manuellement : supabase link"
        echo "  2. Ou redéployez via le Dashboard Supabase"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Projet linké${NC}"
echo ""

# Fonction pour redéployer une Edge Function
deploy_function() {
    local func_name=$1
    echo -e "${YELLOW}📤 Déploiement de ${func_name}...${NC}"
    
    supabase functions deploy "$func_name" --no-verify-jwt
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${func_name} déployée avec succès${NC}"
        return 0
    else
        echo -e "${RED}❌ Échec du déploiement de ${func_name}${NC}"
        return 1
    fi
}

# Redéployer fraud-detection
echo -e "${BLUE}═══════════════════════════════════════${NC}"
deploy_function "fraud-detection"
FRAUD_STATUS=$?
echo ""

# Redéployer confirm-payment
echo -e "${BLUE}═══════════════════════════════════════${NC}"
deploy_function "confirm-payment"
CONFIRM_STATUS=$?
echo ""

# Résumé
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Résumé du déploiement${NC}"
echo ""

if [ $FRAUD_STATUS -eq 0 ] && [ $CONFIRM_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ Toutes les fonctions ont été déployées avec succès !${NC}"
    echo ""
    echo -e "${GREEN}🎉 L'erreur JWT devrait maintenant être corrigée.${NC}"
    echo ""
    echo "Prochaines étapes :"
    echo "  1. Testez avec : ./test_fraud_detection.sh"
    echo "  2. Ou testez directement dans l'app (rechargement Stripe)"
    echo "  3. Vérifiez les logs dans le Dashboard Supabase"
    echo ""
    echo "Pour voir les logs en temps réel :"
    echo "  supabase functions logs fraud-detection --follow"
    exit 0
else
    echo -e "${RED}❌ Certaines fonctions n'ont pas été déployées${NC}"
    echo ""
    if [ $FRAUD_STATUS -ne 0 ]; then
        echo "  ❌ fraud-detection"
    else
        echo "  ✅ fraud-detection"
    fi
    
    if [ $CONFIRM_STATUS -ne 0 ]; then
        echo "  ❌ confirm-payment"
    else
        echo "  ✅ confirm-payment"
    fi
    echo ""
    echo "Solutions :"
    echo "  1. Vérifiez votre connexion internet"
    echo "  2. Vérifiez que vous êtes authentifié : supabase login"
    echo "  3. Redéployez manuellement via le Dashboard Supabase"
    echo "     https://supabase.com/dashboard → Edge Functions"
    exit 1
fi
