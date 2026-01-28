# 🧪 Tests Inter-Wallet (Inter-Campus)

Guide complet pour tester les transactions entre différents systèmes de wallet indépendants.

## 📋 Prérequis

1. ✅ Edge Functions déployées sur Supabase
2. ✅ Wallets de test créés en base de données
3. ✅ API Keys générées pour les wallets
4. ✅ Un utilisateur authentifié (JWT token)

---

## 🚀 Étape 1 : Déployer les Edge Functions

```bash
# Se connecter à Supabase
npx supabase login

# Lier votre projet
npx supabase link

# Déployer les fonctions
npx supabase functions deploy intercampus-send
npx supabase functions deploy intercampus-receive

# Vérifier les déploiements
npx supabase functions list
```

Vos endpoints seront accessibles à :
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/intercampus-send
https://YOUR_PROJECT_ID.supabase.co/functions/v1/intercampus-receive
```

---

## 🗄️ Étape 2 : Créer des Wallets de Test

### Via SQL Editor (Supabase Dashboard)

1. Allez sur https://app.supabase.com → Votre projet → SQL Editor
2. Exécutez le script : `supabase/test-data/create_test_wallets.sql`
3. **IMPORTANT** : Copiez les API Keys affichées dans les notifications

Exemple de sortie :
```
NOTICE: API Key pour wallet_paris_test: epw_AbCd1234EfGh5678...
NOTICE: API Key pour wallet_lyon_test: epw_XyZ9876WqRs5432...
```

⚠️ **Les API Keys ne seront plus accessibles après** - sauvegardez-les !

### Ou via Commande

```bash
# Créer les wallets
npx supabase db exec --file supabase/test-data/create_test_wallets.sql

# Vérifier
npx supabase db query "SELECT id, campus_name, balance FROM wallets WHERE id LIKE 'wallet_%_test'"
```

---

## 🔐 Étape 3 : Obtenir un JWT Token Utilisateur

### Méthode 1 : Via l'App Mobile

1. Lancez votre app : `npx expo start`
2. Connectez-vous avec un utilisateur
3. Dans le code, loguez le token :
   ```typescript
   import { supabase } from '@/lib/supabase';
   
   const { data } = await supabase.auth.getSession();
   console.log('JWT Token:', data.session?.access_token);
   ```

### Méthode 2 : Via API (cURL)

```bash
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "your_password"
  }'
```

Sauvegardez le `access_token` retourné.

---

## 🧪 Étape 4 : Lancer les Tests

### Test 1 : Envoyer depuis EpiPay (Wallet A → Wallet B)

Ce script simule votre app EpiPay qui envoie de l'argent vers un wallet externe.

```bash
# Configurer les variables d'environnement
export EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export USER_JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Lancer le test
python3 tests/test_intercampus_wallet_a.py
```

**Résultat attendu :**
```
🚀 TEST TRANSACTION INTER-CAMPUS
====================================================
📤 Source:      Epitech Paris (wallet_paris_test)
📥 Destination: lyon (wallet_lyon_test)
💰 Montant:     50.0 EPC
====================================================

⏳ Envoi de la requête...
📡 Status Code: 200

📄 RÉPONSE :
{
  "success": true,
  "status": "completed",
  "transaction_id": "tx_abc123...",
  "fraud_score": 15,
  "new_balance": 950.00
}

✅ SUCCÈS - Transaction complétée
```

---

### Test 2 : Recevoir sur EpiPay (Wallet Externe → EpiPay)

Ce script simule un wallet externe indépendant qui envoie de l'argent vers votre système EpiPay.

```bash
# Configurer les variables
export EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export WALLET_API_KEY="epw_votre_cle_api_generee"

# Lancer le test
node tests/test_intercampus_wallet_b.js
```

**Résultat attendu :**
```
🔄 TEST RÉCEPTION INTER-CAMPUS (Wallet Externe → EpiPay)
====================================================
📤 Source externe:  external_campus
📥 Destination:     wallet_paris_test
💰 Montant:         75.0 EPC
====================================================

⏳ Envoi de la requête...
📡 Status Code: 200

📄 RÉPONSE :
{
  "success": true,
  "status": "completed",
  "transaction_id": "tx_xyz789...",
  "fraud_score": 12,
  "amount": 75.00
}

✅ SUCCÈS - Paiement reçu et crédité
```

---

## 📊 Étape 5 : Vérifier les Résultats

### Via SQL

```sql
-- Voir les transactions inter-campus récentes
SELECT 
  id,
  transaction_type,
  direction,
  amount,
  status,
  fraud_score,
  source_wallet_id,
  destination_wallet_id,
  created_at
FROM transactions
WHERE transaction_type = 'INTERCAMPUS'
ORDER BY created_at DESC
LIMIT 10;

