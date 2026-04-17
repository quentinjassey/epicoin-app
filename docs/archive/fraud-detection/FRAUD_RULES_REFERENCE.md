# 📋 Règles Métier - Détection de Fraude EpiPay

**Version :** 2.0  
**Dernière mise à jour :** 26 janvier 2026  
**Fichier source :** `supabase/functions/fraud-detection/index.ts`

---

## 🎯 Seuils de Décision

```typescript
const RISK_THRESHOLDS = {
    LOW: 30,      // 0-30: Approve automatiquement
    MEDIUM: 70,   // 31-70: Revue manuelle (pending_review)
    HIGH: 71      // 71-100: Bloquer automatiquement (blocked)
}
```

### Décision Finale

| Score de Risque | Décision | Action Système |
|-----------------|----------|----------------|
| 0-30 | `approve` | Transaction approuvée automatiquement |
| 31-70 | `review` | Transaction en attente de validation admin |
| 71-100 | `block` | Transaction bloquée, remboursement initié |

---

## ⚖️ Poids des Features (13 Catégories)

```typescript
const FEATURE_WEIGHTS = {
    // Montant et fréquence
    amount_high: 0.18,          // Montant très élevé
    amount_unusual: 0.15,       // Montant inhabituel pour l'utilisateur
    frequency_high: 0.15,       // Trop de transactions en peu de temps
    
    // Comportement utilisateur
    new_recipient: 0.10,        // Premier transfert vers ce destinataire
    balance_ratio: 0.08,        // Transaction représente gros % du solde
    
    // Géographique
    country_high_risk: 0.12,    // Pays à haut risque
    location_changed: 0.08,     // Changement de pays récent
    multiple_locations: 0.06,   // Multiple pays en peu de temps
    
    // Device
    device_changed: 0.10,       // Changement d'appareil récent
    multiple_devices: 0.05,     // Multiple appareils utilisés
    
    // Temporel
    time_unusual: 0.08,         // Transaction à heure inhabituelle
    velocity_high: 0.07,        // Vélocité élevée
    
    // Provider
    provider_suspicious: 0.05,  // Provider suspect
    failed_attempts: 0.05       // Tentatives échouées récentes
}
```

---

## 🔍 13 Règles Heuristiques Détaillées

### 1. Montant Élevé

**Poids :** 18% (FEATURE_WEIGHTS.amount_high)  
**Points attribués :**
- **Montant > seuil HIGH :** +25 points
- **Montant > seuil MEDIUM :** +15 points

**Seuils par type de transaction :**

| Type Transaction | Seuil MEDIUM | Seuil HIGH |
|------------------|--------------|------------|
| CASHIN (top-up) | 500 EPC | 1000 EPC |
| P2P (transfert) | 500 EPC | 1000 EPC |
| MERCHANT (achat) | 300 EPC | 700 EPC |
| INTERCAMPUS | 1000 EPC | 2000 EPC |

**Code source :**
```typescript
// Ligne 203-226
if (transaction.amount > amountThresholds.high) {
    riskScore += 25
    reasons.push({
        factor: 'amount_high',
        description: `Montant très élevé (${transaction.amount} > ${amountThresholds.high})`
    })
}
```

**Exemple :**
- Transaction de 1200 EPC (type P2P) → +25 points
- Message : "Montant très élevé (1200 > 1000 pour type P2P)"

---

### 2. Ratio Montant/Solde

**Poids :** 8% (FEATURE_WEIGHTS.balance_ratio)  
**Points :** +20 points si ratio > 80%

**Logique :**
```typescript
// Ligne 229-241
const amountToBalanceRatio = userProfile.balance > 0 
    ? transaction.amount / userProfile.balance 
    : 1

if (amountToBalanceRatio > 0.8) {
    riskScore += 20
}
```

**Exemple :**
- Solde : 100 EPC, Transaction : 85 EPC → Ratio 85% → +20 points
- Message : "Montant représente 85% du solde"

---

### 3. Fréquence des Transactions (Velocity)

**Poids :** 15% (FEATURE_WEIGHTS.frequency_high)  
**Points attribués :**
- **>20 transactions en 24h :** +20 points
- **>10 transactions en 24h :** +10 points

**Code source :**
```typescript
// Ligne 244-267
const last24h = recentTransactions.filter(tx => 
    new Date(tx.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
)

if (last24h.length > 20) {
    riskScore += 20
}
```

