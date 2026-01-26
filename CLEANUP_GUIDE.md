# 🧹 Guide de Nettoyage du Projet

**Date** : 2026-01-23  
**Objectif** : Nettoyer les données et fichiers inutiles tout en préservant le système de production

---

## 📋 Analyse : Ce qui est Utile vs Inutile

### ✅ Edge Functions - TOUTES UTILES (À GARDER)

| Fonction | Statut | Utilité | Action |
|----------|--------|---------|--------|
| `create-payment-intent` | ✅ GARDER | Crée les paiements Stripe pour top-ups | ESSENTIELLE |
| `confirm-payment` | ✅ GARDER | Confirme les paiements + détection fraude | ESSENTIELLE |
| `fraud-detection` | ✅ GARDER | Détection fraude avec ML (Hugging Face) | ESSENTIELLE |
| `intercampus-receive` | ✅ GARDER | Reçoit les paiements entre campus | ESSENTIELLE |
| `intercampus-send` | ✅ GARDER | Envoie les paiements entre campus | ESSENTIELLE |

**Recommandation** : ✅ **NE RIEN SUPPRIMER** - Toutes les Edge Functions sont nécessaires.

---

### 🗑️ Données à Nettoyer

#### 1. Données Synthétiques d'Entraînement ML

| Type | Quantité | Action |
|------|----------|--------|
| Profils utilisateurs synthétiques | ~60 | ❌ SUPPRIMER |
| Transactions synthétiques | ~1200 | ❌ SUPPRIMER |
| Vraies transactions | Variable | ✅ GARDER |
| Vrais profils | Variable | ✅ GARDER |

**Critères d'identification :**
- **Profils synthétiques** : Email = `synthetic_*@test.epicoin.app`
- **Transactions synthétiques** : `metadata->>'synthetic' = 'true'`

---

### 📁 Fichiers à Nettoyer (Optionnel)

#### Fichiers de Développement ML (Après déploiement)

```
❌ À SUPPRIMER (après validation que le ML fonctionne) :
  
  /supabase/functions/fraud-detection/
  ├── ❌ fraud_model_enriched.pkl           (Déjà sur Hugging Face)
  ├── ❌ scaler_enriched.pkl                (Déjà sur Hugging Face)
  ├── ❌ label_encoders_enriched.pkl        (Déjà sur Hugging Face)
  ├── ❌ model_metadata_enriched.json       (Déjà sur Hugging Face)
  ├── ❌ synthetic_transactions.csv         (Données d'entraînement)
  ├── ❌ train_enriched_model.py            (Script d'entraînement)
  ├── ❌ upload_enriched_to_huggingface.py  (Script d'upload)
  └── ❌ generate_synthetic_transactions.py (Script de génération)

✅ À GARDER :
  └── ✅ index.ts                           (Edge Function - ESSENTIEL)
```

#### Fichiers de Documentation (Optionnel - Archiver)

```
📄 Documentation (à archiver dans un dossier /docs/archive/) :
  ├── FRAUD_DETECTION_DIAGNOSIS.md
  ├── FRAUD_DETECTION_SUMMARY.md
  ├── ML_ACTIVATION_FIX.md
  ├── APPLY_MANUALLY.sql, APPLY_MANUALLY_FIXED.sql, etc.
  └── DIAGNOSTIC_MIGRATION.sql

✅ À GARDER (documentation active) :
  ├── DEPLOYMENT_COMPLETE.md
  ├── ML_INTEGRATION_COMPLETE.md
  ├── SETUP_HUGGINGFACE.md
  └── README_FRAUD_DETECTION.md
```

---

## 🚀 Plan de Nettoyage Recommandé

### Étape 1 : Nettoyer les Données Synthétiques (PRIORITAIRE)

```bash
# 1. Allez sur Supabase SQL Editor
# https://supabase.com/dashboard/project/srvkyiugewdjrpvcmquq/sql/new

# 2. Ouvrez et exécutez ce fichier :
# /supabase/migrations/CLEANUP_SYNTHETIC_DATA.sql

# 3. Vérifiez le résumé dans les logs
```

**Ce script va :**
- ✅ Supprimer les 60 profils synthétiques (`synthetic_*@test.epicoin.app`)
- ✅ Supprimer les ~1200 transactions synthétiques
- ✅ Garder toutes les vraies données
- ✅ Afficher un résumé avant/après

