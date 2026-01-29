# Vérification des variables d'environnement des Edge Functions

## 🔍 Problème

L'erreur `Invalid JWT` persiste malgré l'application des migrations. Cela suggère que le problème pourrait venir de la configuration des Edge Functions.

## 🎯 Causes possibles

### 1. Variables d'environnement manquantes ou incorrectes

Les Edge Functions `confirm-payment` et `fraud-detection` nécessitent ces variables :

```bash
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Edge Functions non redéployées

Après avoir modifié le code ou appliqué les migrations, les Edge Functions doivent être redéployées.

## ✅ Actions de diagnostic

### Étape 1 : Vérifier les variables d'environnement

Dans le Dashboard Supabase :

1. Allez dans **Edge Functions** → **Configuration**
2. Vérifiez que ces variables sont définies :
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`

### Étape 2 : Exécuter le diagnostic SQL

```bash
# Copiez le contenu de diagnostic_jwt.sql
# Exécutez-le dans le SQL Editor de Supabase
```

Vérifications importantes :
- [ ] Le RLS est désactivé sur `fraud_config`
- [ ] Aucune politique RLS sur `fraud_config`
- [ ] La table `fraud_config` contient des données
- [ ] La fonction `get_fraud_config()` fonctionne

### Étape 3 : Tester directement fraud-detection

```bash
./test_fraud_detection.sh
```

Ce script teste directement la fonction `fraud-detection` avec la service role key.

### Étape 4 : Vérifier les logs des Edge Functions

Dans le Dashboard Supabase :

1. Allez dans **Edge Functions** → **fraud-detection** → **Logs**
2. Cherchez les erreurs récentes
3. Identifiez la ligne exacte qui cause l'erreur JWT

## 🔧 Solutions

### Solution 1 : Redéployer les Edge Functions

Si le diagnostic SQL est OK mais l'erreur persiste :

```bash
# Redéployer confirm-payment
supabase functions deploy confirm-payment

# Redéployer fraud-detection
supabase functions deploy fraud-detection
```

### Solution 2 : Configurer les variables d'environnement

Si les variables manquent dans les Edge Functions :

```bash
# Définir SUPABASE_URL
supabase secrets set SUPABASE_URL=https://votre-projet.supabase.co

# Définir SUPABASE_SERVICE_ROLE_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key

# Définir SUPABASE_ANON_KEY
supabase secrets set SUPABASE_ANON_KEY=votre_anon_key
```

Puis redéployez les fonctions.

### Solution 3 : Via le Dashboard (si le CLI ne fonctionne pas)

1. Allez dans **Edge Functions** → **Configuration**
2. Ajoutez/modifiez les secrets :
   - Nom : `SUPABASE_SERVICE_ROLE_KEY`
   - Valeur : Votre service role key (trouvable dans Settings → API)
3. Redéployez manuellement via le dashboard

## 🔍 Diagnostic avancé

### Vérifier que la service role key est correcte

Dans le SQL Editor :

```sql
-- Cette requête ne devrait PAS échouer avec la service role key
SELECT * FROM public.fraud_config;
```

Si elle échoue :
- La service role key est incorrecte
- Les permissions sont mal configurées

### Tester l'accès RPC avec service role

```sql
-- Tester directement get_fraud_config
SELECT * FROM public.get_fraud_config();
```

### Vérifier les permissions de la fonction

```sql
SELECT 
    proname,
    prosecdef as "Security Definer"
FROM pg_proc 
WHERE proname = 'get_fraud_config';
```

Résultat attendu : `Security Definer = true`

## 📊 Checklist de résolution

- [ ] Migrations SQL appliquées (vérifiées avec diagnostic_jwt.sql)
- [ ] RLS désactivé sur fraud_config
- [ ] Variables d'environnement configurées dans les Edge Functions
- [ ] Edge Functions redéployées
- [ ] Test manuel de fraud-detection réussi
- [ ] Logs des Edge Functions ne montrent plus d'erreur JWT
- [ ] Test de rechargement Stripe réussi

## 🆘 Si le problème persiste

### Cause probable : Conflit entre anciennes et nouvelles migrations

Si vous avez appliqué `20260129110657_fix_fraud_config_rls.sql` puis `20260129110812_disable_fraud_config_rls.sql`, il est possible qu'il y ait un conflit.

**Solution** : Réappliquer manuellement la migration finale

Dans le SQL Editor :

```sql
-- Forcer la désactivation du RLS
ALTER TABLE public.fraud_config DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les politiques
DROP POLICY IF EXISTS "Allow service_role and admins to read fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can view fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can update fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can insert fraud config" ON public.fraud_config;

-- Vérifier que c'est bien désactivé
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'fraud_config';
```

Puis redéployez les Edge Functions.

## 📝 Notes

### Pourquoi redéployer les Edge Functions ?

Les Edge Functions sont déployées sur Deno Deploy. Même si vous modifiez le code localement ou appliquez des migrations, les fonctions déployées ne sont pas automatiquement mises à jour. Vous devez les redéployer manuellement.

### Ordre des opérations

1. Appliquer les migrations SQL
2. Vérifier avec diagnostic_jwt.sql
3. Configurer les variables d'environnement
4. Redéployer les Edge Functions
5. Tester

---

**Date** : 29 janvier 2026