**Exemple :**
- 25 transactions en 24h → +20 points
- Message : "25 transactions en 24h (vélocité élevée)"

---

### 4. Pays à Haut Risque

**Poids :** 12% (FEATURE_WEIGHTS.country_high_risk)  
**Points :** +15 points

**Liste des pays :**
```typescript
// Ligne 46
const HIGH_RISK_COUNTRIES = ['XX', 'YY', 'ZZ']
```

**Logique :**
```typescript
// Ligne 274-284
if (HIGH_RISK_COUNTRIES.includes(transaction.country)) {
    riskScore += 15
}
```

**Exemple :**
- Transaction depuis 'XX' → +15 points
- Message : "Transaction depuis un pays à haut risque (XX)"

---

### 5. Changement de Pays Récent

**Poids :** 8% (FEATURE_WEIGHTS.location_changed)  
**Points :** +12 points si changement en moins de 6h

**Logique :**
```typescript
// Ligne 287-303
const lastCountry = recentTransactions?.find(tx => tx.country)?.country
const hoursSince = (Date.now() - new Date(lastTxTime).getTime()) / (1000 * 60 * 60)

if (lastCountry && lastCountry !== transaction.country && hoursSince < 6) {
    riskScore += 12
}
```

**Exemple :**
- Transaction en FR à 14h, puis en US à 16h → +12 points
- Message : "Changement de pays récent (FR → US en 2.0h)"

---

### 6. Multiple Localisations

**Poids :** 6% (FEATURE_WEIGHTS.multiple_locations)  
**Points :** +10 points si >3 pays en 7 jours

**Logique :**
```typescript
// Ligne 306-323
const uniqueCountries = new Set(
    recentTransactions
        .filter(tx => tx.created_at > lastWeek)
        .map(tx => tx.country)
)

if (uniqueCountries.size > 3) {
    riskScore += 10
}
```

**Exemple :**
- Transactions depuis FR, US, UK, DE en 7 jours → +10 points
- Message : "Transactions depuis 4 pays différents en 7 jours"

---

### 7. Changement d'Appareil Récent

**Poids :** 10% (FEATURE_WEIGHTS.device_changed)  
**Points :** +12 points si changement en moins de 24h

**Logique :**
```typescript
// Ligne 327-347
const lastDeviceId = recentTransactions?.find(tx => tx.device_info?.device_id)
const hoursSince = (Date.now() - new Date(lastDeviceTime).getTime()) / (1000 * 60 * 60)

if (lastDeviceId && lastDeviceId !== currentDeviceId && hoursSince < 24) {
    riskScore += 12
}
```

**Exemple :**
- iPhone 14 à 10h, puis Samsung à 14h → +12 points
- Message : "Changement d'appareil récent (4.0h)"

---

### 8. Multiple Devices

**Poids :** 5% (FEATURE_WEIGHTS.multiple_devices)  
**Points :** +10 points si >3 appareils en 7 jours

**Logique :**
```typescript
// Ligne 350-367
const uniqueDevices = new Set(
    recentTransactions
        .filter(tx => tx.created_at > lastWeek)
        .map(tx => tx.device_info?.device_id)
)

if (uniqueDevices.size > 3) {
    riskScore += 10
}
```

**Exemple :**
- iPhone, iPad, Samsung, PC en 7 jours → +10 points
- Message : "4 appareils différents utilisés en 7 jours"

---

### 9. Heure Inhabituelle

**Poids :** 8% (FEATURE_WEIGHTS.time_unusual)  
**Points :** +8 points pour transaction entre 2h-6h du matin

**Logique :**
```typescript
// Ligne 371-391
const currentHour = new Date().getHours()

if (currentHour >= 2 && currentHour <= 6) {
    const nightTxCount = recentTransactions.filter(tx => {
        const hour = new Date(tx.created_at).getHours()
        return hour >= 2 && hour <= 6
    }).length
    
    if (nightTxCount < 3) {
        riskScore += 8
    }
}
```

**Exemple :**
- Transaction à 3h du matin (pas habituel) → +8 points
- Message : "Transaction à heure inhabituelle (3h)"

---

### 10. Tentatives Échouées Récentes

**Poids :** 5% (FEATURE_WEIGHTS.failed_attempts)  
**Points :** +15 points si ≥3 échecs en 24h

