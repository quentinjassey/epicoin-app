#!/bin/bash
# Script de test rapide pour transactions inter-wallet
# Usage: ./quick_test.sh

set -e

echo "🧪 TESTS INTER-WALLET EPIPAY"
echo "=============================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier si les variables d'environnement sont définies
if [ -f "tests/.env.test" ]; then
    echo "✅ Chargement de la configuration depuis .env.test"
    export $(cat tests/.env.test | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}⚠️  Fichier .env.test non trouvé${NC}"
    echo "   Copiez tests/.env.test.example vers tests/.env.test"
    echo "   et remplissez les valeurs."
    exit 1
fi

# Vérifier les dépendances
echo ""
echo "🔍 Vérification des dépendances..."

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 n'est pas installé${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi

if ! python3 -c "import requests" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Module Python 'requests' non trouvé${NC}"
    echo "   Installation : pip3 install requests"
    read -p "   Installer maintenant? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        pip3 install requests
    else
        exit 1
    fi
fi

echo -e "${GREEN}✅ Toutes les dépendances sont installées${NC}"

# Test 1 : Envoi depuis EpiPay
echo ""
echo "=============================="
echo "TEST 1 : Envoi depuis EpiPay (Wallet A → Wallet B)"
echo "=============================="
python3 tests/test_intercampus_wallet_a.py
TEST1_EXIT=$?

# Pause entre les tests
sleep 2

# Test 2 : Réception sur EpiPay
echo ""
echo "=============================="
echo "TEST 2 : Réception sur EpiPay (Externe → Wallet A)"
echo "=============================="
node tests/test_intercampus_wallet_b.js
TEST2_EXIT=$?

# Résumé
echo ""
echo "=============================="
echo "📊 RÉSUMÉ DES TESTS"
echo "=============================="

if [ $TEST1_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Test 1 (Envoi) : SUCCÈS${NC}"
else
    echo -e "${RED}❌ Test 1 (Envoi) : ÉCHEC${NC}"
fi

if [ $TEST2_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Test 2 (Réception) : SUCCÈS${NC}"
else
    echo -e "${RED}❌ Test 2 (Réception) : ÉCHEC${NC}"
fi

echo ""
echo "💡 Pour voir les transactions en base :"
echo "   SELECT * FROM transactions WHERE transaction_type = 'INTERCAMPUS' ORDER BY created_at DESC LIMIT 5;"
echo ""
echo "📚 Documentation complète : tests/README_INTERCAMPUS_TESTS.md"
echo ""

# Exit code
if [ $TEST1_EXIT -eq 0 ] && [ $TEST2_EXIT -eq 0 ]; then
    exit 0
else
    exit 1
fi
