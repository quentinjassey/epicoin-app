# Corrections du Système de Détection de Fraude
**Date**: 26 janvier 2026

## ✅ Corrections Appliquées

### 1. Interface Admin - Texte du Bouton
- ✅ Changé "Voir les détails complets (ML, Heuristique...)" → "Voir les détails complets"

### 2. Affichage Top-up
- ✅ Pour les top-ups, affiche maintenant "Utilisateur :" au lieu de "Expéditeur :"
- ✅ Ne montre plus "Destinataire :" pour les top-ups et achats

### 3. Bloc Features ML
- ✅ Retiré le bloc "Features ML (19 valeurs)" de la page de détails
- ✅ Ajouté un avertissement si le score ML est > 90

### 4. Ajustement des Seuils
- ✅ Ajouté une section "Ajuster le Seuil d'Acceptation" dans fraud-detail
- ✅ Permet à l'admin de comprendre les seuils actuels
- ✅ Bouton "Ajuster les Seuils" avec instructions

## ⚠️ Problème Identifié : Score ML à 99

### Cause Probable
Le score ML est systématiquement à 99/100 car :

1. **Features non normalisées** : Les features envoyées au modèle ne sont pas normalisées
   - Le modèle s'attend à des features normalisées (via `scaler.transform()`)
   - Actuellement, on envoie des valeurs brutes

2. **Décalage de distribution** : Le modèle a été entraîné sur des données synthétiques
   - Les distributions des features réelles sont différentes
   - Le modèle n'a jamais vu de vraies transactions

### Solutions Proposées

#### Solution 1 : Normaliser les Features (RECOMMANDÉ)
Le handler Hugging Face doit normaliser les features avant prédiction :

```python
# Dans handler.py - ligne 66
def __call__(self, data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        inputs = data.get("inputs", [])
        
        if isinstance(inputs, list) and len(inputs) > 0 and isinstance(inputs[0], list):
            inputs = inputs[0]
        
        # AJOUTER: Normaliser les features
        features = np.array([inputs])
        features_scaled = self.scaler.transform(features)  # ← IMPORTANT
        
        # Prédire avec features normalisées
        fraud_proba = self.model.predict_proba(features_scaled)[0][1]
        fraud_score = int(fraud_proba * 100)
        
        return {
            "fraud_score": fraud_score,
            "fraud_probability": float(fraud_proba),
            "is_fraud": fraud_score > 70
        }
```

**Action requise** : Mettre à jour `handler.py` sur Hugging Face

#### Solution 2 : Réentraîner avec Données Réelles
- Collecter 500-1000 vraies transactions
- Réentraîner le modèle avec ces données
- Redéployer sur Hugging Face

#### Solution 3 : Désactiver Temporairement le ML
Si les scores ML ne sont pas fiables, on peut :
- Augmenter le poids des règles heuristiques (80% règles, 20% ML)
- Ou utiliser uniquement les règles heuristiques (100% règles, 0% ML)

### Modification Temporaire Recommandée

En attendant la correction du modèle, modifier la pondération dans `fraud-detection/index.ts` :

```typescript
// Ligne 483 - Augmenter le poids des règles heuristiques
riskScore = Math.round(heuristicScoreRaw * 0.8 + mlScore * 0.2)  // 80% règles, 20% ML
features.ml_weight = 0.2
features.heuristic_weight = 0.8
```

## 📊 Seuils Actuels

| Seuil | Score | Action |
|-------|-------|--------|
| **Bas** | 0-30 | Acceptation automatique |
| **Moyen** | 31-70 | Revue manuelle (fonds réservés) |
| **Élevé** | 71-100 | Blocage automatique |

## 🔧 Pour Modifier les Seuils

Les seuils sont définis dans `supabase/functions/fraud-detection/index.ts` :

```typescript
const RISK_THRESHOLDS = {
    LOW: 30,      // 0-30: Approve automatiquement
    MEDIUM: 70,   // 31-70: Revue manuelle
    HIGH: 71      // 71-100: Bloquer automatiquement
}
```

Pour ajuster, modifier ces valeurs et redéployer l'Edge Function.

## 🎯 Prochaines Étapes

1. **Urgent** : Corriger la normalisation dans `handler.py` sur Hugging Face
2. **Court terme** : Ajuster la pondération (80/20) en attendant
3. **Moyen terme** : Réentraîner le modèle avec des vraies transactions
4. **Long terme** : Implémenter un système d'apprentissage continu