**Logique :**
```typescript
// Ligne 394-416
const failedOnProvider = recentTransactions.filter(tx => 
    tx.provider === transaction.provider && 
    tx.status === 'failed' &&
    tx.created_at > last24h
).length

if (failedOnProvider >= 3) {
    riskScore += 15
}
```

**Exemple :**
- 4 tentatives échouées sur Stripe en 24h → +15 points
- Message : "4 tentatives échouées récentes sur stripe"

---

### 11. Pattern Money Mule

**Poids :** 15% (custom)  
**Points :** +18 points

**Critères :**
- Direction : incoming
- >10 réceptions en 24h
- Total >5000 EPC

**Logique :**
```typescript
// Ligne 419-443
if (transaction.direction === 'incoming') {
    const incomingCount24h = last24h.filter(tx => tx.direction === 'incoming').length
    const totalAmount24h = last24h
        .filter(tx => tx.direction === 'incoming')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
    
    if (incomingCount24h > 10 && totalAmount24h > 5000) {
        riskScore += 18
    }
}
```

**Exemple :**
- 15 réceptions (7500 EPC total) en 24h → +18 points
- Message : "Pattern suspect: 15 réceptions (7500 EPC) en 24h"

---

### 12. Nouveau Destinataire (P2P uniquement)

**Poids :** 10% (FEATURE_WEIGHTS.new_recipient)  
**Points :** +10 points

**Logique :**
```typescript
// Ligne 446-463
if (transaction.recipientId && transaction.type === 'transfer') {
    const previousToRecipient = recentTransactions.filter(tx => 
        tx.receiver_id === transaction.recipientId
    ).length
    
    if (previousToRecipient === 0) {
        riskScore += 10
    }
}
```

**Exemple :**
- Premier transfert vers jean.dupont@epitech.eu → +10 points
- Message : "Premier transfert vers ce destinataire"

---

### 13. Compte Récent

**Poids :** 10% (custom)  
**Points :** +12 points si compte <7 jours

**Logique :**
```typescript
// Ligne 466-475
const userAgeDays = Math.floor(
    (Date.now() - new Date(userProfile.created_at).getTime()) / (1000 * 60 * 60 * 24)
)

if (userAgeDays < 7) {
    riskScore += 12
}
```

**Exemple :**
- Compte créé il y a 3 jours → +12 points
- Message : "Compte créé il y a 3 jours"

---

## 🤖 Intégration Machine Learning

### Score Final

```typescript
// Ligne 478-490
const mlScore = await callMLModel(mlFeatures)
riskScore = Math.round(riskScore * 0.6 + mlScore * 0.4)
```

**Formule :**
```
Score Final = (Score Heuristique × 60%) + (Score ML × 40%)
```

### 19 Features ML

Le modèle ML utilise 19 features enrichies :

1. `step` - Âge du compte en jours
2. `amount` - Montant de la transaction
3. `oldbalanceOrg` - Solde avant transaction
4. `newbalanceOrig` - Solde après transaction
5. `oldbalanceDest` - Solde destinataire avant
6. `newbalanceDest` - Solde destinataire après
7. `type_encoded` - Type transaction encodé (0-4)
8. `country_encoded` - Pays encodé (0-N)
9. `provider_encoded` - Provider encodé (0-3)
10. `hour_of_day` - Heure de la transaction (0-23)
11. `transaction_count_24h` - Nombre transactions 24h
12. `device_changed` - Appareil changé (0/1)
13. `location_changed` - Localisation changée (0/1)
14. `delta_balance_orig` - Variation solde émetteur
15. `ratio_amount_balance_orig` - Ratio montant/solde
16. `is_high_amount` - Montant élevé (0/1)
17. `user_age_days` - Âge compte utilisateur
18. `user_tx_count` - Nombre total transactions utilisateur
19. `user_avg_amount` - Montant moyen transactions

### Modèle ML

- **Type :** XGBoost (Gradient Boosting)
- **Hébergement :** Hugging Face Inference API
- **Latence :** ~230ms (cold start), ~50ms (warm)
- **Métriques :**
  - Recall : 96%
  - Precision : 100%
  - F1-Score : 98%

---

## 📊 Exemples de Scoring

### Exemple 1 : Transaction Normale

