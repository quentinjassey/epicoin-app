# 🚀 Démarrage Rapide - Tests Inter-Wallet

Guide pour tester les transactions entre différents systèmes de wallet en **moins de 10 minutes**.

## 🎯 Objectif

Tester les transactions entre votre application EpiPay et d'autres wallets externes (indépendants), sans avoir besoin de déployer l'app mobile sur plusieurs appareils.

---

## ⚡ Démarrage en 5 Étapes

### 1️⃣ Déployer les Edge Functions (2 min)

```bash
# Se connecter à Supabase
npx supabase login

# Lier votre projet (si pas déjà fait)
npx supabase link

# Déployer les fonctions
npx supabase functions deploy intercampus-send
npx supabase functions deploy intercampus-receive
```

✅ **Vérification :** Vos APIs sont maintenant accessibles à :
```
https://YOUR_PROJECT.supabase.co/functions/v1/intercampus-send
https://YOUR_PROJECT.supabase.co/functions/v1/intercampus-receive
```

---

### 2️⃣ Créer des Wallets de Test (2 min)

1. Allez sur [Supabase Dashboard](https://app.supabase.com) → Votre projet → **SQL Editor**
2. Exécutez le fichier : `supabase/test-data/create_test_wallets.sql`
3. **IMPORTANT** : Copiez les API Keys affichées dans les NOTICES :

```
NOTICE: API Key pour wallet_paris_test: epw_AbCd1234EfGh5678...
NOTICE: API Key pour wallet_lyon_test: epw_XyZ9876WqRs5432...
```

⚠️ **Sauvegardez ces clés** - elles ne seront plus accessibles après !

---

### 3️⃣ Obtenir un JWT Token Utilisateur (1 min)

**Option A : Via votre app mobile**

1. Lancez l'app : `npx expo start`
2. Connectez-vous avec un compte
3. Dans le code, récupérez le token :
   ```typescript
   const { data } = await supabase.auth.getSession();
   console.log('JWT:', data.session?.access_token);
   ```

**Option B : Via API**

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

Copiez le `access_token` retourné.

---

### 4️⃣ Configurer les Tests (1 min)

```bash
# Copier le fichier d'exemple
cp tests/.env.test.example tests/.env.test

# Éditer avec vos valeurs
nano tests/.env.test  # ou votre éditeur préféré
```

Remplissez :
```bash
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
USER_JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
WALLET_API_KEY=epw_votre_cle_api_generee
```

---

### 5️⃣ Lancer les Tests (1 min)

```bash
# Installer les dépendances Python si nécessaire
pip3 install requests

# Lancer tous les tests
./tests/quick_test.sh
```

**Résultat attendu :**
```
🧪 TESTS INTER-WALLET EPIPAY
==============================

TEST 1 : Envoi depuis EpiPay (Wallet A → Wallet B)
✅ SUCCÈS - Transaction complétée
   Transaction ID: tx_abc123...
   Score fraude:   15/100

TEST 2 : Réception sur EpiPay (Externe → Wallet A)
✅ SUCCÈS - Paiement reçu et crédité
   Transaction ID: tx_xyz789...
   Score fraude:   12/100

📊 RÉSUMÉ DES TESTS
✅ Test 1 (Envoi) : SUCCÈS
✅ Test 2 (Réception) : SUCCÈS
```

---

## 🎉 C'est Tout !

Vous venez de tester avec succès :
- ✅ Envoi d'argent depuis EpiPay vers un wallet externe
- ✅ Réception d'argent depuis un wallet externe vers EpiPay
- ✅ Détection de fraude fonctionnelle
- ✅ API publiques accessibles

---

## 🔄 Tester avec de Vrais Wallets Externes

Maintenant que vos APIs sont déployées et testées, vous pouvez :

### Option 1 : Partager l'API avec d'autres développeurs

Donnez-leur :
- L'URL de votre endpoint : `https://YOUR_PROJECT.supabase.co/functions/v1/intercampus-receive`
- Une API Key générée : `epw_...`
- La documentation : `API_INTERCAMPUS_DOCUMENTATION.md`

Ils peuvent alors envoyer de l'argent vers votre système depuis leur propre wallet !

### Option 2 : Créer une App Wallet Simplifiée

Exemple d'app minimaliste en React Native/Expo qui utilise votre API :

```typescript
// SimpleWallet.tsx
import { useState } from 'react';
import { Button, TextInput } from 'react-native';

export default function SimpleWallet() {
  const [amount, setAmount] = useState('');
  
  const sendToEpiPay = async () => {
    const response = await fetch(
      'https://YOUR_PROJECT.supabase.co/functions/v1/intercampus-send',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_JWT',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_wallet_id: 'wallet_external',
          destination_wallet_id: 'wallet_paris_test',
          destination_campus_api_url: 'https://YOUR_PROJECT.supabase.co/functions/v1',
          amount: parseFloat(amount),
          currency: 'EPC'
        })
      }
    );
    
    const result = await response.json();
    alert(result.success ? 'Envoyé !' : 'Erreur');
  };
  
  return (
    <>
      <TextInput 
        placeholder="Montant" 
        value={amount}
        onChangeText={setAmount}
      />
      <Button title="Envoyer vers EpiPay" onPress={sendToEpiPay} />
    </>
  );
}
```

### Option 3 : Intégration avec des Systèmes Existants

Si vous avez déjà d'autres applications (web, mobile, desktop), intégrez simplement les appels API :

```python
# Python
import requests

def send_to_epipay(amount):
    response = requests.post(
        'https://YOUR_PROJECT.supabase.co/functions/v1/intercampus-receive',
        json={
            'transaction_id': generate_uuid(),
            'source_wallet_id': 'my_external_wallet',
            'destination_wallet_id': 'wallet_paris_test',
            'amount': amount,
            'currency': 'EPC',
            'api_key': 'epw_your_api_key',
            # ...
        }
    )
    return response.json()
```

---

## 📊 Vérifier les Transactions

### Via Supabase Dashboard

1. Table Editor → `transactions`
2. Filtrer : `transaction_type = 'INTERCAMPUS'`
3. Voir : statut, montant, score de fraude, etc.

### Via SQL

```sql
-- Transactions récentes
SELECT 
  id,
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

-- Soldes des wallets
SELECT id, campus_name, balance
FROM wallets
WHERE id LIKE 'wallet_%_test';
```

---

## 🐛 Problèmes Fréquents

### "Unauthorized" ou "Invalid API Key"

```sql
-- Régénérer l'API Key
DO $$
DECLARE
  v_key TEXT;
  v_hash TEXT;
BEGIN
  v_key := generate_wallet_api_key();
  v_hash := encode(digest(v_key, 'sha256'), 'hex');
  UPDATE wallets SET api_key_hash = v_hash WHERE id = 'wallet_paris_test';
  RAISE NOTICE 'Nouvelle clé: %', v_key;
END $$;
```

### "Insufficient Balance"

```sql
-- Ajouter des fonds
UPDATE wallets 
SET balance = balance + 1000 
WHERE id = 'wallet_paris_test';
```

### Transaction Bloquée (fraude)

```sql
-- Voir le détail
SELECT fraud_score, fraud_features, status 
FROM transactions 
WHERE id = 'tx_id';

-- Approuver manuellement si légitime
UPDATE transactions 
SET status = 'completed' 
WHERE id = 'tx_id';
```

---

## 📚 Documentation Complète

- **[Tests Inter-Wallet détaillés](tests/README_INTERCAMPUS_TESTS.md)** - Guide complet de tests
- **[API Documentation](API_INTERCAMPUS_DOCUMENTATION.md)** - Specs complètes de l'API
- **[Fraud Detection](README_FRAUD_DETECTION.md)** - Système de détection de fraude
- **[Architecture](docs/ARCHITECTURE_DECISION.md)** - Décisions d'architecture

---

## 🎯 Prochaines Étapes

Maintenant que votre système inter-wallet fonctionne :

1. **Créer des wallets pour chaque campus** Epitech
2. **Partager les API Keys** avec les responsables de chaque campus
3. **Tester en conditions réelles** avec plusieurs utilisateurs
4. **Monitorer les transactions** via le dashboard admin
5. **Ajuster les seuils de fraude** selon les résultats

---

## 💡 Cas d'Usage

Votre système permet maintenant de :

- 💸 **Transférer de l'argent** entre différents campus Epitech
- 🌍 **Intégrer d'autres wallets** (ex: wallet d'une autre école)
- 🔄 **Créer un réseau** de wallets interopérables
- 🛡️ **Détecter les fraudes** automatiquement sur toutes les transactions
- 📊 **Suivre les flux** d'argent entre systèmes

**Exemple concret :**
> Un étudiant de Paris peut envoyer de l'argent à un étudiant de Lyon, qui utilise un wallet Lyon complètement indépendant, déployé sur un autre serveur. Les deux systèmes communiquent via les APIs intercampus.

---

**🎉 Félicitations !** Votre système de wallet inter-opérable est opérationnel.

**Besoin d'aide ?** Consultez la documentation complète ou contactez quentin1.jassey@epitech.digital

---

**Dernière mise à jour :** 27 janvier 2026