**Résultat attendu :**

```
RÉSUMÉ AVANT NETTOYAGE
========================================
Profils synthétiques à supprimer: 60
Transactions synthétiques à supprimer: 1200
Profils réels à conserver: X
Transactions réelles à conserver: Y
========================================

RÉSUMÉ APRÈS NETTOYAGE
========================================
Profils restants: X
Transactions restantes: Y
========================================
✅ NETTOYAGE TERMINÉ AVEC SUCCÈS
```

---

### Étape 2 : Nettoyer les Fichiers Locaux (OPTIONNEL)

**⚠️ ATTENTION : Ne faites ceci QU'APRÈS avoir vérifié que le ML fonctionne correctement !**

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app"

# Supprimer les fichiers de modèle ML (déjà sur Hugging Face)
cd supabase/functions/fraud-detection
rm -f fraud_model_enriched.pkl
rm -f scaler_enriched.pkl
rm -f label_encoders_enriched.pkl
rm -f model_metadata_enriched.json
rm -f synthetic_transactions.csv

# Optionnel : Supprimer les scripts d'entraînement (garder pour référence)
# rm -f train_enriched_model.py
# rm -f upload_enriched_to_huggingface.py
# rm -f generate_synthetic_transactions.py
```

---

### Étape 3 : Archiver la Documentation (OPTIONNEL)

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app"

# Créer un dossier d'archive
mkdir -p docs/archive

# Déplacer les anciens docs
mv FRAUD_DETECTION_DIAGNOSIS.md docs/archive/
mv FRAUD_DETECTION_SUMMARY.md docs/archive/
mv ML_ACTIVATION_FIX.md docs/archive/
mv supabase/migrations/APPLY_MANUALLY*.sql docs/archive/
mv supabase/migrations/DIAGNOSTIC_MIGRATION.sql docs/archive/

# Garder les docs actifs à la racine
# - DEPLOYMENT_COMPLETE.md
# - ML_INTEGRATION_COMPLETE.md
# - SETUP_HUGGINGFACE.md
# - CLEANUP_GUIDE.md (ce fichier)
```

---

### Étape 4 : Nettoyer le Dossier fraud-ml-api (OPTIONNEL)

**Si vous n'utilisez PAS l'API FastAPI locale (vous utilisez Hugging Face) :**

```bash
# Option 1 : Supprimer complètement
rm -rf fraud-ml-api/

# Option 2 : Garder pour référence (recommandé)
# Laisser tel quel, utile pour tests locaux futurs
```

---

## ✅ Checklist de Nettoyage

### Nettoyage de Base (Recommandé)

- [ ] Exécuter `CLEANUP_SYNTHETIC_DATA.sql` dans Supabase
- [ ] Vérifier que les vraies données sont préservées
- [ ] Vérifier qu'il reste 0 profils synthétiques
- [ ] Vérifier qu'il reste 0 transactions synthétiques

### Nettoyage Avancé (Optionnel)

- [ ] Supprimer les fichiers `.pkl` locaux (modèle déjà sur HF)
- [ ] Supprimer `synthetic_transactions.csv`
- [ ] Archiver les anciens docs de diagnostic
- [ ] Supprimer ou archiver `fraud-ml-api/` (si non utilisé)

### Vérifications Post-Nettoyage

- [ ] L'app fonctionne toujours (top-up, P2P, achat)
- [ ] Le ML est toujours actif (vérifier les logs)
- [ ] Les vraies transactions sont toujours en base
- [ ] Aucune Edge Function n'a été supprimée par erreur

---

## 🧪 Tests Post-Nettoyage

### Test 1 : Vérifier la DB

```sql
-- Compter les transactions restantes
SELECT COUNT(*) as total_transactions FROM transactions;

-- Compter les profils restants
SELECT COUNT(*) as total_profiles FROM auth.users;

-- Vérifier qu'il ne reste aucune donnée synthétique
SELECT COUNT(*) as synthetic_transactions 
FROM transactions 
WHERE metadata->>'synthetic' = 'true';

SELECT COUNT(*) as synthetic_profiles 
FROM auth.users 
WHERE email LIKE 'synthetic_%@test.epicoin.app';
```

