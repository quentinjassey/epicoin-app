# Guide de Test - Système de Détection de Fraude

## 📋 Prérequis

1. **Variables d'environnement** configurées :
   ```bash
   export SUPABASE_URL="https://srvkyiugewdjrpvcmquq.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="<votre_clé>"
   ```

2. **Deno installé** (pour exécuter le script de test) :
   ```bash
   # macOS
   brew install deno
   
   # Ou via curl
   curl -fsSL https://deno.land/install.sh | sh
   ```

3. **Au moins un utilisateur** dans la base de données (créé via l'app)

---

## 🧪 Exécution des Tests

### Option 1: Script Automatisé (Recommandé)

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# Exécuter le script de test
deno run --allow-net --allow-env test-fraud-system.ts
```

**Résultat attendu :**
```
============================================================
🧪 Test du Système de Détection de Fraude - Epicoin
============================================================

ℹ Utilisateur de test trouvé: user@epitech.eu

▶ Test: Scénario 1: Transaction Normale
  Petit montant, utilisateur établi → devrait être approuvée
✓ SUCCÈS - Décision: approve, Score: 15
  Raisons:
    • Aucune raison majeure

▶ Test: Scénario 2: Transaction Suspecte Modérée
  Montant moyen-élevé → devrait être en revue manuelle
✓ SUCCÈS - Décision: review, Score: 55
  Raisons:
    • Montant inhabituellement élevé (800 EPC vs moyenne 50 EPC)
    • Premier transfert vers ce destinataire

[...]

============================================================
✓ TOUS LES TESTS RÉUSSIS (5/5)
============================================================
```

### Option 2: Tests Manuels via Supabase SQL Editor

1. **Aller dans** : Supabase Dashboard → SQL Editor

2. **Test 1 - Transaction Normale** :
   ```sql
   -- Simuler un transfert normal
   SELECT transfer_epicoin(
       'recipient@epitech.eu',  -- Email destinataire
       50,                       -- Montant
       0,                        -- Fraud score (sera calculé par la fonction)
       '{}'::jsonb              -- Fraud features
   );
   
   -- Vérifier le résultat
   SELECT * FROM transactions 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

3. **Test 2 - Transaction Suspecte** :
   ```sql
   SELECT transfer_epicoin(
       'new-user@epitech.eu',
       800,
       0,
       '{}'::jsonb
   );
   
   -- Vérifier l'alerte fraude
   SELECT * FROM fraud_alerts 
   WHERE status = 'pending'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

4. **Test 3 - Transaction Bloquée** :
   ```sql
   SELECT transfer_epicoin(
       'new-user@epitech.eu',
       5000,
       0,
       '{}'::jsonb
   );
   
   -- La transaction devrait échouer avec message de fraude
   ```

### Option 3: Tests via App Mobile/Web

1. **Créer un compte** test via l'app
2. **Effectuer un top-up** de 10€ (normal - devrait passer)
3. **Effectuer un top-up** de 500€ (suspect - devrait être en revue)
4. **Vérifier le dashboard admin** : `/admin/fraud`

---

## 📊 Validation des Métriques

### Performance (Latence)

**Objectif :** < 300ms par transaction

```sql
-- Vérifier les logs Edge Function
SELECT 
    timestamp,
    log->'msg' as message,
    (log->'duration')::int as duration_ms
FROM edge_logs
WHERE function_name = 'fraud-detection'
AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 10;
```

### Précision (Recall/Precision)

**Objectif :** Recall ≥ 85%, Precision ≥ 80%

Pour mesurer, il faut :
1. Créer un dataset de test avec labels connus (fraude/normal)
2. Exécuter la détection sur ce dataset
3. Calculer les métriques :

```typescript
// Exemple de calcul (à adapter)
const truePositives = transactions.filter(t => 
    t.is_fraud_actual && t.fraud_score > 70
).length

const falseNegatives = transactions.filter(t => 
    t.is_fraud_actual && t.fraud_score <= 70
).length

const recall = truePositives / (truePositives + falseNegatives)
```

### Explicabilité

**Objectif :** ≥ 80% compréhension utilisateur

1. Conduire tests utilisateurs (5 personnes minimum)
2. Utiliser le questionnaire : `docs/USER_TESTING_QUESTIONNAIRE.md`
3. Documenter résultats : `docs/TESTING_RESULTS.md`

---

## 🔍 Debugging

### Logs Edge Function

```bash
# Via Supabase CLI
supabase functions logs fraud-detection --tail

# Filtrer les erreurs
supabase functions logs fraud-detection | grep ERROR
```

### Vérifier la Base de Données

```sql
-- Statistiques fraude (7 derniers jours)
SELECT * FROM get_fraud_stats(7);

-- Alertes en attente
SELECT * FROM fraud_alerts_pending;

-- Transactions suspectes
SELECT 
    id,
    amount,
    type,
    fraud_score,
    fraud_features,
    status
FROM transactions
WHERE fraud_score > 30
ORDER BY created_at DESC
LIMIT 10;
```

### Tester un Scénario Spécifique

```bash
# Créer un fichier test-custom.json
cat > test-custom.json << EOF
{
  "transaction": {
    "userId": "00000000-0000-0000-0000-000000000000",
    "amount": 1500,
    "type": "transfer",
    "recipientId": "11111111-1111-1111-1111-111111111111"
  }
}
EOF

# Appeler directement l'Edge Function
curl -X POST \
  "https://srvkyiugewdjrpvcmquq.supabase.co/functions/v1/fraud-detection" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d @test-custom.json
```

---

## 📈 Benchmarking

Pour mesurer les performances du système :

```typescript
// benchmark.ts
const startTime = performance.now()

const response = await fetch(
    `${SUPABASE_URL}/functions/v1/fraud-detection`,
    {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transaction: testTx })
    }
)

