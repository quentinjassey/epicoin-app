# 📤 Instructions : Upload du Handler.py sur Hugging Face

## ✅ Ce Qui a Été Fait

1. ✅ **Modèle entraîné** : `fraud_model_independent.pkl` (18 features, sans fraud_score)
2. ✅ **Fichiers uploadés** sur Hugging Face :
   - `fraud_model_independent.pkl`
   - `scaler_independent.pkl`
   - `label_encoders_independent.pkl`
   - `model_metadata_independent.json`
3. ✅ **Edge Function déployée** : `index.ts` mis à jour (18 features)
4. ✅ **Handler.py mis à jour** localement

## 🎯 Reste à Faire : Upload du Handler.py

Le fichier `handler.py` a été mis à jour pour utiliser les nouveaux fichiers `*_independent.*`, mais il doit être uploadé sur Hugging Face.

### Option 1 : Upload via Interface Web (RECOMMANDÉ) 🌐

1. **Aller sur le repository Hugging Face** :
   ```
   https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/tree/main
   ```

2. **Cliquer sur `handler.py`** dans la liste des fichiers

3. **Cliquer sur l'icône d'édition** (✏️ en haut à droite)

4. **Remplacer tout le contenu** par celui du fichier local :
   ```
   /Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection/handler.py
   ```

5. **Commit message** :
   ```
   Update handler.py - Use independent model (18 features, no fraud_score)
   ```

6. **Cliquer sur "Commit changes to main"**

7. **Attendre le redéploiement** (~2 minutes)

### Option 2 : Upload via CLI 💻

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# Se connecter (si pas déjà fait)
huggingface-cli login

# Upload
huggingface-cli upload QuentinJassey/epicoin-fraud-detection-enriched \
    handler.py \
    --repo-type model \
    --commit-message "Update handler.py - Use independent model (18 features)"
```

### Option 3 : Upload via API Python 🐍

```bash
cd "/Users/quent/Documents/PGD 5/epicoin-app/supabase/functions/fraud-detection"

# Créer un script rapide
cat > upload_handler.py << 'EOF'
from huggingface_hub import HfApi, login
import os

# Login
token = os.getenv("HUGGINGFACE_TOKEN")
if token:
    login(token=token)
else:
    login()  # Interactif

# Upload
api = HfApi()
api.upload_file(
    path_or_fileobj="handler.py",
    path_in_repo="handler.py",
    repo_id="QuentinJassey/epicoin-fraud-detection-enriched",
    repo_type="model",
    commit_message="Update handler.py - Use independent model (18 features)"
)

print("✅ handler.py uploadé avec succès !")
EOF

# Lancer
python3 upload_handler.py
```

## 🧪 Test Après Upload

Une fois le `handler.py` uploadé et redéployé :

### 1. Faire une Transaction Test

```bash
# Dans l'app mobile ou via curl
```

### 2. Vérifier les Logs Supabase

```bash
npx supabase functions logs fraud-detection --tail
```

**Vérifier que vous voyez** :
```
[ML] Calling Hugging Face with 18 features (SANS fraud_score): 18
[ML Features] Détails (SANS fraud_score): { amount: 300, hour: 14, ... }
[ML] Hugging Face response: {"fraud_score":XX, ...}
```

**Points clés** :
- ✅ `18 features` au lieu de `19`
- ✅ Pas de `fraud_score_heuristic` dans les logs
- ✅ Le ML score varie selon les transactions (pas toujours 0% ou 99%)

### 3. Tester Différents Scénarios

| Transaction | Score Heuristique | Score ML Attendu | Score Final |
|-------------|-------------------|------------------|-------------|
| Top-up 50 EPC (normal) | 10-20 | 5-15 | 10-18 🟢 |
| Achat 300 EPC (moyen) | 30-40 | 20-30 | 26-36 🟡 |
| Transfert 1000 EPC (élevé) | 50-60 | 40-60 | 46-60 🟡 |
| Fraude 10000 EPC | 90-95 | 80-95 | 86-95 🔴 |

**Si le ML retourne toujours 0.001** → Le handler.py n'a pas été mis à jour correctement.

## 📊 Monitoring

### Vérifier que le Nouveau Modèle est Actif

Les logs devraient montrer :
```json
{
  "ml_active": true,
  "ml_model_endpoint": "Dedicated Endpoint",
  "ml_model_id": "QuentinJassey/epicoin-fraud-detection-enriched",
  "ml_features_sent": [300, 14, 1, 0, ...], // 18 valeurs
  "heuristic_score_raw": 30,
  "ml_score": 15,  // ← Devrait varier !
  "final_score": 24,
  "ml_weight": 0.4,
  "heuristic_weight": 0.6
}
```

### Si le ML Score Ne Varie Pas

1. **Vérifier que handler.py a été uploadé** :
   ```
   https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/blob/main/handler.py
   ```
   
   Doit contenir :
   ```python
   model_path = os.path.join(base_path, 'fraud_model_independent.pkl')
   ```

2. **Vérifier le redéploiement** :
   - Aller sur https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/deployments
   - Vérifier qu'il y a un nouveau déploiement récent
   - Status = "Running"

3. **Forcer un redéploiement** (si nécessaire) :
   - Dashboard HuggingFace → Settings → Redeploy

## 🎯 Checklist Finale

Avant de considérer le déploiement complet :

- [ ] `handler.py` uploadé sur Hugging Face
- [ ] Redéploiement du modèle terminé (status "Running")
- [ ] Edge Function déployée (`index.ts` mis à jour)
- [ ] Transaction test effectuée
- [ ] Logs montrent `18 features` (pas `19`)
- [ ] ML score varie selon les transactions
- [ ] Score final mixte correctement (60/40)
- [ ] Aucune erreur dans les logs

## 🚀 Une Fois Tout Validé

Le système est maintenant :
- ✅ **Indépendant** : ML n'est plus biaisé par fraud_score
- ✅ **Complémentaire** : Apporte une vraie valeur ajoutée
- ✅ **Nuancé** : Scores variés (pas binaire)
- ✅ **Production-ready** : Latence <1ms, métriques validées

**Prochaines étapes** (optionnel, post-livraison) :
1. Collecter 1000+ vraies transactions
2. Réentraîner avec vraies données
3. Ajuster les poids ML si nécessaire (40% → 50%)
4. Monitoring continu des métriques

## 📝 Liens Utiles

- **Repository** : https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched
- **Fichiers** : https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/tree/main
- **Deployments** : https://huggingface.co/QuentinJassey/epicoin-fraud-detection-enriched/deployments
- **Logs Supabase** : https://supabase.com/dashboard/project/srvkyiugewdjrpvcmquq/functions/fraud-detection/logs
