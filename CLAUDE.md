# EpiPay — Portefeuille digital Epitech

## Stack technique
- **Framework**: Expo SDK 54, React Native 0.81, Expo Router v6
- **Backend**: Supabase (Frankfurt, DE) — auth, database, edge functions, realtime
- **Paiements**: Stripe (@stripe/stripe-react-native)
- **Animations**: react-native-reanimated v4
- **Icons**: MaterialIcons via @expo/vector-icons (composant custom `Icon.tsx`)
- **Language**: TypeScript

## Architecture
```
app/
├── _layout.tsx              # Root layout, thème, auth guard, AccessibilityProvider
├── (auth)/                  # Auth screens (sign-in, sign-up, consent RGPD, privacy-policy)
├── (main)/                  # Tab navigation (custom BrutalistTabBar)
│   ├── (wallet)/            # Homepage — solde, actions rapides, transactions récentes
│   ├── (history)/           # Historique des transactions
│   ├── (shop)/              # Boutique — produits par catégorie, filtres, achat
│   └── (profile)/           # Profil, paramètres, accessibilité, RGPD, sous-pages
├── admin/                   # Panel admin — fraude, métriques, produits, users
├── send.tsx                 # Modal envoi d'EPC
├── pay.tsx                  # Modal QR code paiement
└── top-up.tsx               # Modal rechargement Stripe
```

## Design system — Epitech Brutalist Light
- **Couleurs**: Bleu `#013AFB`, vert néon `#00ff97`, magenta `#ff1ef7`, orange `#ff5a3a`
- **Fond**: blanc `#FFFFFF`, secondaire `#F2F4F8`
- **Texte**: noir `#181818`
- **Style**: borderRadius: 0, borderWidth: 2-3 noir, ombres dures (offset sans blur)
- **Typo**: uppercase, letter-spacing, fontWeight 700-900
- **Couleurs définies dans**: `constants/NativeColors.ts`
- **Thème Colors.ts**: `constants/Colors.ts`

## Composants clés
- `components/Icon.tsx` — Wrapper MaterialIcons avec mapping SF Symbols → Material Icons
- `components/GlitchIn.tsx` — Animation d'entrée glitch style DedSec/Watch Dogs (respecte reduceMotion)
- `lib/AccessibilityContext.tsx` — Contexte global accessibilité (daltonisme, taille texte, contraste, animations)
- `lib/supabase.ts` — Client Supabase avec SecureStore pour les tokens
- `lib/transactionContext.ts` — Collecte contexte (GPS, device) pour la détection de fraude

## Accessibilité
- Contexte global `AccessibilityProvider` wrappé au root
- `adaptiveColors.primary` remplace `Colors.epitechBlue` partout (24 fichiers)
- Modes daltonisme: protanopie, deutéranopie, tritanopie, achromatopsie
- Options: texte agrandi, contraste élevé, réduire animations, texte gras
- Prefs stockées en SecureStore (chiffré)

## RGPD
- Écran consentement obligatoire avant inscription (`consent.tsx`)
- Politique de confidentialité intégrée (`privacy-policy.tsx`)
- Export données JSON (`data-export.tsx`)
- Suppression de compte avec anonymisation (`delete-account.tsx`)
- DPO: dpo@epipay.epitech.digital
- Hébergement: Supabase Frankfurt (UE)

## Conventions
- Pas de SF Symbols (SymbolView) — utiliser `<Icon name="xxx" />` partout
- Pas de `Colors.epitechBlue` dans les composants — utiliser `adaptiveColors.primary`
- Pas de border-radius (tout carré, brutaliste)
- Pas d'emoji dans le code (sauf campus list dans sign-up)
- Inline styles (pas de StyleSheet.create sauf FraudAlert)
- GlitchIn wraps les sections principales de chaque page

## Scripts
- `npm start` / `npx expo start` — Dev server
- `npx expo start --ios` — Lancer sur simulateur iOS
- `seed-products.sql` — Script SQL pour insérer les produits dans Supabase

## Env vars requises (.env)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_APP_NAME=EpiCoin
```
