# EpiPay — Portefeuille digital Epitech

Application mobile de paiement inter-campus avec détection de fraude intégrée, développée pour le projet **CEMSI / PGD 5** (Epitech Digital).

**Démo en ligne (Appetize) :** https://appetize.io/app/b_pgglfc4h4jbof2suqq7mihy2hy
**Présentation du projet :** [`docs/presentation/Presentation-Epipay.pdf`](docs/presentation/Presentation-Epipay.pdf)

---

## Stack

- **Front** : Expo SDK 54 · React Native 0.81 · Expo Router v6 · TypeScript
- **Back** : Supabase (Frankfurt · UE) — Auth, PostgreSQL, Edge Functions Deno, Realtime
- **Paiements** : Stripe (`@stripe/stripe-react-native`)
- **Animations** : react-native-reanimated v4
- **Icônes** : MaterialIcons via wrapper `components/Icon.tsx`

## Fonctionnalités clés

- Authentification biométrique (Face ID / Touch ID)
- Rechargement Stripe
- Transferts P2P intra-campus
- Transferts **inter-campus** via protocole JSON fédéré (campus partenaires : Jordan, Toscan)
- Boutique campus (produits, catégories, achat)
- Détection de fraude (règles + scoring IA léger, alertes admin)
- Accessibilité complète (4 modes daltonisme, contraste, texte agrandi, reduce motion)
- RGPD (consentement, export JSON, suppression de compte, DPO dédié)
- Panel admin (fraude, métriques, produits, utilisateurs)

## Structure du projet

```
app/              Routes Expo Router (wallet, history, shop, profile, admin, modales)
components/       Composants réutilisables (Icon, GlitchIn, NotifBanner, FraudAlert…)
constants/        Thème & palette (NativeColors, Colors)
lib/              Clients & contextes (supabase, AccessibilityContext, NotificationContext…)
supabase/         Migrations SQL + Edge Functions (federated-lookup, intercampus-*, fraud-scoring)
assets/           Images, fonts, icônes
docs/             Documentation (voir ci-dessous)
scripts/          Scripts de dev/deploy utiles
sql/              Seed products, migrations manuelles
tests/            Tests manuels / scripts de QA
fraud-ml-api/     Service Python ML (HuggingFace) — optionnel
```

## Documentation

```
docs/
├── presentation/      Livrables de soutenance (HTML + PDF, CSV projections)
├── architecture/      Décisions d'architecture, plan de migration, API inter-campus, Swagger
├── compliance/        RGPD, contrat de conformité, cadre réglementaire
├── testing/           Protocole de tests utilisateurs, résultats, questionnaire
└── archive/           Notes de dev historiques (fraud, ML, setup HuggingFace…)
```

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env
# puis renseigner les clés Supabase + Stripe

# 3. Lancer le dev server
npm start          # ou npx expo start
npx expo start --ios   # simulateur iOS
```

## Variables d'environnement

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_APP_NAME=EpiCoin
```

## Design system — *Epitech Brutalist Light*

- Couleurs : bleu `#013AFB`, vert néon `#00ff97`, magenta `#ff1ef7`, orange `#ff5a3a`
- Fond blanc, texte noir, zéro border-radius, bordures 2-3 px noires, ombres dures sans blur
- Typo uppercase, letter-spacing marqué, fontWeight 700–900
- Voir `constants/NativeColors.ts` et `CLAUDE.md` pour le détail

## Contact & conformité

- **DPO** : dpo@epipay.epitech.digital
- **Hébergement** : Supabase Frankfurt (UE)
- **Conformité** : RGPD, traçabilité opérations, explicabilité alertes IA, décision humaine obligatoire
