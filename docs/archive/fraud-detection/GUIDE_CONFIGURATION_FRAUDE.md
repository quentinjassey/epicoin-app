# Guide de Configuration du Système de Détection de Fraude

## Vue d'ensemble

Ce guide explique comment utiliser la nouvelle interface de configuration du système de détection de fraude d'EpiPay. Cette interface permet aux administrateurs de personnaliser les paramètres de détection en temps réel sans modification de code.

## Accès à l'interface

1. Connectez-vous avec un compte administrateur
2. Accédez au menu **Administration**
3. Sélectionnez **Configuration fraude**

## Paramètres configurables

### 1. Répartition des scores (ML vs Heuristique)

Le système de détection combine deux approches :
- **Machine Learning (ML)** : Modèle entraîné sur des données historiques
- **Règles Heuristiques** : Règles métier basées sur l'expertise

#### Configuration

Utilisez le curseur pour ajuster la répartition entre les deux approches :
- **Valeur par défaut** : 40% ML / 60% Heuristique
- **Plus de ML** : Meilleure détection des patterns complexes, moins explicable
- **Plus d'Heuristique** : Plus explicable, basé sur des règles compréhensibles

#### Recommandations

- **40% ML / 60% Heuristique** : Équilibre optimal pour la plupart des cas
- **30% ML / 70% Heuristique** : Si vous préférez plus d'explicabilité
- **50% ML / 50% Heuristique** : Pour maximiser la détection automatique

⚠️ **Important** : La somme des deux poids doit toujours être égale à 100%

### 2. Seuils de décision

Le système classe les transactions en trois catégories selon leur score de risque (0-100) :

#### Approbation automatique (Zone verte)
- **Plage** : 0 jusqu'au seuil d'approbation
- **Défaut** : 0-30
- **Comportement** : Transaction approuvée et exécutée immédiatement
- **Recommandation** : 20-40 selon votre tolérance au risque

#### Révision manuelle (Zone orange)
- **Plage** : Seuil d'approbation jusqu'au seuil de révision
- **Défaut** : 31-70
- **Comportement** : Transaction mise en attente pour examen administrateur
- **Recommandation** : Garder une plage suffisante (30-40 points) pour filtrer efficacement

#### Blocage automatique (Zone rouge)
- **Plage** : Au-dessus du seuil de révision
- **Défaut** : 71-100
- **Comportement** : Transaction bloquée automatiquement, alerte générée
- **Recommandation** : 70-80 selon votre politique de sécurité

#### Configuration des seuils

1. **Seuil d'approbation** : Ajustez avec le premier curseur
   - Plus bas = Plus restrictif (plus de révisions manuelles)
   - Plus haut = Plus permissif (moins de révisions)

2. **Seuil de révision** : Ajustez avec le second curseur
   - Plus bas = Plus de blocages automatiques
   - Plus haut = Plus de transactions en révision manuelle

⚠️ **Contrainte** : Le seuil d'approbation doit toujours être inférieur au seuil de révision

## Exemples de configurations

### Configuration Conservative (Sécurité maximale)
```
ML: 30% / Heuristique: 70%
Approbation: 20
Révision: 60
```
**Effet** : Moins de transactions approuvées automatiquement, plus de révisions manuelles

### Configuration Équilibrée (Recommandée)
```
ML: 40% / Heuristique: 60%
Approbation: 30
Révision: 70
```
**Effet** : Bon équilibre entre sécurité et fluidité

### Configuration Permissive (Fluidité maximale)
```
ML: 50% / Heuristique: 50%
Approbation: 40
Révision: 80
```
**Effet** : Plus de transactions approuvées automatiquement, moins d'intervention manuelle

## Impact des modifications

### Répartition ML/Heuristique

**Augmenter le poids ML** :
- ✅ Meilleure détection des fraudes sophistiquées
- ✅ S'adapte aux nouveaux patterns
- ❌ Moins explicable (boîte noire)
- ❌ Nécessite des données d'entraînement de qualité