const endTime = performance.now()
const latency = endTime - startTime

console.log(`Latency: ${latency.toFixed(2)}ms`)
```

**Exécuter 100 transactions** :

```bash
for i in {1..100}; do
  deno run --allow-net --allow-env benchmark.ts
  sleep 0.1
done | awk '{sum+=$2; count++} END {print "Avg Latency:", sum/count, "ms"}'
```

---

## ✅ Checklist Validation

- [ ] Tous les scénarios de test passent (5/5)
- [ ] Latence moyenne < 300ms
- [ ] Recall ≥ 85% sur dataset PaySim
- [ ] Precision ≥ 80% sur dataset PaySim
- [ ] 5 utilisateurs testés avec ≥ 80% compréhension
- [ ] Dashboard admin fonctionnel
- [ ] Alertes utilisateur claires
- [ ] Logs sans erreurs critiques
- [ ] Documentation complète

---

## 🚨 Problèmes Courants

### Erreur: "User not found"

**Cause :** Aucun utilisateur dans la base de données

**Solution :**
```sql
-- Créer un utilisateur de test manuellement
INSERT INTO auth.users (id, email)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'test@epitech.eu'
);

INSERT INTO profiles (id, email, balance, campus)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'test@epitech.eu',
    1000,
    'Paris'
);
```

### Erreur: "Fraud detection failed"

**Cause :** Edge Function non déployée ou erreur interne

**Solution :**
```bash
# Redéployer la fonction
supabase functions deploy fraud-detection

# Vérifier les logs
supabase functions logs fraud-detection --tail
```

### Score toujours 0

**Cause :** Aucune règle ne se déclenche (utilisateur trop récent, pas d'historique)

**Solution :** Créer des transactions historiques de test :
```sql
INSERT INTO transactions (sender_id, receiver_id, amount, type, status, created_at)
VALUES 
    ('user-id', 'recipient-id', 50, 'transfer', 'completed', NOW() - INTERVAL '10 days'),
    ('user-id', 'recipient-id', 75, 'transfer', 'completed', NOW() - INTERVAL '5 days'),
    ('user-id', 'recipient-id', 100, 'purchase', 'completed', NOW() - INTERVAL '2 days');
```

---

## 📚 Ressources

- **Documentation Architecture** : `docs/ARCHITECTURE_DECISION.md`
- **Compliance** : `docs/COMPLIANCE.md`
- **Migration Plan** : `docs/MIGRATION_PLAN.md`
- **Guide Principal** : `README_FRAUD_DETECTION.md`
- **Protocole Tests Utilisateurs** : `docs/USER_TESTING_PROTOCOL.md`

---

**Dernière mise à jour :** 2026-01-20

