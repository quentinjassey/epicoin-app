# 🚀 Options de Déploiement - EpiPay

**Date :** 26 janvier 2026  
**Type d'application :** React Native (Expo)  
**Status :** Guide de déploiement

---

## ⚠️ IMPORTANT : Vercel vs React Native

**EpiPay est une application mobile React Native (Expo), PAS une application web.**

| Plateforme | Compatible ? | Notes |
|------------|--------------|-------|
| **Vercel** | ⚠️ **Web uniquement** | Peut déployer la version web (`expo export:web`), mais avec fonctionnalités limitées |
| **Expo EAS** | ✅ **Recommandé** | Build iOS + Android + OTA updates |
| **App Store** | ✅ | Via EAS Build |
| **Google Play** | ✅ | Via EAS Build |

---

## 🎯 Recommandation : Expo EAS Build

**EAS (Expo Application Services)** est la solution officielle pour déployer des apps React Native.

### Avantages

✅ Build iOS et Android dans le cloud  
✅ OTA (Over-The-Air) updates automatiques  
✅ Preview builds pour testing  
✅ Gestion des certificats automatique  
✅ CI/CD intégré  

### Coût

- **Free tier** : 30 builds/mois (suffisant pour POC)
- **Production** : $29-$99/mois selon usage

---

## 📱 Option 1 : Déploiement Mobile (RECOMMANDÉ)

### Installation EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Configuration

```bash
# Initialiser EAS
eas build:configure

# Créer eas.json automatiquement
```

Fichier `eas.json` généré :

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "bundleIdentifier": "com.epitech.epipay"
      },
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Build iOS

```bash
# Preview (simulateur)
eas build --platform ios --profile preview

# Production (App Store)
eas build --platform ios --profile production
```

**Requis :** Compte Apple Developer ($99/an)

### Build Android

```bash
# Preview (APK pour test)
eas build --platform android --profile preview

# Production (AAB pour Google Play)
eas build --platform android --profile production
```

**Requis :** Compte Google Play Developer ($25 one-time)

### Déploiement

```bash
# App Store
eas submit --platform ios

# Google Play
eas submit --platform android
```

---

## 🌐 Option 2 : Version Web (Vercel)

**⚠️ Fonctionnalités limitées** : Pas de Face ID, notifications push, appareil photo, etc.

### 1. Build pour le Web

```bash
# Installer dépendances web
npx expo install react-native-web react-dom @expo/metro-runtime

# Build
npx expo export:web
```

Cela génère un dossier `dist/` avec l'app web.

### 2. Configuration Vercel

Créer `vercel.json` :

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

Ajouter dans `package.json` :

```json
{
  "scripts": {
    "vercel-build": "expo export:web"
  }
}
```

### 3. Déployer sur Vercel

```bash
# Via CLI
npm i -g vercel
vercel

# Ou via GitHub
# 1. Push sur GitHub
# 2. Connecter repo dans Vercel Dashboard
# 3. Auto-deploy à chaque push
```

**Limites de la version web :**
- ❌ Pas de biométrie (Face ID/Touch ID)
- ❌ Pas de notifications push natives
- ❌ Pas d'accès complet au système de fichiers
- ❌ Pas d'intégration appareil photo native
- ⚠️ Performances réduites vs apps natives

---

## 🔄 Option 3 : GitHub + EAS (CI/CD)

**Meilleure pratique** : Automatiser les builds via GitHub Actions.

### 1. Push sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/votre-user/epicoin-app.git
git branch -M main
git push -u origin main
```

### 2. GitHub Actions

Créer `.github/workflows/eas-build.yml` :

```yaml
name: EAS Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build on EAS
        run: eas build --platform all --non-interactive --no-wait
