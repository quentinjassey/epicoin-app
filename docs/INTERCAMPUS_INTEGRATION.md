# EpiPay — Guide d'intégration intercampus

**Version :** 1.0  
**Base URL :** `https://srvkyiugewdjrpvcmquq.supabase.co/functions/v1`

Ce document explique comment connecter votre wallet EpiPay à celui d'un autre campus Epitech pour effectuer des transferts d'EpiCoins (EPC) entre institutions.

---

## Sommaire

1. [Principe de fonctionnement](#1-principe-de-fonctionnement)
2. [Setup initial — échange de credentials](#2-setup-initial--échange-de-credentials)
3. [Générer un wallet et ses clés API](#3-générer-un-wallet-et-ses-clés-api)
4. [Lookup utilisateur](#4-lookup-utilisateur)
5. [Recevoir un transfert](#5-recevoir-un-transfert)
6. [Envoyer un transfert](#6-envoyer-un-transfert)
7. [Codes de statut et erreurs](#7-codes-de-statut-et-erreurs)
8. [Exemples complets](#8-exemples-complets)

---

## 1. Principe de fonctionnement

Un échange intercampus implique **deux campus** qui ont préalablement échangé leurs credentials. Chaque campus expose deux endpoints publics :

```
POST /intercampus-receive   ← appelé par les campus partenaires
POST /lookup-user           ← résout un user_id à partir d'un email
```

L'authentification entre campus se fait via un **hash SHA-256 de clé API** (le champ `api_key`). Aucun JWT utilisateur n'est requis pour ces deux endpoints.

**Flux simplifié :**
```
Campus A (expéditeur)          Campus B (vous)
──────────────────────         ─────────────────
User initie un transfert
      │
      ▼
POST /intercampus-send ──────→ POST /intercampus-receive
(JWT user requis)               (api_key requis)
      │                               │
      │                         Crédite wallet B
      │                         Enregistre transaction
      ◄──────────────────────── { success: true, tx_id }
      │
Confirme à l'utilisateur
```

---

## 2. Setup initial — échange de credentials

### Principe fondamental : chaque campus a sa propre base de données

Chaque campus fait tourner son propre Supabase indépendant. Il n'y a **pas de base partagée**. Quand Campus B appelle l'endpoint `/intercampus-receive` de Campus A, la fonction s'exécute sur le serveur de Campus A et interroge **uniquement la base de Campus A**.

```
┌─────────────────────┐         ┌─────────────────────┐
│     CAMPUS A        │         │     CAMPUS B        │
│  (Supabase Paris)   │         │  (Supabase Lyon)    │
│                     │         │                     │
│  DB wallets :       │         │  DB wallets :       │
│  - son propre       │         │  - son propre       │
│    wallet           │         │    wallet           │
│  - wallet de B  ←──┼─────────┼── B s'y enregistre  │
│    (pour l'auth)    │  échange│    (son api_key_hash)│
│                     │  infos  │                     │
│  A s'enregistre ───┼─────────┼→ wallet de A        │
│  (son api_key_hash) │         │   (pour l'auth)     │
└─────────────────────┘         └─────────────────────┘
```

**La règle :** pour qu'un campus puisse T'envoyer de l'argent, il faut que son `api_key_hash` soit enregistré dans **ta propre base**. Chacun gère sa liste de campus autorisés indépendamment.

---

### Scénario : Campus B veut vous envoyer de l'EPC

**Étape 1 — Campus B vous communique :**

| Information | Exemple | Pourquoi |
|-------------|---------|----------|
| `campus_id` | `bordeaux` | Pour que vous l'identifiiez |
| `campus_name` | `Epitech Bordeaux` | Libellé dans vos transactions |
| `api_key_hash` | `46dc92...` | Pour que vous l'authentifiiez |

**Étape 2 — Vous exécutez dans votre propre Supabase SQL Editor :**

```sql
-- Dans VOTRE base (pas celle de B)
INSERT INTO public.wallets (campus_id, campus_name, api_key_hash, is_active, balance, country)
VALUES ('bordeaux', 'Epitech Bordeaux', '46dc92...', true, 0, 'FR');
```

**Étape 3 — Vous communiquez à Campus B :**

| Information | Exemple | Pourquoi |
|-------------|---------|----------|
| `wallet_id` | `a1b2c3d4-...` | La destination de ses transferts |
| `functions_url` | `https://votre-projet.supabase.co/functions/v1` | Où appeler |

Campus B peut maintenant appeler votre `/intercampus-receive`. Il n'a pas besoin de votre `api_key_hash`.

---

### Scénario : Vous voulez envoyer de l'EPC à Campus B

**Étape 1 — Campus B vous communique :**

| Information | Exemple | Pourquoi |
|-------------|---------|----------|
| `wallet_id` | `b2c3d4e5-...` | La destination de vos transferts |
| `functions_url` | `https://campus-b.supabase.co/functions/v1` | Où appeler |

**Étape 2 — Vous communiquez à Campus B :**

| Information | Exemple | Pourquoi |
|-------------|---------|----------|
| `campus_id` | `paris` | Pour qu'il vous identifie |
| `campus_name` | `Epitech Paris` | Libellé dans ses transactions |
| `api_key_hash` | `ec74fb...` | Pour qu'il vous authentifie |

**Étape 3 — Campus B exécute dans SA propre base :**

```sql
-- Dans LA BASE DE B (pas la vôtre)
INSERT INTO public.wallets (campus_id, campus_name, api_key_hash, is_active, balance, country)
VALUES ('paris', 'Epitech Paris', 'ec74fb...', true, 0, 'FR');
```

---

### Tableau récapitulatif

| Sens | Qui fait l'INSERT | Dans quelle base | Données insérées |
|------|-------------------|-----------------|-----------------|
| **B → vous** | **Vous** | Votre Supabase | `api_key_hash` de B |
| **Vous → B** | **Campus B** | Supabase de B | Votre `api_key_hash` |

> Ces informations ne changent pas dans le temps. L'échange se fait une seule fois.

---

## 3. Générer un wallet et ses clés API

Sur votre instance Supabase, exécutez cette fonction SQL **une seule fois** depuis le SQL Editor :

```sql
SELECT create_campus_wallet('paris', 'Epitech Paris', 'FR', 0);
```

**Réponse :**
```json
{
  "success": true,
  "wallet_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "campus_id": "paris",
  "campus_name": "Epitech Paris",
  "api_key": "epw_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "api_key_hash": "ec74fbebc17b937cbe8171997e628d0373d55f8d...",
  "warning": "Sauvegardez api_key maintenant — elle ne sera plus jamais affichée."
}
```

> **Important :** `api_key` (la clé brute) est affichée **une seule fois**. Stockez-la dans un gestionnaire de secrets. Seul `api_key_hash` est conservé en base.

**Ce que vous communiquez à vos partenaires :**
- `wallet_id` → ils l'utiliseront comme `source_wallet_id` dans leurs appels
- `api_key_hash` → ils l'utiliseront comme valeur du champ `api_key` pour s'authentifier
- `campus_id` → ils l'utiliseront comme `source_campus_id`
- Votre `functions_url` → `https://<votre-projet>.supabase.co/functions/v1`

---

## 4. Lookup utilisateur

Permet de résoudre l'`user_id` d'un utilisateur sur votre campus à partir de son email ou de son nom. Utile avant d'initier un transfert.

**Endpoint :** `POST /lookup-user`  
**Authentification :** `api_key` dans le body  
**JWT requis :** Non

### Requête

```http
POST https://<campus-cible>/functions/v1/lookup-user
Content-Type: application/json

{
  "api_key": "<votre api_key_hash>",
  "source_campus_id": "paris",
  "email": "alice.martin@epitech.eu"
}
```

Ou par nom + campus :

```http
{
  "api_key": "<votre api_key_hash>",
  "source_campus_id": "paris",
  "full_name": "Alice Martin",
  "campus": "Lyon"
}
```

### Réponse (succès)

```json
{
  "success": true,
  "user_id": "177be9b5-d687-41c1-863c-bfc94ac9f2ad",
  "full_name": "Alice Martin",
  "campus": "Lyon"
}
```

> Le solde de l'utilisateur n'est jamais retourné.

### Réponse (erreur)

```json
{
  "success": false,
  "status": "unauthorized",
  "message": "API key invalide"
}
```

---

## 5. Recevoir un transfert

Endpoint appelé automatiquement par le campus expéditeur. Vous n'avez pas à l'appeler vous-même, mais vous devez l'exposer pour recevoir des fonds.

**Endpoint :** `POST /intercampus-receive`  
**Authentification :** `api_key` dans le body  
**JWT requis :** Non

### Requête entrante (envoyée par le campus source)

```http
POST https://<votre-campus>/functions/v1/intercampus-receive
Content-Type: application/json

{
  "transaction_id": "uuid-unique-généré-par-la-source",
  "source_wallet_id": "uuid-wallet-campus-source",
  "destination_wallet_id": "uuid-votre-wallet",
  "amount": 100,
  "currency": "EPC",
  "initiator_user_id": "uuid-user-source",
  "api_key": "api_key_hash-du-campus-source",
  "source_campus_id": "paris",
  "enriched_data": {
    "country": "FR",
    "city": "Paris",
    "description": "Transfert pour événement inter-campus"
  }
}
```

### Réponses possibles

| `status` | `success` | Signification |
|----------|-----------|---------------|
| `completed` | `true` | Wallet crédité, transaction enregistrée |
| `pending_review` | `true` | Suspicion fraude modérée, en attente validation admin |
| `blocked` | `false` | Transaction bloquée, score fraude élevé |
| `unauthorized` | `false` | `api_key` invalide |
| `failed` | `false` | Wallet destination introuvable ou inactif |
| `error` | `false` | Erreur interne |

```json
{
  "success": true,
  "status": "completed",
  "message": "Transaction intercampus réussie",
  "transaction_id": "7a20e79a-ea76-4f8b-b453-90bf1cd98773",
  "new_balance": 5100,
  "fraud_score": 1
}
```

---

## 6. Envoyer un transfert

Appelé par un utilisateur connecté sur **votre** campus pour envoyer des EPC vers un autre campus.

**Endpoint :** `POST /intercampus-send`  
**Authentification :** Bearer JWT utilisateur  
**JWT requis :** Oui

### Requête

```http
POST https://<votre-campus>/functions/v1/intercampus-send
Authorization: Bearer <jwt-utilisateur>
Content-Type: application/json

{
  "source_wallet_id": "uuid-votre-wallet",
  "destination_wallet_id": "uuid-wallet-campus-cible",
  "destination_campus_api_url": "https://<campus-cible>/functions/v1",
  "amount": 100,
  "currency": "EPC",
  "description": "Transfert pour événement inter-campus",
  "enriched_data": {
    "country": "FR",
    "city": "Paris"
  }
}
```

### Réponse (succès)

```json
{
  "success": true,
  "status": "completed",
  "message": "Transfert intercampus réussi",
  "transaction_id": "uuid...",
  "destination_tx_id": "uuid...",
  "new_balance": 9900,
  "fraud_score": 2
}
```

---

## 7. Codes de statut et erreurs

### Statuts de transaction

| Statut | Description | Action recommandée |
|--------|-------------|-------------------|
| `completed` | Succès | Notifier l'utilisateur |
| `pending_review` | En attente validation admin | Notifier l'utilisateur d'attendre |
| `blocked` | Fraude détectée | Contacter le support |
| `failed` | Rejeté (solde, wallet inactif…) | Afficher le message d'erreur |
| `unauthorized` | API key invalide | Vérifier les credentials échangés |
| `error` | Erreur serveur | Réessayer ou contacter le support |

### Rollback automatique

Si le campus destinataire est injoignable ou rejette la transaction, le wallet source est **automatiquement recrédité**. La transaction est enregistrée avec `status: failed` et `reason_code: NETWORK_ERROR` ou `DEST_REJECTED`.

---

## 8. Exemples complets

### cURL — Vérifier un utilisateur avant transfert

```bash
curl -X POST https://srvkyiugewdjrpvcmquq.supabase.co/functions/v1/lookup-user \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "<votre-api_key_hash>",
    "source_campus_id": "paris",
    "email": "alice.martin@epitech.eu"
  }'
```

### cURL — Simuler une réception (test)

```bash
curl -X POST https://srvkyiugewdjrpvcmquq.supabase.co/functions/v1/intercampus-receive \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "test-'$(uuidgen)'",
    "source_wallet_id": "<uuid-wallet-source>",
    "destination_wallet_id": "<uuid-votre-wallet>",
    "amount": 10,
    "currency": "EPC",
    "initiator_user_id": "<uuid-user-source>",
    "api_key": "<api_key_hash-du-campus-source>",
    "source_campus_id": "<campus-id-source>",
    "enriched_data": {"country": "FR", "description": "Test"}
  }'
```

### Python — Intégration complète

```python
import requests

BASE_URL = "https://srvkyiugewdjrpvcmquq.supabase.co/functions/v1"
MY_API_KEY_HASH = "<votre-api_key_hash>"
MY_CAMPUS_ID = "paris"

def lookup_user(email: str, target_campus_base_url: str) -> dict:
    resp = requests.post(f"{target_campus_base_url}/lookup-user", json={
        "api_key": MY_API_KEY_HASH,
        "source_campus_id": MY_CAMPUS_ID,
        "email": email,
    })
    return resp.json()

def send_intercampus(
    user_jwt: str,
    source_wallet_id: str,
    destination_wallet_id: str,
    destination_url: str,
    amount: int,
    description: str = "",
) -> dict:
    resp = requests.post(f"{BASE_URL}/intercampus-send",
        headers={"Authorization": f"Bearer {user_jwt}"},
        json={
            "source_wallet_id": source_wallet_id,
            "destination_wallet_id": destination_wallet_id,
            "destination_campus_api_url": destination_url,
            "amount": amount,
            "currency": "EPC",
            "description": description,
        }
    )
    return resp.json()

# Exemple d'utilisation
user = lookup_user("alice@epitech.eu", "https://campus-lyon.supabase.co/functions/v1")
if user["success"]:
    result = send_intercampus(
        user_jwt="<jwt-utilisateur>",
        source_wallet_id="<uuid-wallet-paris>",
        destination_wallet_id="<uuid-wallet-lyon>",
        destination_url="https://campus-lyon.supabase.co/functions/v1",
        amount=100,
        description="Transfert Alice",
    )
    print(result)
```

### Node.js — Intégration complète

```javascript
const BASE_URL = "https://srvkyiugewdjrpvcmquq.supabase.co/functions/v1";
const MY_API_KEY_HASH = "<votre-api_key_hash>";
const MY_CAMPUS_ID = "paris";

async function lookupUser(email, targetBaseUrl) {
  const res = await fetch(`${targetBaseUrl}/lookup-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: MY_API_KEY_HASH,
      source_campus_id: MY_CAMPUS_ID,
      email,
    }),
  });
  return res.json();
}

async function sendIntercampus({ userJwt, sourceWalletId, destWalletId, destUrl, amount, description = "" }) {
  const res = await fetch(`${BASE_URL}/intercampus-send`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${userJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_wallet_id: sourceWalletId,
      destination_wallet_id: destWalletId,
      destination_campus_api_url: destUrl,
      amount,
      currency: "EPC",
      description,
    }),
  });
  return res.json();
}

// Exemple
const user = await lookupUser("alice@epitech.eu", "https://campus-lyon.supabase.co/functions/v1");
if (user.success) {
  const result = await sendIntercampus({
    userJwt: "<jwt-utilisateur>",
    sourceWalletId: "<uuid-wallet-paris>",
    destWalletId: "<uuid-wallet-lyon>",
    destUrl: "https://campus-lyon.supabase.co/functions/v1",
    amount: 100,
    description: "Transfert Alice",
  });
  console.log(result);
}
```

---

## Contact & support

Pour tout problème d'intégration : **dpo@epipay.epitech.digital**

Swagger complet disponible sur : `https://srvkyiugewdjrpvcmquq.supabase.co` → `docs/swagger.html`
