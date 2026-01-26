# Corrections Urgentes - Score ML à 0 et Logs
**Date**: 26 janvier 2026

## 🔴 Problème 1 : Score ML Systématiquement à 0

### Diagnostic

Le score ML est à 0 pour **toutes** les transactions, ce qui indique un problème avec le handler Hugging Face.

### Causes Possibles

1. **Handler.py pas mis à jour sur Hugging Face** ⚠️ PROBABLE
   - J'ai modifié `handler.py` localement pour ajouter `scaler.transform()`
   - MAIS ce fichier n'a **pas encore été uploadé** sur Hugging Face
   - L'ancien handler (sans normalisation) est toujours en ligne

2. **Problème avec le Scaler**
   - Le scaler uploadé ne correspond pas au modèle
   - Les features envoyées ont une distribution différente de l'entraînement

3. **Erreur Silencieuse**
   - Le handler retourne 0 en cas d'erreur
   - Les logs Hugging Face devraient montrer l'erreur

### Solution Immédiate

**ACTION REQUISE** : Uploader le nouveau `handler.py` sur Hugging Face

1. Aller sur https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched
2. Cliquer sur "Files and versions"
3. **Uploader le fichier** `supabase/functions/fraud-detection/handler.py`
4. Attendre le redémarrage de l'endpoint (~2-3 min)

### Vérification du Handler Actuel

Voici le handler.py CORRECT qui doit être sur Hugging Face :

```python
class EndpointHandler():
    def __init__(self, path=""):
        base_path = path if path else "."
        
        model_path = os.path.join(base_path, 'fraud_model_enriched.pkl')
        scaler_path = os.path.join(base_path, 'scaler_enriched.pkl')
        encoders_path = os.path.join(base_path, 'label_encoders_enriched.pkl')
        
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)
        
        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)
        
        with open(encoders_path, 'rb') as f:
            self.encoders = pickle.load(f)
    
    def __call__(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            inputs = data.get("inputs", [])
            
            if isinstance(inputs, list) and len(inputs) > 0 and isinstance(inputs[0], list):
                inputs = inputs[0]
            
            # ⚠️ IMPORTANT: Normaliser les features
            features = np.array([inputs])
            features_scaled = self.scaler.transform(features)  # ← CETTE LIGNE EST CRITIQUE
            
            # Prédire avec features normalisées
            fraud_proba = self.model.predict_proba(features_scaled)[0][1]
            fraud_score = int(fraud_proba * 100)
            
            print(f"🔍 Prédiction: proba={fraud_proba:.4f}, score={fraud_score}/100")
            
            return {
                "fraud_score": fraud_score,
                "fraud_probability": float(fraud_proba),
                "is_fraud": fraud_score > 70
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "fraud_score": 0,  # ← Retourne 0 en cas d'erreur
                "fraud_probability": 0.0,
                "is_fraud": False
            }
```

### Solution Alternative (Si le problème persiste)

Si après avoir uploadé le handler le problème continue, il y a peut-être un problème avec le modèle entraîné.

**Option 1** : Réentraîner le modèle sans normalisation

```python
# Dans train_enriched_model.py - ENLEVER la normalisation
# Ligne 170-171, remplacer:
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Par:
X_train_scaled = X_train
X_test_scaled = X_test
```

**Option 2** : Utiliser uniquement les règles heuristiques

Dans `fraud-detection/index.ts`, modifier la pondération :

```typescript
// Ligne 483 - Mettre 100% règles, 0% ML
riskScore = Math.round(heuristicScoreRaw * 1.0 + mlScore * 0.0)
features.ml_weight = 0.0
features.heuristic_weight = 1.0
```

---

## 🔴 Problème 2 : Logs Admin Routes

### Diagnostic

Les warnings `No route named "admin/index" exists` sont répétés des centaines de fois.

### Cause

Le serveur n'a **pas été redémarré** après la correction du `app/admin/_layout.tsx`.

### Solution

```bash
# 1. Arrêter le serveur (Ctrl+C)

# 2. Nettoyer le cache
rm -rf .expo/
rm -rf node_modules/.cache/

# 3. Redémarrer
npx expo start --clear

# 4. Ouvrir dans le simulateur
# Presser 'i' pour iOS
```

### Résultat Attendu

Après redémarrage :
- ✅ Plus de warnings admin routes
- ✅ Logs propres (< 50 lignes au lieu de 500+)
- ✅ Seulement quelques warnings SecureStore (normaux)

---

## 📊 Vérification Post-Corrections

### 1. Vérifier que le Handler est Bien Uploadé

Logs Hugging Face devraient montrer :
```
🔍 Prédiction: proba=0.1234, score=12/100
```

### 2. Tester une Transaction

Faire un achat de 500 EPC et vérifier :
- Score ML affiché dans l'alerte (si score > 30)
- Score ML dans l'historique admin
- Score ML dans les détails de transaction

**Scores attendus** :
- Transaction normale : ML entre 5-30
- Transaction suspecte : ML entre 40-70
- Transaction frauduleuse : ML entre 70-100

### 3. Vérifier les Logs

```
# Logs Supabase Edge Function
npx supabase functions logs fraud-detection

# Devrait montrer :
[ML] Scores - Heuristic: 25, ML: 18, Final: 22
```

---

## 🎯 Checklist de Correction

- [ ] **Uploader handler.py sur Hugging Face**
- [ ] Attendre le redémarrage de l'endpoint (2-3 min)
- [ ] **Redémarrer le serveur Expo** (avec --clear)
- [ ] Tester une transaction
- [ ] Vérifier les logs Hugging Face
- [ ] Vérifier les logs Edge Function
- [ ] Confirmer que le score ML n'est plus à 0

---

## 📝 Notes Importantes

1. **Le score ML à 0 est ANORMAL**
   - Même une transaction très sûre devrait avoir un score > 0
   - Un score strictement égal à 0 indique une erreur

2. **Les logs propres sont ESSENTIELS**
   - Permettent de débugger efficacement
   - Réduisent le bruit et trouvent les vraies erreurs

3. **Hugging Face nécessite un redémarrage**
   - Après upload de fichiers, l'endpoint redémarre automatiquement
   - Attendre 2-3 minutes avant de tester

---

## 🚀 Si Tout Fonctionne Après

Vous devriez voir :
- ✅ Scores ML variés (pas tous à 0)
- ✅ Badge ML actif dans l'historique admin
- ✅ Logs propres sans spam
- ✅ Détails ML corrects dans fraud-detail

**Si le problème persiste**, contactez-moi avec :
- Les logs Hugging Face de l'endpoint
- Les logs de la Edge Function `fraud-detection`
- Un exemple de transaction avec score ML à 0