```json
{
  "amount": 25,
  "type": "P2P",
  "country": "FR",
  "device": "iPhone_12_ABC123",
  "hour": 14,
  "user_age_days": 120
}
```

**Score :**
- Aucune règle déclenchée
- Score heuristique : 0
- Score ML : ~5
- **Score Final : 2** (0×60% + 5×40%)
- **Décision : `approve`** ✅

---

### Exemple 2 : Transaction Suspecte Modérée

```json
{
  "amount": 850,
  "type": "P2P",
  "country": "FR",
  "device": "Samsung_S21_XYZ789",
  "hour": 3,
  "user_balance": 900,
  "new_recipient": true,
  "user_age_days": 5
}
```

**Score :**
- Montant élevé : +25 pts (850 > 500)
- Ratio balance : +20 pts (850/900 = 94%)
- Heure inhabituelle : +8 pts (3h)
- Nouveau destinataire : +10 pts
- Compte récent : +12 pts
- **Score heuristique : 75**
- Score ML : ~65
- **Score Final : 71** (75×60% + 65×40%)
- **Décision : `block`** 🚫

---

### Exemple 3 : Transaction Revue Manuelle

```json
{
  "amount": 600,
  "type": "P2P",
  "country": "FR",
  "device": "iPhone_14_DEF456",
  "transactions_24h": 12,
  "user_age_days": 15
}
```

**Score :**
- Montant élevé : +15 pts (600 > 500)
- Fréquence moyenne : +10 pts (12 txs)
- Nouveau destinataire : +10 pts
- **Score heuristique : 35**
- Score ML : ~40
- **Score Final : 37** (35×60% + 40×40%)
- **Décision : `review`** ⚠️

---

## 🛠️ Comment Modifier les Règles

### 1. Modifier les Seuils de Décision

**Fichier :** `supabase/functions/fraud-detection/index.ts`  
**Lignes :** 10-14

```typescript
// Pour être plus permissif
const RISK_THRESHOLDS = {
    LOW: 40,      // Au lieu de 30
    MEDIUM: 80,   // Au lieu de 70
    HIGH: 81
}
```

### 2. Ajuster les Points d'une Règle

**Exemple : Réduire la sévérité "Montant élevé"**

```typescript
// Ligne 208 - Remplacer 25 par 15
if (transaction.amount > amountThresholds.high) {
    const points = 15  // Au lieu de 25
    riskScore += points
}
```

### 3. Modifier le Ratio ML/Heuristique

**Ligne 483**

```typescript
// Pour donner plus de poids au ML
riskScore = Math.round(riskScore * 0.4 + mlScore * 0.6)  // 40% règles, 60% ML
```

### 4. Désactiver une Règle

Commenter le bloc correspondant :

```typescript
// Désactiver "Heure inhabituelle"
/*
if (currentHour >= 2 && currentHour <= 6) {
    // ...
}
*/
```

### 5. Redéployer

Après toute modification :

```bash
npx supabase functions deploy fraud-detection
```

---

## 📈 Métriques de Performance

### Latences Mesurées

| Étape | Latence |
|-------|---------|
| Récupération profil utilisateur | ~50ms |
| Récupération historique transactions | ~80ms |
| Calcul règles heuristiques | ~20ms |
| Appel ML Hugging Face (cold) | ~230ms |
| Appel ML Hugging Face (warm) | ~50ms |
| **Total (cold start)** | **~430ms** |
| **Total (warm)** | **~200ms** |

### Conformité Contrat

| Critère | Cible | Mesuré | Statut |
|---------|-------|--------|--------|
| Temps analyse fraude | <300ms | ~200ms (warm) | ✅ |
| Taux détection fraudes | ≥95% | 96% | ✅ |
| Taux faux positifs | ≤10% | ~5% | ✅ |
| Explicabilité alertes | 100% | 100% | ✅ |

---

## 🔗 Références

- **Code source :** `supabase/functions/fraud-detection/index.ts`
- **Dataset entraînement :** PaySim (Kaggle)
- **Modèle ML :** `QuentinJassey/epicoin-fraud-detection-enriched` (Hugging Face)
- **Documentation ML :** `ML_TRAINING_COMPLETE_GUIDE.md`
- **Tests E2E :** `tests/e2e-fraud-detection.md`

---

**Document maintenu par :** Quentin Jassey  
**Dernière révision :** 26 janvier 2026
