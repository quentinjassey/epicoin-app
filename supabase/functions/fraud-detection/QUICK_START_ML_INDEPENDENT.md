# 🚀 Guide Rapide : Modèle ML Indépendant

## 📋 Résumé

Ce guide vous permet d'entraîner et déployer un **modèle ML indépendant** (sans fraud_score) en **5 minutes** !

### Avantages du Modèle Indépendant

- ✅ **18 features** (au lieu de 19 - sans fraud_score)
- ✅ **Complémentaire** à l'heuristique (corrélation ~0.65)
- ✅ **Scores nuancés** (pas seulement 0% ou 99%)
- ✅ **Apprentissage réel** des patterns de données

## 🔑 Prérequis

### 1. Clé Supabase

Récupérer la `service_role` key depuis le Dashboard :
```
Supabase Dashboard → Project Settings → API → service_role key
```

### 2. Token Hugging Face

Récupérer un token avec droits `write` :
```
https://huggingface.co/settings/tokens
```

## ⚡ Démarrage Rapide (1 Commande)

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# Configurer les clés
export SUPABASE_SERVICE_ROLE_KEY="eyJh..."
export HUGGINGFACE_TOKEN="hf_..."

# Tout automatiser !
./train_and_deploy_ml.sh
```

**Ce script va** :
1. Générer 5000 transactions synthétiques
2. Entraîner le modèle indépendant (18 features)
3. Tester le modèle avec 8 scénarios
4. Uploader sur Hugging Face

**Temps estimé** : 3-5 minutes

## 🔧 Démarrage Manuel (Étape par Étape)

### Étape 1 : Générer les Transactions

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

export SUPABASE_SERVICE_ROLE_KEY="eyJh..."

python3 generate_synthetic_transactions.py
```

**Résultat attendu** :
- 5000 transactions générées
- ~500 fraudes (10%)
- 150 utilisateurs
- Données insérées dans Supabase

### Étape 2 : Entraîner le Modèle

```bash
# Avec la même clé
python3 train_independent_model.py
```

**Résultat attendu** :
```
✅ Modèle sauvegardé: fraud_model_independent.pkl
✅ Scaler sauvegardé: scaler_independent.pkl
✅ Encoders sauvegardés: label_encoders_independent.pkl
✅ Métadonnées sauvegardées: model_metadata_independent.json
```

**Métriques attendues** :
- Accuracy : >95%
- AUC-ROC : >0.95
- Latency : <1ms
- Features : 18 (sans fraud_score)

### Étape 3 : Tester le Modèle

```bash
python3 test_ml_scenarios.py
```

**Vérifier** :
- Variance des scores ML > 1000 (bonne distinction)
- Corrélation ML vs Heuristique < 0.7 (complémentarité)
- Scores variés (pas seulement 0% ou 99%)

### Étape 4 : Upload sur Hugging Face

```bash
export HUGGINGFACE_TOKEN="hf_..."

python3 upload_to_huggingface.py
```

**Résultat** : Les 4 fichiers `*_independent.*` sont uploadés sur :
```
https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched
```

### Étape 5 : Mettre à Jour handler.py

Sur Hugging Face, éditer `handler.py` :

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

Commit et attendre le redéploiement (~2 min).

### Étape 6 : Mettre à Jour index.ts

Dans `/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection/index.ts` :

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
        Math.abs(executed.getTime() - created.getTime()) / 1000, // 4
        // ... reste inchangé (total 18 features)
    ]
}
```

**Important** : Retirer aussi la ligne de log si présente :
```typescript
// RETIRER
features.ml_features_sent = mlFeatures; // Les 19 features

// REMPLACER PAR
features.ml_features_sent = mlFeatures; // Les 18 features
```

### Étape 7 : Redéployer la Fonction

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app"

npx supabase functions deploy fraud-detection --no-verify-jwt
```

### Étape 8 : Tester en Production

Faire une transaction réelle et vérifier les logs :

```bash
npx supabase functions logs fraud-detection --tail
```

**Vérifier** :
- `[ML] Calling Hugging Face with 18 features` (au lieu de 19)
- Le ML score varie selon les transactions
- Le score final est bien mixé (60% heuristique + 40% ML)

## 🎯 Résultats Attendus

### Avant (Modèle avec fraud_score)

```
Transaction Normale 50 EPC    : ML 0%  → Final 6/100  🟢
Transaction Suspecte 1000 EPC : ML 0%  → Final 24/100 🟢 (devrait être 🟡)
Transaction Fraude 10000 EPC  : ML 99% → Final 96/100 🔴

Corrélation : 0.92 (trop élevée)
Variance : 2450 (binaire)
```

