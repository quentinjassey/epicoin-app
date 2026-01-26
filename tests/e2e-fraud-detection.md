# Tests End-to-End - Détection de Fraude ML

Ce guide décrit les tests à effectuer pour vérifier que le système de détection de fraude ML est correctement intégré dans toute l'application.

## Objectifs

✅ Vérifier que le ML est appelé pour TOUS les types de transactions  
✅ Vérifier que les 19 features enrichies sont correctement collectées  
✅ Vérifier que Hugging Face répond correctement  
✅ Vérifier que les logs montrent l'activité ML  
✅ Vérifier que les données enrichies sont sauvegardées en DB

---

## Prérequis

1. **Secrets Supabase configurés:**
   ```bash
   npx supabase secrets list
   # Doit afficher:
   # - HUGGINGFACE_API_KEY
   # - HUGGINGFACE_MODEL_ID
   ```

2. **Edge Functions déployées:**
   ```bash
   npx supabase functions list
   # Doit inclure:
   # - fraud-detection
   # - confirm-payment
   ```

3. **Application mobile lancée:**
   ```bash
   npx expo start
   ```

---

## Test 1: Top-up (Rechargement Stripe)

### Procédure

1. **Suivre les logs en temps réel:**
   ```bash
   npx supabase functions logs fraud-detection --tail
   ```

2. **Dans l'application mobile:**
   - Naviguer vers "Recharger"
   - Sélectionner 10€ (50 EPC + 5 bonus)
   - Compléter le paiement Stripe (carte test: `4242 4242 4242 4242`)

3. **Vérifier les logs:**
   ```
   ✅ [Fraud Detection Enhanced] Analyzing transaction...
   ✅ [ML] Calling Hugging Face with 19 features: 19
   ✅ [ML] Hugging Face response: {"fraud_score":...}
   ✅ [Fraud Detection Enhanced] ML model active, mixed score: XX
   ```

### Critères de succès

- [ ] Logs montrent "ML model active"
- [ ] Score de fraude calculé (0-100)
- [ ] Transaction enregistrée en DB avec `fraud_score` et `fraud_features`
- [ ] Solde utilisateur mis à jour

---

## Test 2: Transfert P2P

### Procédure

1. **Suivre les logs:**
   ```bash
   npx supabase functions logs fraud-detection --tail
   ```

2. **Dans l'application mobile:**
   - Naviguer vers "Envoyer"
   - Chercher un utilisateur (ex: "test@example.com")
   - Envoyer 10 EPC
   - Confirmer avec biométrie ou mot de passe

3. **Vérifier les logs:**
   ```
   ✅ [Send] Collecting transaction context...
   ✅ [Fraud Detection Enhanced] Analyzing transaction...
   ✅ [ML] Calling Hugging Face with 19 features: 19
   ✅ [ML] Hugging Face response: {"fraud_score":...}
   ✅ [Fraud Detection Enhanced] ML model active, mixed score: XX
   ```

### Critères de succès

- [ ] Contexte collecté (device_info, location)
- [ ] ML appelé AVANT `transfer_epicoin`
- [ ] Score de fraude passé à la fonction SQL
- [ ] Transaction enregistrée avec toutes les données enrichies

---

## Test 3: Achat Produit (Shop)

### Procédure

1. **Suivre les logs:**
   ```bash
   npx supabase functions logs fraud-detection --tail
   ```

2. **Dans l'application mobile:**
   - Naviguer vers "Boutique"
   - Sélectionner un produit disponible
   - Confirmer l'achat avec biométrie ou mot de passe

3. **Vérifier les logs:**
   ```
   ✅ [Shop] Collecting transaction context...
   ✅ [Fraud Detection Enhanced] Analyzing transaction...
   ✅ [ML] Calling Hugging Face with 19 features: 19
   ✅ [ML] Hugging Face response: {"fraud_score":...}
   ✅ [Fraud Detection Enhanced] ML model active, mixed score: XX
   ```

### Critères de succès

- [ ] Contexte collecté
- [ ] ML appelé AVANT `purchase_product`
- [ ] Score de fraude passé à la fonction SQL
- [ ] Stock produit décrémenté
- [ ] Transaction enregistrée avec métadonnées produit

---

## Vérifications Base de Données

### 1. Vérifier que toutes les transactions ont fraud_score

