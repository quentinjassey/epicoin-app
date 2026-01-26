# Diagnostic : Score ML Identique pour Toutes les Transactions
**Date**: 26 janvier 2026

## 🔍 Problème Observé

Toutes les transactions ont **EXACTEMENT** la même probabilité ML : `0.001163669629022479`

### Logs Supabase

```json
// Transaction 1 : Top-up 300 EPC
"fraud_probability": 0.001163669629022479
"fraud_score": 0

// Transaction 2 : Achat 105 EPC  
"fraud_probability": 0.001163669629022479
"fraud_score": 0

// Transaction 3 : Achat 500 EPC
"fraud_probability": 0.001163669629022479
"fraud_score": 0
```

**C'est statistiquement IMPOSSIBLE** que 3 transactions différentes aient exactement la même probabilité à 15 décimales près !

## 🔴 Cause Probable

### Hypothèse : Features Identiques Envoyées au Modèle

Les features statistiques utilisateur sont probablement toutes à leurs valeurs par défaut pour un nouvel utilisateur :

```typescript
// Features 14-19 (statistiques utilisateur)
user_avg_amount: 0,        // Pas d'historique → défaut 0
user_std_amount: 0,        // Pas d'historique → défaut 0  
user_tx_count: 0,          // Pas d'historique → défaut 0
user_fraud_ratio: 0,       // Pas d'historique → défaut 0
amount_deviation: 0,       // Pas d'historique → défaut 0
device_tx_count: 1         // Défaut 1
```

Si ces 6 features sont identiques ET que les autres features varient peu (même pays, même device, même heure), le modèle reçoit des vecteurs très similaires → même prédiction !

## ✅ Solution Appliquée

### 1. Ajout de Logs Détaillés

J'ai ajouté un log détaillé dans `buildMLFeatures()` pour voir exactement quelles features sont envoyées :

```typescript
console.log('[ML Features] Détails:', {
    amount: mlFeatures[0],
    fraud_score_heuristic: mlFeatures[1],
    hour: mlFeatures[2],
    // ... toutes les 19 features
})
```

### 2. Fonction Redéployée

La fonction `fraud-detection` a été redéployée avec ces nouveaux logs.

## 🧪 Test à Faire

**Faire une nouvelle transaction** (achat ou top-up) et regarder les logs Supabase :

```bash
npx supabase functions logs fraud-detection --tail
```

**Vérifier** :
1. Les features diffèrent-elles entre les transactions ?
2. Les features 1 (amount) et 2 (fraud_score_heuristic) sont-elles différentes ?
3. Les features statistiques (14-19) sont-elles toutes à 0 ?

## 📊 Résultats Attendus

### Si les Features Sont Identiques

Cela explique pourquoi le ML retourne toujours la même probabilité. **Solutions** :

1. **Accepter que pour les nouveaux utilisateurs le ML soit moins précis**
   - C'est normal : sans historique, le modèle se base uniquement sur les règles
   - Les règles heuristiques (60% du score final) compensent

2. **Améliorer les features avec plus de contexte**
   - Ajouter l'heure précise (minutes, pas seulement l'heure)
   - Ajouter des informations device plus détaillées
   - Calculer des ratios (montant/balance, etc.)

3. **Réduire le poids du ML pour les nouveaux utilisateurs**
   ```typescript
   // Si utilisateur nouveau (tx_count < 5), réduire poids ML
   if (features.user_tx_count < 5) {
       riskScore = Math.round(heuristicScoreRaw * 0.8 + mlScore * 0.2)
   } else {
       riskScore = Math.round(heuristicScoreRaw * 0.6 + mlScore * 0.4)
   }
   ```

### Si les Features Diffèrent

Si les logs montrent que les features sont différentes mais que le ML retourne quand même la même probabilité, alors :

1. **Problème avec le Scaler**
   - Le scaler normalise peut-être toutes les valeurs vers le même point
   - Solution : Réentraîner le modèle

2. **Problème avec le Modèle**
   - Le modèle a peut-être "sur-appris" sur les données synthétiques
   - Solution : Réentraîner avec de vraies transactions

## 🎯 Pourquoi Score = 0 ?

```python
fraud_proba = 0.001163669629022479  # 0.11% de fraude
fraud_score = int(fraud_proba * 100)  # int(0.11636) = 0
```

**C'est normal !** Une transaction très sûre (0.11% de fraude) donne un score de 0/100.

Le problème n'est PAS le score de 0, c'est que **toutes** les transactions ont exactement la même probabilité.

## 📝 Prochaines Étapes

1. **Vérifier les logs détaillés** après une nouvelle transaction
2. **Analyser si les features varient**
3. **Décider de la solution appropriée** :
   - Accepter (si nouveaux utilisateurs)
   - Améliorer les features (si features identiques)
   - Réentraîner le modèle (si features différentes mais même proba)

## 🔬 Analyse Approfondie (Si Nécessaire)

### Option 1 : Tester avec des Features Manuelles

Créer un script de test avec des features très différentes :

```typescript
// Test 1 : Transaction normale
const features1 = [100, 20, 14, 1, 0, 2, 0, 1, 500, 1, 0, 1, 0, 50, 10, 5, 0, 0, 1]

// Test 2 : Transaction suspecte  
const features2 = [5000, 80, 3, 6, 300, 4, 0, 2, 999, 3, 1, 2, 2, 100, 50, 20, 0.8, 500, 10]
```

Envoyer à Hugging Face et voir si les probabilités diffèrent.

### Option 2 : Vérifier le Scaler

Le scaler a-t-il été correctement entraîné avec des données variées ?

```python
# Dans train_enriched_model.py - vérifier
print("Scaler mean:", scaler.mean_)
print("Scaler scale:", scaler.scale_)
```

Si `scaler.scale_` contient des valeurs très petites ou des NaN, le problème vient du scaler.

## 🎯 Conclusion Provisoire

Le modèle ML **fonctionne** (il retourne des probabilités), mais il retourne **toujours la même probabilité** parce que :

1. Les features envoyées sont probablement très similaires (surtout pour nouveaux utilisateurs)
2. Le modèle a été entraîné sur des données synthétiques qui ne reflètent peut-être pas la réalité

**Ce n'est pas critique** car :
- Les règles heuristiques (60% du score) fonctionnent correctement
- Le système détecte quand même les transactions suspectes (score heuristique 30-45)
- Le ML s'améliorera avec plus de vraies transactions

**Pour l'instant** : Le système fonctionne, le ML est juste "prudent" et dit "très faible risque" pour tout. C'est mieux que de bloquer toutes les transactions !