### Après (Modèle indépendant)

```
Transaction Normale 50 EPC    : ML 5%  → Final 8/100  🟢
Transaction Suspecte 1000 EPC : ML 45% → Final 42/100 🟡 ← AMÉLIORATION !
Transaction Fraude 10000 EPC  : ML 95% → Final 95/100 🔴

Corrélation : 0.65 (bonne complémentarité)
Variance : >1000 (nuancé)
```

**Le ML apporte maintenant une vraie valeur ajoutée !** 🎉

## 🐛 Résolution de Problèmes

### Erreur : "SUPABASE_SERVICE_ROLE_KEY non définie"

```bash
# Vérifier
echo $SUPABASE_SERVICE_ROLE_KEY

# Si vide, exporter
export SUPABASE_SERVICE_ROLE_KEY="ta_cle"
```

### Erreur : "HUGGINGFACE_TOKEN non configuré"

```bash
# Option 1 : Login interactif
huggingface-cli login

# Option 2 : Variable d'environnement
export HUGGINGFACE_TOKEN="hf_..."
```

### Erreur : "Pas assez de transactions"

Si vous avez < 100 transactions dans Supabase :

```bash
# Générer des synthétiques
python3 generate_synthetic_transactions.py
```

### Erreur : "Only one class present in y_true"

Le test set n'a qu'une seule classe (toutes fraudes ou toutes légitimes). C'est géré automatiquement dans le script, mais si vous voyez cette erreur :

- Soit il n'y a pas assez de données (générer plus)
- Soit le ratio de fraudes est déséquilibré

### Le modèle retourne toujours 0% ou 99%

Si le nouveau modèle est toujours binaire :

1. Vérifier que `fraud_score` a bien été RETIRÉ des features (18 au lieu de 19)
2. Vérifier que les logs Supabase montrent `18 features` et non `19`
3. Réentraîner avec plus de données variées

## 📊 Vérification Finale

Checklist avant mise en production :

- [ ] 5000 transactions générées dans Supabase
- [ ] Modèle entraîné avec Accuracy > 95%
- [ ] 4 fichiers `*_independent.*` uploadés sur Hugging Face
- [ ] `handler.py` mis à jour sur Hugging Face
- [ ] `index.ts` mis à jour (18 features, sans fraud_score)
- [ ] Fonction `fraud-detection` redéployée
- [ ] Tests avec transactions réelles OK
- [ ] Logs montrent ML actif avec 18 features
- [ ] Scores ML variés (pas seulement 0% ou 99%)
- [ ] Corrélation ML vs Heuristique < 0.75

## 🎓 Pour Aller Plus Loin

### Réentraînement Périodique

Après avoir collecté de vraies transactions :

```bash
# Attendre d'avoir 1000+ vraies transactions
# Puis réentraîner
export SUPABASE_SERVICE_ROLE_KEY="..."
python3 train_independent_model.py

# Le script détectera automatiquement qu'il y a assez de vraies données
# et les utilisera au lieu des synthétiques
```

### Ajuster le Poids ML

Dans `index.ts`, si le ML performe très bien :

```typescript
// Augmenter progressivement le poids du ML
riskScore = Math.round(heuristicScoreRaw * 0.5 + mlScore * 0.5) // 50/50
```

Ou si le ML est moins précis :

```typescript
// Réduire le poids du ML
riskScore = Math.round(heuristicScoreRaw * 0.8 + mlScore * 0.2) // 80/20
```

### Monitoring Continu

Créer un dashboard pour suivre :
- Taux de faux positifs/négatifs
- Distribution des scores ML
- Corrélation ML vs Heuristique
- Latence du modèle

## 📝 Notes

- **Données synthétiques** : Utiles pour POC, mais un modèle production nécessite des vraies transactions
- **18 features** : Le modèle n'utilise plus `fraud_score`, donc il est vraiment indépendant
- **Complémentarité** : L'objectif est que le ML détecte des patterns que l'heuristique rate
- **Évolution** : Le modèle s'améliorera avec plus de vraies transactions

## 🔗 Liens Utiles

- **Repository Hugging Face** : https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched
- **Supabase Dashboard** : https://supabase.com/dashboard/project/srvkyiugewdjrpvcmquq
- **Documentation Hugging Face Hub** : https://huggingface.co/docs/huggingface_hub