```sql
SELECT 
  COUNT(*) as total,
  COUNT(fraud_score) as with_fraud_score,
  COUNT(fraud_features) as with_fraud_features,
  ROUND(COUNT(fraud_score)::numeric / COUNT(*)::numeric * 100, 2) as percentage_with_score
FROM transactions
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**Résultat attendu:** `percentage_with_score` proche de 100%

### 2. Vérifier que ML est actif

```sql
SELECT 
  fraud_features->>'ml_active' as ml_active,
  COUNT(*) as count,
  AVG((fraud_features->>'ml_score')::numeric) as avg_ml_score
FROM transactions
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND fraud_features IS NOT NULL
GROUP BY fraud_features->>'ml_active';
```

**Résultat attendu:** Majorité avec `ml_active = true`

### 3. Vérifier les données enrichies

```sql
SELECT 
  id,
  type,
  transaction_type,
  direction,
  country,
  city,
  provider,
  fraud_score,
  device_info->>'device_model' as device_model,
  device_info->>'os_name' as os_name,
  fraud_features->>'ml_active' as ml_active,
  fraud_features->>'ml_score' as ml_score
FROM transactions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

**Résultat attendu:** Toutes les colonnes enrichies remplies (sauf si permission GPS refusée)

---

## Test de Blocage (Transaction Suspecte)

### Procédure

1. **Créer une transaction à haut risque:**
   - Montant élevé (>1000 EPC si disponible)
   - OU multiple transactions rapides (>5 en 5 minutes)

2. **Vérifier le comportement:**
   ```
   ✅ [Fraud Detection Enhanced] Decision: blocked (score: 85)
   ```

3. **Côté utilisateur:**
   - Alerte: "Transaction Bloquée"
   - Message explicatif clair

4. **Interface Admin:**
   - Alerte visible dans `/admin/fraud`
   - Toutes les données enrichies affichées
   - Options: Approuver / Rejeter

### Critères de succès

- [ ] Transaction bloquée automatiquement
- [ ] Alerte créée en DB
- [ ] Notification utilisateur claire
- [ ] Admin peut voir toutes les informations (ML score, location, device)

---

## Résolution de Problèmes

### ML non actif (ml_active: false)

**Causes possibles:**
1. Secrets Supabase non configurés
   ```bash
   npx supabase secrets set HUGGINGFACE_API_KEY=<your_key>
   npx supabase secrets set HUGGINGFACE_MODEL_ID=QuentinJassey/epicoin-fraud-detection-enriched
   ```

2. Edge Function pas redéployée
   ```bash
   npx supabase functions deploy fraud-detection
   ```

3. Hugging Face API down ou rate limit
   - Vérifier sur https://huggingface.co/status
   - Vérifier les logs pour l'erreur exacte

### Contexte non collecté (country/city null)

**Causes possibles:**
1. Permission GPS refusée par l'utilisateur
   - Normal, l'app devrait fallback sur IP geolocation
   
2. API IP geolocation échouée
   - Vérifier la connexion internet
   - L'app devrait continuer sans ces données

### fraud_score null en DB

**Causes possibles:**
1. Frontend n'appelle pas fraud-detection
   - Vérifier que `send.tsx` et `shop.tsx` sont bien modifiés
   - Chercher "collectTransactionContext" dans le code

2. Edge Function échouée
   - Vérifier les logs: `npx supabase functions logs fraud-detection`

---

## Checklist Finale

Avant de déclarer le système opérationnel, vérifier:

- [ ] **Top-up:** ML actif, contexte collecté, score calculé
- [ ] **P2P Transfer:** ML actif, contexte collecté, score calculé
- [ ] **Purchase:** ML actif, contexte collecté, score calculé
- [ ] **DB:** Toutes les transactions ont fraud_score
- [ ] **DB:** ml_active = true pour >90% des transactions
- [ ] **Admin UI:** Toutes les données enrichies affichées
- [ ] **Admin UI:** ML scores visibles (ml_score, heuristic_score)
- [ ] **Logs:** Aucune erreur ML dans les dernières 24h
- [ ] **Performance:** Latence <500ms par transaction

---

## Métriques de Succès

| Métrique | Cible | Mesuré |
|----------|-------|--------|
| Couverture ML | 100% des transactions | ___ % |
| ML Actif | >95% | ___ % |
| Latence moyenne | <500ms | ___ ms |
| Taux d'erreur ML | <5% | ___ % |
| Données enrichies complètes | >90% | ___ % |

---

## Contacts & Ressources

- **Hugging Face Model:** https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Documentation ML:** `/Users/quent/Documents/PGD 5/epicoin-app/ML_TRAINING_COMPLETE_GUIDE.md`
