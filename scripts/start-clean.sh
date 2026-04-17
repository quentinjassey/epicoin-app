#!/bin/bash
# Nettoyer les variables d'environnement problématiques
unset CI
unset FORCE_COLOR
unset NO_COLOR

# Démarrer Expo
npx expo start --clear
