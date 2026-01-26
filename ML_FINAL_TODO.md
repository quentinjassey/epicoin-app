# 🎯 TO-DO Final : Déployer le Modèle ML Sans Data Leakage

## ✅ Ce Qui Est Fait

1. ✅ **Analyse complète** du problème (`status` = 88% importance → data leakage)
2. ✅ **Script d'entraînement** modifié (17 features, sans `fraud_score` ni `status`)
3. ✅ **Script d'upload** prêt
4. ✅ **Documentation** complète

## 🚀 CE QU'IL TE RESTE À FAIRE (10 minutes)

### Étape 1 : Entraîner le Modèle (3 min)

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# Configurer les clés
export SUPABASE_SERVICE_ROLE_KEY="eyJh..."  # Ta clé service_role
export HUGGINGFACE_TOKEN="hf_..."           # Ton token HF

# Entraîner
python3 train_independent_model.py
```

**Vérifier dans l'output** :
```
✅ 17 features disponibles (SANS fraud_score ni status)
✅ Top 5 features ÉQUILIBRÉES (aucune > 50%)
```

### Étape 2 : Upload sur Hugging Face (1 min)

```bash
# Avec le même terminal (clés déjà exportées)
python3 upload_to_huggingface.py
```

**Attendre** : 2 minutes pour le redéploiement automatique

**Vérifier** : https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/deployments  
→ Status = "Running"

### Étape 3 : Mettre à Jour index.ts (2 min)

Dans `/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection/index.ts` :

**Trouver la fonction `buildMLFeatures()`** (ligne ~595) et retirer :

```typescript
// AVANT (18 features)
const mlFeatures = [
    transaction.amount || 0,                    // 1
    created.getHours(),                         // 2
    created.getDay(),                           // 3
    Math.abs(executed.getTime() - created.getTime()) / 1000, // 4
    encodeTransactionType(...),                 // 5
    transaction.direction === 'incoming' ? 1:0, // 6
    encodeCountry(...),                         // 7
    encodeCitySimple(...),                      // 8
    encodeProvider(...),                        // 9
    encodeStatus(features.status),              // 10 ← SUPPRIMER CETTE LIGNE !
    encodeOSName(...),                          // 11
    // ...
]

// APRÈS (17 features)
const mlFeatures = [
    transaction.amount || 0,                    // 1
    created.getHours(),                         // 2
    created.getDay(),                           // 3
    Math.abs(executed.getTime() - created.getTime()) / 1000, // 4
    encodeTransactionType(...),                 // 5
    transaction.direction === 'incoming' ? 1:0, // 6
    encodeCountry(...),                         // 7
    encodeCitySimple(...),                      // 8
    encodeProvider(...),                        // 9
    // encodeStatus(features.status),           // ❌ RETIRÉ (data leakage)
    encodeOSName(...),                          // 10 (renuméroté)
    // ...
]
```

**Mettre à jour les logs** (3 endroits) :

1. Ligne ~760 :
```typescript
// AVANT
console.log('[ML] Calling Hugging Face with 18 features (SANS fraud_score):', features.length)

