# 🔧 Solution Finale pour l'Erreur JWT

## 🎯 Problème

Malgré l'application des migrations, l'erreur persiste :
```
Fraud detection failed: {"code":401,"message":"Invalid JWT"}
```

## 💡 Cause identifiée

**Les Edge Functions utilisent encore l'ancienne configuration !**

Même si les migrations SQL sont appliquées, les Edge Functions déployées sur Deno Deploy ne sont pas automatiquement mises à jour. Elles doivent être **redéployées**.

## ✅ Solution en 3 étapes

### Étape 1 : Vérifier que les migrations sont appliquées

Exécutez dans le SQL Editor de Supabase :

```sql
-- Vérifier que le RLS est désactivé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'fraud_config';
-- Doit retourner: rowsecurity = false

-- Vérifier qu'il n'y a plus de politiques
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'fraud_config';
-- Doit retourner: 0 lignes

-- Tester la fonction
SELECT * FROM public.get_fraud_config();
-- Doit retourner: 1 ligne avec ml_weight, heuristic_weight, etc.
```

Si tout est OK ✅, passez à l'étape 2.

Si ça échoue ❌, réappliquez manuellement :

```sql
ALTER TABLE public.fraud_config DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service_role and admins to read fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can view fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can update fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can insert fraud config" ON public.fraud_config;
```

### Étape 2 : Vérifier les variables d'environnement

Dans le Dashboard Supabase (https://supabase.com/dashboard) :

1. Allez dans **Project Settings** → **API**
2. Notez votre `service_role` key (section "Project API keys")
3. Allez dans **Edge Functions** (menu latéral)
4. Cliquez sur **Settings** ou **Configuration**
5. Vérifiez que ces secrets sont définis :
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` 
   - ✅ `SUPABASE_ANON_KEY`

**Si une variable manque**, ajoutez-la :
- Nom : `SUPABASE_SERVICE_ROLE_KEY`
- Valeur : Votre service_role key (copiée à l'étape 2.2)

### Étape 3 : Redéployer les Edge Functions

**Option A : Via le CLI (recommandé)**

```bash
# Assurez-vous d'être dans le dossier du projet
cd "/Users/quent/Documents/PGD 5/epicoin-app"

# Redéployer fraud-detection
supabase functions deploy fraud-detection

# Redéployer confirm-payment
supabase functions deploy confirm-payment

# Vérifier le statut
supabase functions list
```

**Option B : Via le Dashboard**

Si le CLI ne fonctionne pas :

1. Allez dans **Edge Functions**
2. Cliquez sur **fraud-detection**
3. Cliquez sur le bouton **Deploy** ou **Redeploy**
4. Répétez pour **confirm-payment**

**Option C : Supprimer et recréer (si A et B échouent)**

```bash
# Supprimer les fonctions existantes
supabase functions delete fraud-detection
supabase functions delete confirm-payment

# Les redéployer
supabase functions deploy fraud-detection
supabase functions deploy confirm-payment
```

## 🧪 Test après redéploiement

### Test 1 : Via le script de diagnostic

```bash
./test_fraud_detection.sh
```

Résultat attendu :
```
✅ La fonction fonctionne correctement !
   Risk Score: [un nombre entre 0 et 100]
   Decision: approve
```

### Test 2 : Via l'application

1. Ouvrez l'app mobile
2. Allez dans **Wallet** → **Recharger**
3. Sélectionnez un montant (ex: 5€)
4. Complétez le paiement avec une carte de test Stripe :
   - Numéro : `4242 4242 4242 4242`
   - Date : n'importe quelle date future
   - CVV : `123`
5. Vérifiez que le rechargement fonctionne sans erreur

### Test 3 : Vérifier les logs

Dans le Dashboard Supabase :

1. Allez dans **Edge Functions** → **fraud-detection** → **Logs**
2. Cherchez les logs récents
3. Vérifiez qu'il n'y a plus d'erreur "Invalid JWT"

Logs attendus :
```
[Fraud Detection Enhanced] Analyzing transaction: {...}
[Fraud Config] Using dynamic config: {...}
[Fraud Detection Enhanced] Risk score: XX Decision: approve
```

## 🔍 Si l'erreur persiste

### Diagnostic approfondi

Exécutez chaque vérification :

**1. Vérifier que les secrets sont bien chargés dans fraud-detection**

Ajoutez temporairement ce log au début de `fraud-detection/index.ts` (ligne 124) :

```typescript
console.log("[Debug] Environment check:", {
  hasUrl: !!Deno.env.get("SUPABASE_URL"),
  hasKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  keyPrefix: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 20)
});
```

Redéployez et vérifiez les logs.

**2. Tester manuellement avec curl**

```bash
# Remplacez YOUR_PROJECT_URL et YOUR_SERVICE_ROLE_KEY
curl -X POST \
  "https://YOUR_PROJECT_URL.supabase.co/functions/v1/fraud-detection" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction": {
      "userId": "test",
      "amount": 100,
      "type": "topup"
    }
  }'