**Augmenter le poids Heuristique** :
- ✅ Décisions explicables et traçables
- ✅ Contrôle total sur les règles
- ❌ Peut manquer des patterns complexes
- ❌ Nécessite mise à jour manuelle des règles

### Seuils de décision

**Baisser le seuil d'approbation** :
- ✅ Plus de sécurité
- ❌ Plus de travail manuel
- ❌ Expérience utilisateur dégradée (attentes)

**Augmenter le seuil d'approbation** :
- ✅ Meilleure expérience utilisateur
- ✅ Moins de travail manuel
- ❌ Plus de risque de fraude

**Baisser le seuil de révision** :
- ✅ Blocages automatiques plus fréquents
- ✅ Protection accrue
- ❌ Risque de faux positifs

**Augmenter le seuil de révision** :
- ✅ Moins de blocages automatiques
- ❌ Plus de fraudes potentielles à examiner manuellement

## Enregistrement des modifications

1. Ajustez les paramètres selon vos besoins
2. Cliquez sur **Enregistrer**
3. Les modifications sont appliquées **immédiatement** aux nouvelles transactions
4. Les transactions en cours ne sont pas affectées

## Réinitialisation

Pour revenir aux valeurs par défaut :
1. Cliquez sur **Réinitialiser**
2. Confirmez l'action
3. Les paramètres par défaut sont restaurés (mais pas encore sauvegardés)
4. Cliquez sur **Enregistrer** pour appliquer

## Affichage des statuts de transaction

### Page Historique
Toutes les transactions affichent maintenant leur statut :
- **Complété** : Badge vert
- **En attente** : Badge orange (révision manuelle nécessaire)
- **Échoué** : Badge rouge

### Page d'accueil (Activité Récente)
Le bloc "Activité Récente" affiche maintenant :
- Les 5 dernières transactions
- Le statut de chaque transaction avec des badges colorés
- Les informations contextuelles (bonus, remboursement, etc.)

## Monitoring et ajustement

### Indicateurs à surveiller

1. **Taux de révision manuelle** : Devrait être <20% des transactions
2. **Taux de faux positifs** : Transactions légitimes bloquées/en révision
3. **Temps de traitement** : Temps moyen de résolution des révisions manuelles
4. **Fraudes détectées** : Nombre et valeur des fraudes bloquées

### Ajustements recommandés

**Si trop de révisions manuelles** :
- Augmentez le seuil d'approbation de 5-10 points
- Ou augmentez le poids ML si le modèle est bien entraîné

**Si trop de fraudes passent** :
- Baissez le seuil d'approbation de 5-10 points
- Ou augmentez le poids heuristique pour plus de règles strictes

**Si trop de faux positifs** :
- Augmentez légèrement les deux seuils
- Vérifiez et ajustez les règles heuristiques dans le code

## Sécurité et permissions

- Seuls les administrateurs peuvent accéder à cette interface
- Toutes les modifications sont enregistrées avec l'ID de l'administrateur
- L'historique des modifications est conservé en base de données

## Support technique

Pour toute question ou problème :
1. Consultez les logs de la fonction `fraud-detection`
2. Vérifiez les métriques dans l'interface admin
3. Contactez l'équipe technique si nécessaire

## Base de données

### Table `fraud_config`

La configuration est stockée dans la table `fraud_config` :
```sql
- ml_weight: decimal (0-1)
- heuristic_weight: decimal (0-1)
- threshold_approve: integer (0-100)
- threshold_review: integer (0-100)
- updated_at: timestamp
- updated_by: uuid (admin ID)
```

### Fonctions disponibles

- `get_fraud_config()` : Récupère la configuration active
- `update_fraud_config(...)` : Met à jour la configuration (admin seulement)

## Migration

Pour appliquer la nouvelle table de configuration :

```bash
# Depuis le dossier racine du projet
supabase db push

# Ou appliquer manuellement la migration
psql -f supabase/migrations/20260126000003_fraud_config.sql
```

## Dépendances

Le projet nécessite maintenant :
```bash
npm install @react-native-community/slider
```

Cette dépendance est utilisée pour les curseurs de configuration dans l'interface.

---

**Dernière mise à jour** : 26 janvier 2026