```

### 3. Secrets GitHub

Dans GitHub → Settings → Secrets and variables → Actions :

- `EXPO_TOKEN` : Token EAS (obtenir via `eas whoami`)

---

## 📦 Option 4 : OTA Updates (Sans rebuild)

**Over-The-Air Updates** : Mettre à jour l'app sans resubmission App Store/Play Store.

### Configuration

```bash
# Publier un update
eas update --branch production --message "Fix bug fraud detection"
```

Tous les utilisateurs reçoivent l'update au prochain lancement.

**Limites :**
- ❌ Ne fonctionne pas pour modifications natives (permissions, packages natifs)
- ✅ Fonctionne pour code JS/TS, assets

---

## 🎯 Recommandation Finale pour EpiPay

### Pour le Projet Académique (POC)

**Option recommandée :** **Expo EAS Build (Free tier)**

```bash
# Setup
npm install -g eas-cli
eas login
eas build:configure

# Build iOS + Android preview
eas build --platform all --profile preview

# Partager avec l'équipe
# Les builds sont disponibles via lien direct (pas besoin App Store)
```

**Avantages :**
- ✅ Gratuit (30 builds/mois)
- ✅ Test sur vrais devices
- ✅ Distribution facile (lien direct)
- ✅ Pas besoin Apple Developer ($99)

### Pour Production Réelle

**Stack recommandé :**

1. **Apps Natives** : Expo EAS Build → App Store + Google Play
2. **Backend** : Supabase Edge Functions (déjà déployé)
3. **ML Model** : Hugging Face (déjà déployé)
4. **Dashboard Admin** : Version web sur Vercel (optionnel)

---

## 🔐 Sécurité : Secrets à NE PAS Committer

Le `.gitignore` est configuré pour ignorer :

```
✅ .env (secrets)
✅ node_modules/
✅ ios/Pods/ (builds)
✅ android/build/ (builds)
✅ *.pkl (modèles ML)
✅ venv/ (Python)
```

**Variables sensibles** (dans `.env`, ignoré par Git) :
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Pour EAS Build**, configurer les secrets :

```bash
eas secret:create --name SUPABASE_URL --value https://...
eas secret:create --name SUPABASE_ANON_KEY --value eyJ...
eas secret:create --name STRIPE_PUBLISHABLE_KEY --value pk_test_...
```

---

## 📝 Checklist Avant Push GitHub

- [x] `.gitignore` configuré
- [x] `.env` dans `.gitignore`
- [x] `.env.example` à jour (sans vraies valeurs)
- [ ] Supprimer `/ios/Pods/` si présent localement
- [ ] Supprimer `/android/.gradle/` si présent
- [ ] README.md à jour avec instructions setup
- [ ] Documentation complète (8 docs ✅)

---

## 🚀 Commandes Rapides

### Push sur GitHub

```bash
# Premier push
git init
git add .
git commit -m "feat: Complete fraud detection system with ML"
git branch -M main
git remote add origin https://github.com/VOTRE_USER/epicoin-app.git
git push -u origin main
```

### Déployer sur EAS (Mobile)

```bash
# Setup
eas build:configure

# Build preview pour tests
eas build --platform all --profile preview

# URL de téléchargement générée automatiquement
```

### Déployer sur Vercel (Web - limité)

```bash
# Build web
npx expo export:web

# Deploy
vercel
```

---

## ❓ FAQ

### Q: Puis-je déployer sur Vercel ?
**R:** Oui, mais **uniquement la version web** avec fonctionnalités limitées. Pour une app mobile complète, utilisez **Expo EAS**.

### Q: Coût de déploiement ?
**R:** 
- EAS Free tier : **0€** (30 builds/mois)
- Vercel : **0€** (hobby)
- Apple Developer : **99€/an** (si App Store)
- Google Play : **25€** (one-time)

### Q: Combien de temps pour déployer ?
**R:**
- EAS build : ~15-30 minutes
- Vercel web : ~5 minutes
- App Store review : 1-3 jours
- Google Play review : quelques heures

### Q: GitHub privé ou public ?
**R:** **Privé recommandé** car :
- ❌ Contient configuration Supabase
- ❌ Peut révéler architecture système
- ✅ `.env` déjà ignoré mais prudence

---

## 📞 Support

**Documentation Expo :** https://docs.expo.dev/  
**EAS Build :** https://docs.expo.dev/build/introduction/  
**Vercel Expo :** https://vercel.com/guides/deploying-expo-with-vercel

---

**Document créé le :** 26 janvier 2026  
**Auteur :** Quentin Jassey  
**Statut :** ✅ Prêt pour déploiement