-- Vérifier les soldes des wallets
SELECT id, campus_name, balance
FROM wallets
WHERE id LIKE 'wallet_%_test';
```

### Via Dashboard Supabase

1. Allez dans **Table Editor** → `transactions`
2. Filtrez par `transaction_type = 'INTERCAMPUS'`
3. Vérifiez les colonnes :
   - `status` (completed/pending_review/blocked)
   - `fraud_score` (0-100)
   - `amount`
   - `direction` (incoming/outgoing)

---

## 🐛 Dépannage

### Problème : "Unauthorized" ou "Invalid API Key"

**Cause :** API Key incorrecte ou wallet inexistant.

**Solution :**
```sql
-- Vérifier le wallet et régénérer l'API Key
SELECT id, campus_id, 
       CASE WHEN api_key_hash IS NOT NULL THEN 'API Key définie' ELSE 'Pas d''API Key' END 
FROM wallets 
WHERE id = 'wallet_paris_test';

-- Régénérer si nécessaire
DO $$
DECLARE
  v_api_key TEXT;
  v_hash TEXT;
BEGIN
  v_api_key := generate_wallet_api_key();
  v_hash := encode(digest(v_api_key, 'sha256'), 'hex');
  
  UPDATE wallets SET api_key_hash = v_hash WHERE id = 'wallet_paris_test';
  
  RAISE NOTICE 'Nouvelle API Key: %', v_api_key;
END $$;
```

---

### Problème : "Insufficient Balance"

**Cause :** Le wallet source n'a pas assez de fonds.

**Solution :**
```sql
-- Ajouter des fonds au wallet
UPDATE wallets 
SET balance = balance + 1000.00 
WHERE id = 'wallet_paris_test';
```

---

### Problème : Transaction bloquée (fraud_score élevé)

**Cause :** La détection de fraude a identifié des patterns suspects.

**Solution :**
1. Vérifiez le score et les features :
   ```sql
   SELECT id, fraud_score, fraud_features, status
   FROM transactions
   WHERE id = 'tx_id_problematique';
   ```

2. Ajustez les seuils de fraude (si nécessaire) :
   ```sql
   UPDATE fraud_config
   SET block_threshold = 80  -- Au lieu de 70
   WHERE id = 'your_config_id';
   ```

3. Approuvez manuellement la transaction :
   ```sql
   UPDATE transactions
   SET status = 'completed'
   WHERE id = 'tx_id_problematique';
   ```

---

### Problème : Timeout ou "Destination Unreachable"

**Cause :** Le campus destinataire ne répond pas.

**Solution :**
- Vérifiez que les Edge Functions sont déployées
- Testez l'endpoint directement :
  ```bash
  curl https://YOUR_PROJECT.supabase.co/functions/v1/intercampus-receive \
    -H "Content-Type: application/json" \
    -d '{"test": true}'
  ```

---

## 📈 Tests Avancés

### Test de Charge

```python
# tests/load_test_intercampus.py
import concurrent.futures
import requests

def send_transaction(i):
    # Votre code d'envoi ici
    pass

# Envoyer 100 transactions en parallèle
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(send_transaction, range(100)))

success_count = sum(1 for r in results if r.get('success'))
print(f"Succès: {success_count}/100")
```

### Test de Détection de Fraude

```python
# Tester avec des patterns frauduleux
fraudulent_patterns = [
    {'amount': 10000, 'expected': 'blocked'},  # Montant élevé
    {'amount': 10, 'frequency': 20, 'expected': 'review'},  # Haute fréquence
    {'amount': 5000, 'new_device': True, 'expected': 'review'},  # Nouvel appareil
]

for pattern in fraudulent_patterns:
    result = send_transaction(**pattern)
    assert result['status'] == pattern['expected']
```

---

## 📚 Documentation Complémentaire

- [API Inter-Campus Documentation](../API_INTERCAMPUS_DOCUMENTATION.md) - Specs complètes de l'API
- [Fraud Detection](../README_FRAUD_DETECTION.md) - Système de détection de fraude
- [Architecture](../docs/ARCHITECTURE_DECISION.md) - Décisions d'architecture

---

## ✅ Checklist de Test

Avant de considérer le système prêt pour la production :

- [ ] Edge Functions déployées et accessibles
- [ ] Wallets de test créés avec API Keys
- [ ] Test d'envoi (Wallet A → Wallet B) : **SUCCÈS**
- [ ] Test de réception (Externe → EpiPay) : **SUCCÈS**
- [ ] Test avec solde insuffisant : **REJETÉ correctement**
- [ ] Test avec API Key invalide : **REJETÉ correctement**
- [ ] Test de détection de fraude : **Scores calculés**
- [ ] Vérification des logs Supabase : **OK**
- [ ] Vérification des transactions en BDD : **OK**
- [ ] Test de rollback (échec destination) : **Balance restaurée**
- [ ] Documentation mise à jour : **OK**

---

**Dernière mise à jour :** 27 janvier 2026  
**Maintenu par :** Quentin Jassey
