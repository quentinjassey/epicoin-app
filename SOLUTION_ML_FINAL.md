# Solution Finale : ML Indépendant et Fonctionnel
**Date**: 26 janvier 2026  
**Statut**: 🔧 EN COURS

## 🎯 Diagnostic Complet

### ✅ Ce Qui Fonctionne

1. **Le modèle ML actuel FONCTIONNE** :
   - Détecte les fraudes évidentes à 99%
   - Identifie les transactions légitimes à 0.11%
   - Latence excellente : 0.19ms

2. **Les features statistiques sont maintenant calculées** :
   - `user_avg_amount` : Moyenne de l'historique ✅
   - `user_std_amount` : Écart-type ✅
   - `amount_deviation` : Déviation ✅
   - `user_fraud_ratio` : Ratio de fraude ✅

### ❌ Le Problème

**Le modèle est trop binaire** : il retourne soit 0% (légitime) soit 99% (fraude), sans nuances.

**Cause** : Le modèle a été entraîné avec `fraud_score` (score heuristique) en input → il a appris à simplement **copier** ce score !

```python
Corrélation ML vs Heuristique : 0.92
→ Le ML suit trop l'heuristique (peu de valeur ajoutée)
```

## ✅ Solution : Modèle ML Indépendant

### Principe

Entraîner un nouveau modèle **SANS** le `fraud_score` en feature. Le ML sera alors vraiment indépendant et pourra apporter une vraie valeur ajoutée.

**Features** : 18 au lieu de 19
- ❌ RETIRÉ : `fraud_score_heuristic` (feature 2)
- ✅ GARDÉ : Toutes les autres features (montant, heure, pays, device, stats utilisateur, etc.)

### Étapes de Mise en Œuvre

## 📝 ÉTAPE 1 : Entraîner le Nouveau Modèle

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# Exporter la clé Supabase
export SUPABASE_SERVICE_ROLE_KEY="ta_cle_service_role_key"

# Entraîner
python3 train_independent_model.py
```

**Résultat attendu** :
- `fraud_model_independent.pkl`
- `scaler_independent.pkl`
- `label_encoders_independent.pkl`
- `model_metadata_independent.json`

## 📤 ÉTAPE 2 : Uploader sur Hugging Face

```bash
# Se connecter à Hugging Face
huggingface-cli login

# Uploader les fichiers
huggingface-cli upload QuentinJassey/epicoin-fraud-detection-enriched \
    fraud_model_independent.pkl \
    scaler_independent.pkl \
    label_encoders_independent.pkl \
    model_metadata_independent.json \
    --repo-type model
```

**OU** via l'interface web Hugging Face :
1. Aller sur https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/tree/main
2. Cliquer "Upload files"
3. Uploader les 4 fichiers `*_independent.*`
4. Commit

## 🔧 ÉTAPE 3 : Mettre à Jour `handler.py`

Remplacer les noms de fichiers dans le handler :

```python
# AVANT
model_path = os.path.join(base_path, 'fraud_model_enriched.pkl')
scaler_path = os.path.join(base_path, 'scaler_enriched.pkl')
encoders_path = os.path.join(base_path, 'label_encoders_enriched.pkl')

# APRÈS
model_path = os.path.join(base_path, 'fraud_model_independent.pkl')
scaler_path = os.path.join(base_path, 'scaler_independent.pkl')
encoders_path = os.path.join(base_path, 'label_encoders_independent.pkl')
```

Uploader le nouveau `handler.py` sur Hugging Face.

## 🔧 ÉTAPE 4 : Mettre à Jour `index.ts`

Modifier `buildMLFeatures()` pour **enlever** le `fraud_score_heuristic` :

```typescript
// AVANT (19 features)
function buildMLFeatures(...) {
    return [
        transaction.amount || 0,           // 1
        riskScore || 0,                    // 2 ← RETIRER
        created.getHours(),                // 3
        // ...
    ]
}

// APRÈS (18 features)
function buildMLFeatures(...) {
    return [
        transaction.amount || 0,           // 1
        // riskScore || 0,                 // ← RETIRÉ !
        created.getHours(),                // 2 (renuméroté)
        created.getDay(),                  // 3
        // ...
    ]
}
```

Redéployer la fonction :

```bash
npx supabase functions deploy fraud-detection --no-verify-jwt
```

## 🧪 ÉTAPE 5 : Tester

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"
python3 test_ml_scenarios.py
```

**Résultat attendu** :
- Variance des scores ML > 1000 (au lieu de 2450 actuel)
- Corrélation ML vs Heuristique < 0.7 (au lieu de 0.92)
- Scores ML plus nuancés (pas seulement 0% ou 99%)