```

**3. Vérifier la version déployée**

Dans le Dashboard :
- Edge Functions → fraud-detection → Deployments
- Vérifiez que le dernier déploiement est récent (après avoir appliqué les migrations)

**4. Vérifier les logs de confirm-payment**

Le problème pourrait aussi venir de `confirm-payment` :
- Edge Functions → confirm-payment → Logs
- Cherchez comment la requête à fraud-detection est faite

## 🚨 Solution de dernier recours

Si rien ne fonctionne, désactivez temporairement la vérification RLS dans `get_fraud_config()` :

```sql
-- Recréer la fonction avec un accès plus permissif
CREATE OR REPLACE FUNCTION public.get_fraud_config() 
RETURNS TABLE (
    ml_weight decimal,
    heuristic_weight decimal,
    threshold_approve integer,
    threshold_review integer
) AS $$ 
BEGIN 
  RETURN QUERY
  SELECT 
    fc.ml_weight,
    fc.heuristic_weight,
    fc.threshold_approve,
    fc.threshold_review
  FROM public.fraud_config fc
  ORDER BY fc.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder l'accès à tous (temporaire pour test)
GRANT SELECT ON public.fraud_config TO authenticated, anon, service_role;
```

Puis testez à nouveau.

## 📋 Checklist finale

- [ ] Migrations SQL vérifiées (RLS désactivé sur fraud_config)
- [ ] Variables d'environnement configurées dans Edge Functions
- [ ] Edge Functions fraud-detection redéployée
- [ ] Edge Function confirm-payment redéployée
- [ ] Test avec test_fraud_detection.sh réussi
- [ ] Test de rechargement dans l'app réussi
- [ ] Logs ne montrent plus d'erreur JWT

## 💡 Explication technique

### Pourquoi redéployer ?

Les Edge Functions sont déployées sur Deno Deploy (infrastructure séparée de votre base Supabase). Quand vous :
1. Modifiez le code localement
2. Appliquez des migrations SQL
3. Changez les variables d'environnement

**Ces changements ne sont PAS automatiquement reflétés dans les fonctions déjà déployées.**

Vous devez explicitement redéployer pour :
- Charger le nouveau code
- Recharger les variables d'environnement
- Reconnecter aux nouvelles configurations SQL

### Ordre d'exécution

```
Client (App) 
  → confirm-payment (Edge Function déployée) 
    → fraud-detection (Edge Function déployée)
      → get_fraud_config() (RPC SQL)
        → fraud_config (Table SQL avec RLS)
```

Si le RLS est activé sur `fraud_config` et que `fraud-detection` n'a pas la bonne `SERVICE_ROLE_KEY`, l'erreur JWT se produit.

---

**Date** : 29 janvier 2026  
**Dernière mise à jour** : Après diagnostic approfondi
