# 🚀 Commandes Finales : Déployer le ML Fonctionnel

## ✅ Déjà Fait par l'IA

1. ✅ `train_independent_model.py` → 17 features (sans fraud_score ni status)
2. ✅ `index.ts` → Mis à jour pour envoyer 17 features
3. ✅ Scripts d'upload prêts
4. ✅ Documentation complète

---

## 🎯 CE QUE TU DOIS FAIRE (5 minutes)

### Étape 1 : Entraîner et Upload (3 min)

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# Configurer les clés (à adapter avec tes vraies clés)
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export HUGGINGFACE_TOKEN="hf_..."

# Entraîner + Upload (tout automatique)
python3 train_independent_model.py && python3 upload_to_huggingface.py
```

**Ce qui se passe** :
- ✅ Récupération des 5000 transactions depuis Supabase
- ✅ Entraînement XGBoost avec 17 features (sans fraud_score ni status)
- ✅ Vérification que les features sont équilibrées (aucune > 50%)
- ✅ Upload du modèle + scaler + encoders sur Hugging Face

**Tu DOIS voir dans l'output** :
```
✅ 17 features disponibles (SANS fraud_score ni status)
✅ Top 5 features équilibrées
✅ Upload réussi vers Hugging Face
```

---

### Étape 2 : Attendre Redéploiement HF (2 min)

Hugging Face met à jour automatiquement ton endpoint avec le nouveau modèle.

**Vérifier** :
🔗 https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/deployments

**Status doit être** : ✅ Running

---

### Étape 3 : Redéployer l'Edge Function (30 sec)

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app"

npx supabase functions deploy fraud-detection --no-verify-jwt
```

**Ce qui se passe** :
- ✅ L'Edge Function est mise à jour avec le nouveau code (17 features)
- ✅ Elle va maintenant envoyer 17 valeurs au lieu de 18

---

### Étape 4 : Tester (1 min)

```bash
# Faire une transaction dans l'app (achat ou top-up)

# Vérifier les logs
npx supabase functions logs fraud-detection --tail
```

**Tu DOIS voir** :
```
✅ [ML] Calling Hugging Face with 17 features (SANS fraud_score ni status): 17
✅ [ML] Scores - Heuristic: 45 ML: 25 Final: 37
✅ [Fraud Detection Enhanced] Risk score: 37 Decision: review
```

**Le ML score doit VARIER !** (plus de 0.0002 figé)

---

## 📊 Résultat Attendu

### Avant (avec status = data leakage)
```
❌ ML Score : 0.0002 (toujours pareil)
❌ Le modèle ne sert à rien
```

### Après (sans status ni fraud_score)
```
✅ Transaction Normale  : ML 5-15%   → Final 10-20 🟢
✅ Transaction Suspecte : ML 30-50%  → Final 35-55 🟡
✅ Transaction Fraude   : ML 80-95%  → Final 85-96 🔴
```

**Le ML apporte enfin de la valeur ! 🎉**

---

## 🐛 Dépannage

### "SUPABASE_SERVICE_ROLE_KEY non défini"
```bash
export SUPABASE_SERVICE_ROLE_KEY="ta_cle_ici"
```

Trouver la clé : https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

### "ML score toujours 0.0002"
1. ✅ Vérifier HF deployments (status = "Running")
2. ⏳ Attendre 2-3 min de plus (cache)
3. 🔍 Vérifier logs : `[ML] Calling Hugging Face with 17 features`

### "Features déséquilibrées (une > 50%)"
C'est qu'il reste du data leakage. Vérifier que `status` et `fraud_score` sont bien absents du modèle.

---

## 📁 Changements Effectués

### train_independent_model.py
```python
# AVANT (18 features)
feature_columns = [
    'amount_numeric',
    'fraud_score',         # ❌ Dépendance circulaire
    'hour',
    ...
    'status_encoded',      # ❌ Data leakage
    ...
]

# APRÈS (17 features)
feature_columns = [
    'amount_numeric',
    # 'fraud_score',      # ❌ RETIRÉ
    'hour',
    ...
    # 'status_encoded',   # ❌ RETIRÉ
    ...
]
```

### index.ts (buildMLFeatures)
```typescript
// AVANT (18 features)
const mlFeatures = [
    transaction.amount || 0,          // 1
    created.getHours(),               // 2
    ...
    encodeStatus(features.status),    // 10 ← SUPPRIMÉ !
    encodeOSName(...),                // 11
    ...
]

// APRÈS (17 features)
const mlFeatures = [
    transaction.amount || 0,          // 1
    created.getHours(),               // 2
    ...
    // encodeStatus(features.status), // ❌ RETIRÉ (data leakage)
    encodeOSName(...),                // 10 (renuméroté)
    ...
]
```

---

## ✅ Checklist Finale

- [ ] Clés exportées (SUPABASE + HF)
- [ ] Commande `python3 train_independent_model.py` exécutée
- [ ] Output : "✅ 17 features disponibles"
- [ ] Output : "✅ Top 5 features équilibrées"
- [ ] Commande `python3 upload_to_huggingface.py` exécutée
- [ ] HF deployments status = "Running"
- [ ] Commande `npx supabase functions deploy fraud-detection` exécutée
- [ ] Transaction test effectuée dans l'app
- [ ] Logs vérifiés : `[ML] Calling Hugging Face with 17 features`
- [ ] ML score VARIE (pas 0.0002)
- [ ] Score final cohérent (mix 60/40 ou 95/5 selon config)

---

## 🎯 Commande Ultra-Rapide (Copier-Coller)

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

export SUPABASE_SERVICE_ROLE_KEY="TA_CLE_ICI"
export HUGGINGFACE_TOKEN="hf_TON_TOKEN_ICI"

python3 train_independent_model.py && \
python3 upload_to_huggingface.py && \
echo "" && \
echo "✅ Entraînement et upload terminés !" && \
echo "⏳ Attendre 2 min pour HF deployment..." && \
echo "🔗 Vérifier : https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/deployments" && \
echo "" && \
echo "📝 Puis :" && \
echo "cd ../../../ && npx supabase functions deploy fraud-detection --no-verify-jwt"
```

**Temps total** : ~5 minutes ⏱️

---

## 📖 Documentation Complète

Pour plus de détails, voir :
- **`ML_FINAL_TODO.md`** - Guide complet pas-à-pas
- **`CORRECTIONS_URGENTES_ML.md`** - Diagnostic du problème
- **`SOLUTION_ML_FINAL.md`** - Explication technique

---

**Une fois terminé** : Le ML sera ENFIN fonctionnel avec des scores variés et pertinents ! 🎉
