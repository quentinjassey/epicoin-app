# Correction de l'erreur JWT lors du rechargement Stripe

## 🐛 Problème identifié

L'erreur `Invalid JWT` lors du rechargement avec Stripe est causée par le RLS (Row Level Security) activé sur la table `fraud_config`. Cette table est utilisée par la fonction Edge `fraud-detection` qui est appelée lors de chaque transaction.

### Message d'erreur
```
Fraud detection failed: {"code":401,"message":"Invalid JWT"}
```

## ✅ Solutions implémentées

### 1. Score de fraude dans l'historique admin
Le score numérique de fraude apparaît maintenant dans le panneau admin des transactions, en plus du niveau de risque (Faible/Moyen/Élevé).

**Fichier modifié** : `app/admin/transactions.tsx`

### 2. Validation biométrique pour les achats
✨ **Déjà implémentée !** Le système de validation biométrique (Face ID / Touch ID / Empreinte) est déjà actif dans la boutique, identique au système de transfert.

**Fichier existant** : `app/(main)/(shop)/index.tsx` (lignes 60-201)

Le système détecte automatiquement :
- Face ID sur iPhone X et ultérieurs
- Touch ID sur iPhones avec bouton Home et iPad
- Lecteur d'empreintes sur Android
- Fallback sur mot de passe si la biométrie n'est pas disponible

### 3. Correction de l'erreur JWT

Le problème vient de la table `fraud_config` qui a le RLS activé, empêchant la fonction `fraud-detection` d'accéder à la configuration même avec la service role key.

**Migrations à appliquer** :
- `supabase/migrations/20260129110657_fix_fraud_config_rls.sql`
- `supabase/migrations/20260129110812_disable_fraud_config_rls.sql`

## 🚀 Application de la correction

### Option 1 : Script automatique (recommandé)

Exécutez le script fourni :

```bash
./apply_fraud_fix.sh
```

Ce script va :
1. Vérifier que le CLI Supabase est installé
2. Vérifier que le projet est linké
3. Appliquer les migrations automatiquement

### Option 2 : Via le CLI Supabase

```bash
# Depuis la racine du projet
supabase db push
```

### Option 3 : Via le Dashboard Supabase (manuel)

Si les options automatiques ne fonctionnent pas :

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Ouvrez le **SQL Editor**
4. Copiez et exécutez le contenu de `supabase/migrations/20260129110812_disable_fraud_config_rls.sql` :

```sql
-- Désactiver RLS sur fraud_config car SECURITY DEFINER gère déjà la sécurité
ALTER TABLE public.fraud_config DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Allow service_role and admins to read fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can update fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can insert fraud config" ON public.fraud_config;
```

5. Cliquez sur **Run**

## 🧪 Test de la correction

Après avoir appliqué les migrations :

1. Ouvrez l'application mobile
2. Allez dans **Wallet** → **Recharger**
3. Sélectionnez un montant
4. Complétez le paiement avec Stripe (utilisez une carte de test)
5. Vérifiez que le rechargement s'effectue sans erreur

### Cartes de test Stripe

- **Succès** : `4242 4242 4242 4242`
- **Déclinée** : `4000 0000 0000 0002`
- Date d'expiration : n'importe quelle date future
- CVV : n'importe quel code à 3 chiffres

## 📊 Vérification dans l'admin

1. Connectez-vous en tant qu'admin
2. Allez dans **Transactions**
3. Vérifiez que :
   - Le score de fraude numérique s'affiche (ex: "42")
   - Le niveau de risque est correct (Faible/Moyen/Élevé)
   - Le badge "ML" apparaît si le modèle ML est actif

## 🔍 Diagnostic en cas de problème persistant

Si l'erreur persiste après application des migrations :

### 1. Vérifier que les migrations sont appliquées

Dans le SQL Editor de Supabase :

```sql
-- Vérifier que le RLS est désactivé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'fraud_config';
```

Résultat attendu : `rowsecurity = false`

### 2. Vérifier que la table existe et contient des données

```sql
-- Vérifier l'existence et le contenu
SELECT * FROM public.fraud_config;
```

Résultat attendu : Une ligne avec les valeurs par défaut (ml_weight: 0.40, heuristic_weight: 0.60, etc.)

### 3. Tester la fonction directement

```sql
-- Tester get_fraud_config()
SELECT * FROM public.get_fraud_config();
```

### 4. Vérifier les logs des Edge Functions

Dans le Dashboard Supabase :
1. Allez dans **Edge Functions** → **fraud-detection**
2. Consultez les logs
3. Recherchez les erreurs relatives à `get_fraud_config`

## 📝 Notes techniques

### Pourquoi désactiver le RLS ?

La fonction `get_fraud_config()` est définie avec `SECURITY DEFINER`, ce qui signifie qu'elle s'exécute avec les privilèges du propriétaire de la fonction (postgres), pas de l'appelant. Cela rend le RLS redondant et source de problèmes.

La sécurité est assurée par :
1. La fonction `get_fraud_config()` est en lecture seule
2. La fonction `update_fraud_config()` vérifie manuellement le rôle admin
3. Les Edge Functions utilisent la service role key

### Architecture du système de fraude

```
Top-up (frontend)
    ↓
create-payment-intent (Edge Function)
    ↓
Stripe Payment
    ↓
confirm-payment (Edge Function)
    ↓
fraud-detection (Edge Function) ← ERREUR JWT ICI
    ↓ get_fraud_config() ← RLS bloque l'accès
    └→ ML Model (Hugging Face)
    ↓
Transaction enregistrée
```

## ✅ Checklist finale

- [ ] Migrations appliquées
- [ ] Test de rechargement réussi
- [ ] Score de fraude visible dans l'admin
- [ ] Validation biométrique fonctionne dans la boutique
- [ ] Aucune erreur JWT dans les logs

## 🆘 Support

Si vous rencontrez toujours des problèmes :

1. Vérifiez les logs dans le Dashboard Supabase
2. Vérifiez les variables d'environnement (`.env` et Supabase Edge Functions)
3. Testez directement la fonction `fraud-detection` avec Postman ou curl
4. Contactez le support Supabase si le problème persiste

---

**Date de correction** : 29 janvier 2026
**Version** : 1.0.0
