# 🧪 Test Final du Modèle ML (17 Features)

## ✅ Edge Function Déployée

L'Edge Function est maintenant en production avec :
- ✅ 17 features (sans `fraud_score` ni `status`)
- ✅ Logs mis à jour
- ✅ Déployée sur Supabase

---

## 🧪 Option 1 : Test Local (Script Python)

### Configuration
```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# Configurer le token HF
export HUGGINGFACE_TOKEN="hf_..."

# Lancer le test
python3 test_model_hf_live.py
```

### Résultat Attendu
```
🧪 Test du Modèle ML sur Hugging Face (17 Features)
================================================================================
📊 Test de 3 scénarios avec 17 features chacun

🔍 Scénario : Transaction Normale (Low Risk)
   ✅ ML Score : 12% (attendu: 0-20%)
   ⏱️  Latence : 180 ms

🔍 Scénario : Transaction Suspecte (Medium Risk)
   ✅ ML Score : 45% (attendu: 30-60%)
   ⏱️  Latence : 150 ms

🔍 Scénario : Transaction Frauduleuse (High Risk)
   ✅ ML Score : 87% (attendu: 70-100%)
   ⏱️  Latence : 165 ms

📊 RÉSUMÉ
================================================================================
Tests réussis : 3/3
📈 Variation des scores : 12% - 87% (écart: 75%)
✅ Les scores varient correctement selon le contexte
⏱️  Latence moyenne : 165 ms
✅ Latence < 300ms (objectif POC atteint)

🎉 SUCCÈS : Le modèle ML est fonctionnel !
🚀 Tu peux maintenant tester dans l'app !
```

---

## 🚀 Option 2 : Test via l'App (Recommandé)

### Étape 1 : Faire une Transaction

Dans l'app, effectue **une transaction de test** :
- **Top-up** : 50 EPC
- **Achat** : Un produit quelconque
- **Transfert** : Envoie 20 EPC à un autre utilisateur

### Étape 2 : Vérifier les Logs

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app"

npx supabase functions logs fraud-detection --tail
```

### Étape 3 : Analyser les Logs

**Tu DOIS voir** :
```
[Fraud Detection Enhanced] Analyzing transaction: {
  userId: "...",
  amount: 50,
  type: "topup"
}

[ML Features] Détails (17 features - sans fraud_score ni status): {
  amount: 50,
  hour: 14,
  day_of_week: 2,
  ...
}

[ML] Calling Hugging Face with 17 features (SANS fraud_score ni status): 17

[ML] Hugging Face response: {
  "fraud_score": 15,              ← DOIT VARIER !
  "fraud_probability": 0.15,
  "is_fraud": false
}

[ML] Scores - Heuristic: 30 ML: 15 Final: 24

[Fraud Detection Enhanced] Risk score: 24 Decision: approve
```

---

## 🎯 Critères de Succès

### ✅ Le Modèle Fonctionne SI :

1. **Le ML score varie** :
   - Transaction normale → ML 5-20%
   - Transaction suspecte → ML 30-60%
   - Transaction frauduleuse → ML 70-95%

2. **Pas de score figé** :
   - ❌ Si toujours 0.0002 → Problème !
   - ✅ Si varie selon le contexte → OK !

3. **Latence acceptable** :
   - ✅ < 500ms → Excellent
   - ✅ < 1000ms → Acceptable
   - ⚠️  > 2000ms → Cold start (attendre 1 min)

4. **Le score final mixe bien** :
   - Score final = 60% Heuristic + 40% ML (ou 95/5 selon config)
   - Exemple : Heuristic 30 + ML 15 → Final 24

---

## 🐛 Dépannage

### Problème 1 : ML Score toujours 0.0002

**Causes possibles** :
1. Le modèle HF n'a pas été mis à jour
2. Le `handler.py` sur HF n'est pas à jour
3. Cache HF (attendre 5-10 min)

**Vérifier** :
```bash
# 1. Vérifier le déploiement HF
open https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/deployments

# 2. Status doit être "Running"

# 3. Vérifier les fichiers uploadés
open https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/tree/main

# Doit contenir :
# - fraud_model_independent.pkl
# - scaler_independent.pkl
# - label_encoders_independent.pkl
# - model_metadata_independent.json
# - handler.py (mis à jour)
```

### Problème 2 : Erreur 503 (Service Unavailable)

**Cause** : Cold start du modèle sur HF

**Solution** :
```
⏳ Attendre 30-60 secondes
🔄 Réessayer la transaction
```

### Problème 3 : "18 features" dans les logs

**Cause** : L'Edge Function n'a pas été redéployée

**Solution** :
```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app"
npx supabase functions deploy fraud-detection --no-verify-jwt
```

### Problème 4 : ML Score trop élevé pour transactions normales

**Cause** : Le mix est configuré à 60/40 (ML a trop de poids)

**Solution** : Ajuster dans `index.ts` :
```typescript
// Ligne ~520
const mlWeight = 0.05  // Passer de 0.40 à 0.05 (5%)
const heuristicWeight = 0.95  // Passer de 0.60 à 0.95 (95%)
```

---

## 📊 Scénarios de Test Recommandés

### Test 1 : Transaction Normale 🟢
```
Action : Top-up 50 EPC
Attendu :
  - Heuristic : 25-35
  - ML : 5-20
  - Final : 20-30
  - Décision : ✅ approve
```

### Test 2 : Transaction Suspecte 🟡
```
Action : Achat 500 EPC à 3h du matin
Attendu :
  - Heuristic : 45-65
  - ML : 30-50
  - Final : 40-60
  - Décision : ⏳ review (pending)
```

### Test 3 : Transaction Frauduleuse 🔴
```
Action : Transfert 2000 EPC vers nouvel utilisateur
Attendu :
  - Heuristic : 75-85
  - ML : 70-95
  - Final : 75-90
  - Décision : 🚫 block
```

---

## ✅ Checklist Finale

Avant de valider :

- [ ] Edge Function déployée (✅ fait)
- [ ] Modèle uploadé sur HF
- [ ] HF deployment status = "Running"
- [ ] Transaction test effectuée dans l'app
- [ ] Logs vérifiés : `[ML] Calling Hugging Face with 17 features`
- [ ] ML score VARIE (pas 0.0002)
- [ ] Score final cohérent (mix visible)
- [ ] Décision appropriée (approve/review/block)
- [ ] Latence < 1 seconde

---

## 🎉 Validation Finale

**Si tous les critères sont remplis** :

```
🎉 SUCCÈS COMPLET !
================================================================================
✅ Le modèle ML est fonctionnel
✅ Les scores varient selon le contexte
✅ La latence est acceptable
✅ Le système heuristique + ML fonctionne en synergie

📊 Résultat :
   - Data leakage (status) : CORRIGÉ ✅
   - Corrélation circulaire (fraud_score) : CORRIGÉE ✅
   - 17 features propres : IMPLÉMENTÉ ✅
   - Edge Function : DÉPLOYÉE ✅
   - Tests : RÉUSSIS ✅

🚀 Le système de détection de fraude est maintenant production-ready (POC) !
================================================================================
```

---

## 📞 Si Besoin d'Aide

**Problème persistant ?**

1. **Vérifier HF** : https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched
2. **Logs Supabase** : `npx supabase functions logs fraud-detection`
3. **Handler.py** : Vérifier qu'il charge `fraud_model_independent.pkl`

**Documents de référence** :
- `COMMANDES_FINALES.md` - Guide de déploiement
- `ANALYSE_ET_SOLUTION_FINALE.md` - Analyse technique
- `CORRECTIONS_URGENTES_ML.md` - Diagnostic du problème