// APRÈS
console.log('[ML] Calling Hugging Face with 17 features (SANS fraud_score ni status):', features.length)
```

2. Ligne ~660 :
```typescript
// AVANT
console.log('[ML Features] Détails (SANS fraud_score):', {

// APRÈS
console.log('[ML Features] Détails (17 features - sans fraud_score ni status):', {
```

3. Ligne ~529 :
```typescript
// AVANT
features.ml_features_sent = mlFeatures // Les 18 features

// APRÈS
features.ml_features_sent = mlFeatures // Les 17 features (sans fraud_score ni status)
```

**Mettre à jour le commentaire de fonction** (ligne ~594) :
```typescript
// AVANT
// Helper: Construire features pour le modèle ML INDÉPENDANT (sans fraud_score)
function buildMLFeatures(...) {
    // Créer le vecteur de 18 features (SANS fraud_score heuristique)

// APRÈS
// Helper: Construire features pour le modèle ML INDÉPENDANT (sans fraud_score ni status)
function buildMLFeatures(...) {
    // Créer le vecteur de 17 features (SANS fraud_score heuristique ni status)
```

### Étape 4 : Redéployer (1 min)

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app"

npx supabase functions deploy fraud-detection --no-verify-jwt
```

### Étape 5 : Tester (2 min)

```bash
# Faire une transaction dans l'app (achat ou top-up)

# Vérifier les logs
npx supabase functions logs fraud-detection --tail
```

**Tu DOIS voir** :
```
✅ [ML] Calling Hugging Face with 17 features (SANS fraud_score ni status): 17
✅ [ML] Scores - Heuristic: 45 ML: 25 Final: 37  ← ML VARIE !
✅ [Fraud Detection Enhanced] Risk score: 37 Decision: review
```

**Si le ML score est toujours 0.0002** :
- Vérifier que HF est bien redéployé (status "Running")
- Vérifier que `index.ts` a bien 17 features
- Attendre 2-3 min de plus (cache HF)

---

## 📊 Résultat Attendu

### Avant (avec status)
```
Transaction Normale  : ML 0.0002 (0%)  ← Bloqué !
Transaction Suspecte : ML 0.0002 (0%)  ← Bloqué !
Transaction Fraude   : ML 0.0002 (0%)  ← Bloqué !
```

### Après (sans status)
```
Transaction Normale  : ML 5-15%   → Final 10-20 🟢
Transaction Suspecte : ML 30-50%  → Final 35-55 🟡
Transaction Fraude   : ML 80-95%  → Final 85-96 🔴
```

**Le ML apporte enfin de la valeur !** 🎉

---

## 🐛 Dépannage

### "SUPABASE_SERVICE_ROLE_KEY non défini"
```bash
export SUPABASE_SERVICE_ROLE_KEY="ta_cle"
```

### "HUGGINGFACE_TOKEN non configuré"
```bash
export HUGGINGFACE_TOKEN="hf_ton_token"
```

### "Features importantes déséquilibrées"
Si une feature domine à >50%, c'est qu'il reste du data leakage. Vérifier que `status` et `fraud_score` sont bien absents.

### "ML score toujours à 0"
1. Vérifier HF deployments (doit être "Running")
2. Attendre 2-3 min (cache)
3. Vérifier que `index.ts` envoie bien 17 features

---

## 📁 Fichiers Modifiés

1. ✅ `train_independent_model.py` - 17 features au lieu de 18
2. ⏳ `index.ts` - À modifier (retirer `status`)
3. ✅ Scripts d'upload et déploiement prêts

---

## 🎯 Checklist Finale

- [ ] Clés exportées (SUPABASE + HF)
- [ ] Modèle entraîné (17 features)
- [ ] Top 5 features équilibrées (aucune > 50%)
- [ ] Upload sur HF réussi
- [ ] HF deployment status = "Running"
- [ ] `index.ts` modifié (17 features)
- [ ] Logs mis à jour ("17 features")
- [ ] Edge Function redéployée
- [ ] Transaction test effectuée
- [ ] ML score VARIE (pas 0.0002)
- [ ] Score final cohérent (mix 60/40)

---

## 🚀 Commande Ultra-Rapide (Tout en un)

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

export SUPABASE_SERVICE_ROLE_KEY="..."
export HUGGINGFACE_TOKEN="hf_..."

python3 train_independent_model.py && \
python3 upload_to_huggingface.py && \
echo "✅ Entraînement et upload terminés !" && \
echo "⏳ Attendre 2 min pour HF deployment..." && \
echo "📝 Maintenant : Mettre à jour index.ts (retirer status, 17 features)" && \
echo "🚀 Puis : cd ../../../ && npx supabase functions deploy fraud-detection --no-verify-jwt"
```

**Temps total** : ~10 minutes ⏱️

**Une fois terminé** : Le ML sera ENFIN fonctionnel ! 🎉
