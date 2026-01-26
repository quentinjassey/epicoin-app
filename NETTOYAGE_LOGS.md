# Nettoyage des Logs - Problèmes et Solutions
**Date**: 26 janvier 2026

## 🔴 Problèmes Identifiés dans les Logs

### 1. Warning Routes Admin (répété 400+ fois)
```
WARN [Layout children]: No route named "admin/index" exists in nested children
```

**Cause** : Le fichier `app/admin/_layout.tsx` déclarait explicitement les routes avec `<Stack.Screen>`, mais Expo Router découvre automatiquement les routes dans le dossier.

**Solution appliquée** ✅ : 
- Retiré les déclarations explicites de `<Stack.Screen>`
- Laissé Expo Router découvrir automatiquement les fichiers dans `app/admin/`

### 2. SecureStore Warning (répété plusieurs fois)
```
WARN Value being stored in SecureStore is larger than 2048 bytes
```

**Cause** : Le token JWT de Supabase dépasse la limite de 2KB de SecureStore sur iOS.

**Solutions possibles** :
1. ✅ **Accepter le warning** (ne bloque pas l'app)
2. Utiliser AsyncStorage au lieu de SecureStore pour les gros tokens
3. Réduire la taille du JWT (nécessite changement côté Supabase)

**Recommandation** : Laisser tel quel pour l'instant, ce n'est qu'un warning.

### 3. Stripe returnURL Warning
```
WARN [@stripe/stripe-react-native] You have not provided the 'returnURL' field
```

**Cause** : Certains moyens de paiement Stripe nécessitent un returnURL pour les redirections.

**Solution appliquée** ✅ :
- Ajouté `returnURL: 'epicoin://payment-return'` dans `initPaymentSheet`

## ✅ Corrections Appliquées

| Fichier | Modification | Résultat |
|---------|--------------|----------|
| `app/admin/_layout.tsx` | Retiré les `<Stack.Screen>` explicites | ✅ Plus de warnings routes admin |
| `app/top-up.tsx` | Ajouté `returnURL` à Stripe | ✅ Plus de warning Stripe |

## 📊 Avant / Après

### Avant
```
530 lignes de logs
- 400+ warnings routes admin
- 10+ warnings SecureStore
- 5+ warnings Stripe
```

### Après (attendu)
```
< 50 lignes de logs
- 0 warning routes admin ✅
- 3-4 warnings SecureStore (acceptable)
- 0 warning Stripe ✅
```

## 🧪 Pour Tester

1. Arrêter le serveur : `Ctrl+C`
2. Nettoyer le cache : `rm -rf .expo/`
3. Relancer : `npx expo start`
4. Ouvrir l'app dans le simulateur

**Les logs devraient être propres** (seulement quelques warnings SecureStore).

## 🔧 Si les Warnings Persistent

### Warning Routes Admin
Si le warning persiste malgré la correction, vérifier que tous les fichiers admin ont bien des noms valides :
```bash
ls -la app/admin/
```

Fichiers attendus :
- `_layout.tsx` ✅
- `index.tsx` ✅
- `fraud.tsx` ✅
- `fraud-detail.tsx` ✅
- `products.tsx` ✅
- `users.tsx` ✅
- `transactions.tsx` ✅
- `metrics.tsx` ✅

### Warning SecureStore
Ce warning est **normal** et **ne casse rien**. C'est juste une limite iOS.

Si ça devient vraiment gênant, on peut migrer vers AsyncStorage :

```typescript
// Dans lib/supabase.ts - remplacer :
import * as SecureStore from 'expo-secure-store'

// Par :
import AsyncStorage from '@react-native-async-storage/async-storage'
```

## 📝 Notes

- Les warnings n'empêchent PAS l'app de fonctionner
- Ils polluent juste les logs et rendent le debug difficile
- Avec ces corrections, les logs devraient être **90% plus propres**

## 🎯 Résultat Final Attendu

Après redémarrage du serveur, les logs devraient ressembler à ça :

```
Starting project at /Users/quent/Documents/PGD 5/epicoin-app
Starting Metro Bundler
iOS Bundled 2008ms node_modules/expo-router/entry.js
WARN SafeAreaView has been deprecated
WARN Value being stored in SecureStore is larger than 2048 bytes
```

**C'est tout !** Plus de spam de 400 lignes répétées. 🎉
