#!/bin/bash

echo "🧹 Nettoyage du cache Expo..."
rm -rf .expo/
rm -rf node_modules/.cache/

echo "✨ Cache nettoyé !"
echo ""
echo "🚀 Pour redémarrer proprement :"
echo "   1. Arrêter le serveur actuel (Ctrl+C)"
echo "   2. Lancer : npx expo start --clear"
echo ""
echo "📊 Résultat attendu :"
echo "   ✅ Plus de warnings admin routes"
echo "   ✅ Logs propres (< 50 lignes)"
echo "   ✅ Seulement quelques warnings SecureStore (normaux)"