**Résultats attendus :**
- `synthetic_transactions` : 0
- `synthetic_profiles` : 0
- `total_transactions` : Vos vraies transactions uniquement
- `total_profiles` : Vos vrais utilisateurs uniquement

### Test 2 : Vérifier le ML

```bash
# Faire une transaction test
# Vérifier les logs
npx supabase functions logs fraud-detection --tail
```

Vous devriez toujours voir :
```
[ML] Calling Hugging Face with 19 features: 19
[ML] Hugging Face response: {"fraud_score":...}
```

---

## 📊 Bénéfices du Nettoyage

### Performances

- ✅ **DB plus légère** : Suppression de 1200+ transactions inutiles
- ✅ **Requêtes plus rapides** : Moins de données à scanner
- ✅ **Stockage optimisé** : ~1 MB récupéré

### Maintenance

- ✅ **Clarté** : Seules les vraies données en production
- ✅ **Sécurité** : Pas de comptes de test en production
- ✅ **Simplicité** : Moins de fichiers à maintenir

### Coûts

- ✅ **Stockage Supabase** : Réduit (gratuit jusqu'à 500 MB)
- ✅ **Pas d'impact** sur le ML (modèle sur Hugging Face)

---

## ⚠️ Ce qu'il NE FAUT PAS Faire

### ❌ NE PAS supprimer :

1. **Aucune Edge Function** → Toutes sont essentielles
2. **Les migrations SQL** → Nécessaires pour reproduire la structure DB
3. **`index.ts`** dans fraud-detection → C'est l'Edge Function elle-même !
4. **Les secrets Supabase** → HUGGINGFACE_API_KEY, HUGGINGFACE_MODEL_ID
5. **Le repo Hugging Face** → C'est là qu'est hébergé votre modèle ML

### ❌ NE PAS vider toute la DB :

- Gardez vos vraies transactions
- Gardez vos vrais utilisateurs
- Seules les données **synthétiques** doivent être supprimées

---

## 🎯 Recommandation Finale

### Plan Minimal (20 minutes)

**Faire maintenant :**
1. ✅ Exécuter `CLEANUP_SYNTHETIC_DATA.sql` (nettoyer la DB)
2. ✅ Tester une transaction (vérifier que tout fonctionne)

**Reporter à plus tard :**
- 📁 Nettoyage fichiers locaux (attendre 1 semaine de validation ML)
- 📄 Archivage documentation (pas urgent)

### Plan Complet (1 heure)

**Si vous voulez un projet ultra-propre :**
1. Nettoyer la DB
2. Supprimer les fichiers `.pkl` locaux
3. Archiver l'ancienne documentation
4. Supprimer `fraud-ml-api/` (si non utilisé)
5. Tester complètement l'app

---

## 📞 Questions Fréquentes

**Q: Si je supprime les fichiers `.pkl` locaux, le ML marchera toujours ?**  
R: ✅ OUI ! Le modèle est sur Hugging Face. Les fichiers locaux ne servent plus.

**Q: Puis-je réentraîner le modèle après le nettoyage ?**  
R: ✅ OUI ! Vous avez le script `train_enriched_model.py` et vous collecterez de vraies données.

**Q: Et si j'ai besoin des données synthétiques plus tard ?**  
R: Vous pouvez les régénérer avec `generate_synthetic_transactions.py`. Le script est conservé.

**Q: Le nettoyage peut-il casser quelque chose ?**  
R: ❌ NON, si vous suivez le plan. Le script SQL ne touche QUE aux données synthétiques.

---

## ✅ Résumé Exécutif

### Action Recommandée : NETTOYAGE MINIMAL

1. **Exécuter `CLEANUP_SYNTHETIC_DATA.sql`** → Nettoyer la DB (5 min)
2. **Tester une transaction** → Vérifier que tout marche (2 min)
3. **Laisser les fichiers locaux pour l'instant** → Garder pour référence

**Résultat** :
- ✅ DB propre (vraies données uniquement)
- ✅ ML toujours actif
- ✅ Toutes les Edge Functions opérationnelles
- ✅ Documentation de référence disponible

---

**Date de création** : 2026-01-23  
**Statut** : ✅ Prêt à exécuter  
**Prochaine étape** : Exécuter `CLEANUP_SYNTHETIC_DATA.sql`