## 📊 Résultats Espérés

### Avant (Modèle avec fraud_score)

```
Transaction Normale 50 EPC    : ML 0%  → Final 6/100  🟢
Transaction Normale 100 EPC   : ML 0%  → Final 9/100  🟢
Transaction Suspecte 1000 EPC : ML 0%  → Final 24/100 🟢 (devrait être 🟡)
Transaction Fraude 10000 EPC  : ML 99% → Final 96/100 🔴

Corrélation : 0.92 (trop élevée)
```

### Après (Modèle indépendant)

```
Transaction Normale 50 EPC    : ML 5%  → Final 8/100  🟢
Transaction Normale 100 EPC   : ML 8%  → Final 12/100 🟢
Transaction Suspecte 1000 EPC : ML 45% → Final 42/100 🟡 ← AMÉLIORATION !
Transaction Fraude 10000 EPC  : ML 95% → Final 95/100 🔴

Corrélation : 0.65 (bonne complémentarité)
```

Le ML apporte maintenant une **vraie valeur ajoutée** en détectant des patterns que l'heuristique rate !

## 🎯 Avantages du Nouveau Modèle

1. **Indépendance** : Le ML n'est plus biaisé par le score heuristique
2. **Complémentarité** : Il peut détecter des fraudes que l'heuristique rate
3. **Nuances** : Scores ML plus variés (pas seulement 0% ou 99%)
4. **Apprentissage réel** : Le modèle apprend vraiment des patterns de données

## 🚀 Commandes Rapides

### Tout en Une Fois

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# 1. Entraîner
export SUPABASE_SERVICE_ROLE_KEY="ta_cle"
python3 train_independent_model.py

# 2. Uploader sur HF (via web ou CLI)
# https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched

# 3. Mettre à jour handler.py et uploader sur HF

# 4. Mettre à jour index.ts (retirer fraud_score de buildMLFeatures)
# 5. Redéployer
npx supabase functions deploy fraud-detection --no-verify-jwt

# 6. Tester
python3 test_ml_scenarios.py
```

## 📋 Checklist

- [ ] Entraîner le modèle indépendant (`train_independent_model.py`)
- [ ] Vérifier les métriques (Accuracy, AUC-ROC, Latence)
- [ ] Uploader les 4 fichiers sur Hugging Face
- [ ] Mettre à jour `handler.py` (noms de fichiers)
- [ ] Uploader `handler.py` sur Hugging Face
- [ ] Mettre à jour `index.ts` (`buildMLFeatures` - 18 features)
- [ ] Redéployer la fonction `fraud-detection`
- [ ] Tester avec `test_ml_scenarios.py`
- [ ] Vérifier la variance et la corrélation
- [ ] Faire des transactions réelles pour tester

## 🎓 Pourquoi C'est Important pour le Contrat ?

Le contrat demande un **POC moteur IA** avec mesure de recall/precision. Le modèle actuel valide déjà ces critères, MAIS :

- **Valeur ajoutée limitée** : Le ML suit trop l'heuristique (0.92 corrélation)
- **Pas d'apprentissage réel** : Il copie juste le score heuristique

Le nouveau modèle **indépendant** :
- ✅ Apporte une vraie valeur ajoutée (complémentaire à l'heuristique)
- ✅ Démontre un apprentissage machine réel
- ✅ Justifie l'utilisation du ML (pas juste un copie-colle)

C'est la différence entre un POC académique et un système production-ready !

## 📝 Notes Techniques

### Pourquoi Retirer le fraud_score ?

Le `fraud_score` est le résultat des **règles heuristiques**. L'inclure dans les features ML crée une **fuite d'information** (data leakage) :

```
Heuristique → fraud_score → Feature ML → Prédiction ML
                    ↑                           ↓
                    └──────────── Circulaire ──┘
```

Le ML apprend à prédire la fraude en se basant sur... le score de fraude ! C'est circulaire et inutile.

**Sans** le fraud_score, le ML doit apprendre des **vrais patterns** :
- Montants inhabituels pour un utilisateur
- Combinaisons suspectes (nouveau compte + gros montant + pays rare)
- Vélocité anormale
- Changement de device/localisation

### Alternative : Garder le fraud_score mais avec Poids Réduit

Si le nouveau modèle performe moins bien, on peut :
1. Garder le `fraud_score` en feature
2. Mais réduire drastiquement le poids du ML (10% au lieu de 40%)

```typescript
// ML comme "assistant" uniquement
riskScore = Math.round(heuristicScoreRaw * 0.9 + mlScore * 0.1)
```

Avantage : Le ML reste actif (pour audit/logs) mais n'influence presque pas.
