# 🔒 Guide de Sécurité : Service Role Key

## ❓ C'est quoi la Service Role Key ?

La **Service Role Key** est une clé **super-admin** qui :
- ✅ Contourne TOUTES les règles de sécurité (RLS)
- ✅ Peut lire/écrire TOUTES les données
- ✅ Peut exécuter N'IMPORTE quelle opération
- ❌ Ne doit JAMAIS être exposée au public

## 🎯 Où l'utiliser (SÉCURISÉ)

### ✅ Edge Functions (Supabase)

Les Edge Functions s'exécutent **côté serveur** sur l'infrastructure Supabase. C'est sûr !

**Comment elle est stockée** :
```
Dashboard Supabase 
→ Edge Functions 
→ Configuration/Settings
→ Secrets
→ SUPABASE_SERVICE_ROLE_KEY
```

**Pourquoi c'est sûr** :
- ✅ S'exécute sur les serveurs Supabase (pas sur le téléphone)
- ✅ Jamais exposée au client
- ✅ Chiffrée au repos
- ✅ Accessible uniquement par le code serveur

### ✅ Backend / API privée

Si vous avez un backend Node.js/Python privé :
- Stockez-la dans les variables d'environnement serveur
- Jamais dans le code source
- Utilisez des secrets managers (AWS Secrets, etc.)

## ❌ Où NE JAMAIS l'utiliser

### ❌ Application mobile (frontend)

```typescript
// ❌ DANGEREUX - Ne faites JAMAIS ça !
const supabase = createClient(
  supabaseUrl,
  SERVICE_ROLE_KEY  // ← Toute personne peut extraire cette clé de l'app !
)
```

**Pourquoi c'est dangereux** :
- ⚠️ Le code JavaScript est visible dans l'app
- ⚠️ N'importe qui peut extraire la clé
- ⚠️ Accès total à votre base de données
- ⚠️ Possibilité de supprimer toutes vos données

### ❌ Variables EXPO_PUBLIC_*

```bash
# ❌ DANGEREUX - Ces variables sont exposées au client !
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...  # ← Accessible par le navigateur
```

### ❌ Code frontend (React, Vue, etc.)

```javascript
// ❌ DANGEREUX - Visible dans le bundle JavaScript
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5c..."
```

### ❌ Git / GitHub

```bash
# ❌ DANGEREUX - Visible par tout le monde
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

## ✅ Architecture Sécurisée (votre projet actuel)

Votre architecture est **parfaitement sécurisée** :

```
┌─────────────────────────────────────────────┐
│  📱 App Mobile (Client)                     │
├─────────────────────────────────────────────┤
│  • Utilise ANON_KEY (publique) ✅           │
│  • Authentification utilisateur ✅          │
│  • RLS protège les données ✅               │
└──────────────┬──────────────────────────────┘
               │
               │ Appelle
               ↓
┌─────────────────────────────────────────────┐
│  ☁️  Edge Functions (Serveur Supabase)     │
├─────────────────────────────────────────────┤
│  • confirm-payment                          │
│  • fraud-detection                          │
│  • Utilise SERVICE_ROLE_KEY ✅              │
│  • S'exécute côté serveur ✅                │
│  • Jamais exposée au client ✅              │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│  🗄️  Base de données Supabase              │
├─────────────────────────────────────────────┤
│  • RLS pour les clients ✅                  │
│  • Accès complet pour Edge Functions ✅     │
└─────────────────────────────────────────────┘
```

### Flux sécurisé d'un rechargement

1. **App mobile** : Utilise `ANON_KEY` + authentification utilisateur
   ```typescript
   supabase.functions.invoke('confirm-payment', { 
     body: { payment_intent_id } 
   })
   // ✅ ANON_KEY uniquement
   ```

2. **Edge Function `confirm-payment`** : Utilise `SERVICE_ROLE_KEY` côté serveur
   ```typescript
   const supabase = createClient(
     Deno.env.get('SUPABASE_URL'),
     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  // ✅ Sûr (côté serveur)
   )
   ```

3. **Edge Function `fraud-detection`** : Utilise aussi `SERVICE_ROLE_KEY`
   ```typescript
   // Accède à fraud_config sans RLS
   await supabase.rpc('get_fraud_config')  // ✅ Fonctionne grâce à SERVICE_ROLE_KEY
   ```

## 🧪 Tests locaux avec Service Role Key

### Option 1 : Tester dans l'app (RECOMMANDÉ)

**Pas besoin de service role key locale !**

```bash
npx expo start
# Testez directement le rechargement dans l'app
```

Les Edge Functions déployées utilisent déjà la service role key configurée sur Supabase.

### Option 2 : Script de test local (optionnel)

Si vous voulez tester `test_fraud_detection.sh` localement :

**Étape 1** : Ajouter la clé temporairement

```bash
./add_service_key_safely.sh
```

**Étape 2** : Tester

```bash
./test_fraud_detection.sh
```

**Étape 3** : SUPPRIMER la clé immédiatement

```bash
# Supprimer la ligne de .env
sed -i '' '/SUPABASE_SERVICE_ROLE_KEY/d' .env
```

**Étape 4** : Vérifier que Git ignore le fichier

```bash
git status
# .env ne devrait PAS apparaître dans les fichiers modifiés
```

## 🚨 Que faire si la clé est exposée ?

Si vous pensez que la service role key a été exposée :

1. **Régénérer immédiatement** :
   - Dashboard Supabase → Settings → API
   - Cliquez sur "Reset service_role key"
   - Copiez la nouvelle clé

2. **Mettre à jour les Edge Functions** :
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="nouvelle_cle"
   supabase functions deploy fraud-detection
   supabase functions deploy confirm-payment
   ```

3. **Vérifier les accès** :
   - Consultez les logs d'activité
   - Vérifiez qu'il n'y a pas eu d'accès non autorisé

## ✅ Bonnes pratiques

1. **Ne commitez JAMAIS** :
   - Service role key
   - Secrets Stripe
   - Mots de passe
   - Tokens API privés

2. **Utilisez des variables d'environnement** :
   - `.env` local (dans `.gitignore`)
   - Secrets Supabase pour Edge Functions
   - Variables d'environnement serveur

3. **Principe du moindre privilège** :
   - App mobile : `ANON_KEY` + RLS
   - Edge Functions : `SERVICE_ROLE_KEY` (nécessaire)
   - Backend privé : `SERVICE_ROLE_KEY` si besoin

4. **Rotation régulière** :
   - Changez la service role key tous les 6-12 mois
   - Ou immédiatement si compromission suspectée

## 📋 Checklist de sécurité

- [x] `.env` est dans `.gitignore`
- [x] Service role key n'est PAS dans `.env`
- [x] App mobile utilise seulement `ANON_KEY`
- [x] Edge Functions utilisent `SERVICE_ROLE_KEY` (sur Supabase)
- [x] RLS activé sur toutes les tables sensibles
- [ ] Rotation de clés planifiée (tous les 6 mois)

## 🎓 En résumé

| Clé | Où ? | Exposée au public ? | Permissions |
|-----|------|---------------------|-------------|
| **ANON_KEY** | App mobile (`.env`) | ✅ Oui (publique) | Limitées par RLS |
| **SERVICE_ROLE_KEY** | Edge Functions (Secrets Supabase) | ❌ Non (serveur uniquement) | Complètes (bypass RLS) |

**Votre configuration actuelle est parfaite !** 🎉

---

**Date** : 29 janvier 2026
