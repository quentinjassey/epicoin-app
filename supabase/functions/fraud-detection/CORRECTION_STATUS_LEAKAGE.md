# 🔴 Correction Urgente : Data Leakage via `status`

**Date** : 26 janvier 2026  
**Gravité** : CRITIQUE  
**Statut** : 🔧 CORRECTION EN COURS

---

## 🔍 Problème Identifié

Le modèle ML retourne toujours ~0% de fraude pour TOUTES les transactions, même celles qui devraient être suspectes.

### Cause Racine

**`status` représente 88.52% de l'importance des features !**

```
Top 5 Features Importantes :
1. status                   : 88.52%  ← PROBLÈME !
2. user_fraud_ratio         : 1.65%
3. user_std_amount          : 1.04%
```

### Le Data Leakage

Le modèle a appris :
```python
if status == 'completed' (0):
    return 0.0002  # Pas de fraude
elif status == 'failed' (2):
    return 0.9988  # Fraude
```

**C'est circulaire !** On ne connaît le `status` qu'**APRÈS** la transaction.

Au moment de la détection de fraude :
- ✅ On sait : montant, pays, device, historique utilisateur
- ❌ On NE sait PAS : si la transaction va réussir ou échouer

---

## 🎯 Solution

### Réentraîner le Modèle SANS `status`

**Nouvelles features** : **17** au lieu de 18

Features RETIRÉES :
- ❌ `fraud_score` (score heuristique) → dépendance circulaire
- ❌ `status` (completed/failed) → data leakage

Features GARDÉES (17) :
1. `amount_numeric`
2. `hour`
3. `day_of_week`
4. `execution_delay`
5. `transaction_type_encoded`
6. `direction_encoded`
7. `country_encoded`
8. `city_encoded`
9. `provider_encoded`
10. `os_name_encoded`
11. `type_encoded`
12. `user_avg_amount`
13. `user_std_amount`
14. `user_tx_count`
15. `user_fraud_ratio`
16. `amount_deviation`
17. `device_tx_count`

---

## 🚀 Étapes de Correction

### 1. Réentraîner le Modèle (Modifié)

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

export SUPABASE_SERVICE_ROLE_KEY="ta_cle"

# Réentraîner avec 17 features (sans fraud_score ni status)
python3 train_independent_model.py
```

**Résultat attendu** :
- ✅ 17 features disponibles
- ✅ `status` absent de la liste
- ✅ Importance des features plus équilibrée
- ✅ Modèles : `fraud_model_independent.pkl`, etc.

### 2. Upload sur Hugging Face

```bash
export HUGGINGFACE_TOKEN="hf_..."

python3 upload_to_huggingface.py
```

Ou manuellement sur : https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched

### 3. Mettre à Jour handler.py

**Aucun changement** : Le handler reste identique (il charge juste les nouveaux .pkl)

### 4. Mettre à Jour index.ts

Retirer `status` de `buildMLFeatures()` :

```typescript
const mlFeatures = [
    transaction.amount || 0,                    // 1
    created.getHours(),                         // 2
    created.getDay(),                           // 3
    Math.abs(...) / 1000,                       // 4
    encodeTransactionType(...),                 // 5
    transaction.direction === 'incoming' ? 1:0, // 6
    encodeCountry(...),                         // 7
    encodeCitySimple(...),                      // 8
    encodeProvider(...),                        // 9
    // encodeStatus(features.status),           // ❌ RETIRÉ !
    encodeOSName(...),                          // 10 (renuméroté)
    encodeTypeOld(...),                         // 11
    features.user_avg_amount || 0,              // 12
    features.user_std_amount || 0,              // 13
    features.transaction_count_24h || ...,      // 14
    features.user_fraud_ratio || 0,             // 15
    features.amount_deviation || 0,             // 16
    features.device_tx_count || 1               // 17
]
```

**Mettre à jour les logs** :
- `"18 features"` → `"17 features"`
- Commentaires : `(sans fraud_score ni status)`

### 5. Redéployer

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app"

npx supabase functions deploy fraud-detection --no-verify-jwt
```

### 6. Tester

```bash
# Faire une transaction
# Vérifier les logs
npx supabase functions logs fraud-detection --tail
```

**Vérifier** :
- ✅ `17 features` dans les logs
- ✅ ML score VARIE (pas toujours 0.0002)
- ✅ Scores plus nuancés

---

## 📊 Résultats Attendus

### Avant (avec status)

```
Transaction Normale : ML 0.0002 (0%) ← Bloqué par status
Transaction Suspecte : ML 0.0002 (0%) ← Bloqué par status
Transaction Fraude : ML 0.0002 (0%) ← Bloqué par status
```

**Le modèle ne regarde que `status` !**

### Après (sans status)

```
Transaction Normale : ML 5-15%  ← Analyse des features
Transaction Suspecte : ML 30-50% ← Analyse des features
Transaction Fraude : ML 80-95% ← Analyse des features
```

**Le modèle analyse vraiment les patterns !**

---

## 🎓 Leçon Apprise

### Features à TOUJOURS Éviter dans ML

1. **Labels déguisés** : `status`, `is_fraud`, `result`
2. **Scores calculés** : `fraud_score`, `risk_level`
3. **Données futures** : Toute info connue seulement APRÈS la transaction

### Règle d'Or

**"Si je ne connais pas cette valeur AU MOMENT où je dois prendre la décision, je ne dois PAS l'utiliser comme feature."**

---

## ⏱️ Temps Estimé

- Réentraînement : 1-2 min
- Upload : 30 sec
- Mise à jour code : 2 min
- Redéploiement : 1 min
- Test : 30 sec

**Total** : ~5-6 minutes

---

## 🎯 Checklist

- [ ] `train_independent_model.py` modifié (17 features)
- [ ] Modèle réentraîné avec 5000 transactions
- [ ] Vérifier : `status` absent des features importantes
- [ ] Upload sur Hugging Face
- [ ] `index.ts` modifié (retirer `status`, 17 features)
- [ ] Logs mis à jour (`"17 features"`)
- [ ] Edge Function redéployée
- [ ] Test avec transaction réelle
- [ ] ML score varie selon les transactions
- [ ] Score final cohérent

---

## 🚀 Commande Rapide

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# 1. Réentraîner
export SUPABASE_SERVICE_ROLE_KEY="..."
python3 train_independent_model.py

# 2. Upload
export HUGGINGFACE_TOKEN="hf_..."
python3 upload_to_huggingface.py

# 3. Mettre à jour index.ts (retirer status, feature #10)
# 4. Redéployer
cd ../../../
npx supabase functions deploy fraud-detection --no-verify-jwt

# 5. Tester
npx supabase functions logs fraud-detection --tail
```

---

**Une fois corrigé, le modèle devrait ENFIN retourner des scores variés !** 🎉
