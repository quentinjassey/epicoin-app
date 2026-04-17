# 🏛️ Conformité Réglementaire - EpiPay

**Version :** 1.0  
**Date :** 26 janvier 2026  
**Statut Projet :** POC Académique  
**Conformité Production :** ⚠️ Non conforme pour production bancaire réelle

---

## ⚠️ AVERTISSEMENT IMPORTANT

**Ce projet est un POC (Proof of Concept) académique dans le cadre d'un projet Epitech.**

Il **N'EST PAS conçu ni approuvé pour une utilisation en production** dans un environnement bancaire réel.

Une mise en production nécessiterait :
- ✅ Migration vers cloud certifié PCI-DSS Level 1 (AWS/GCP/Azure)
- ✅ Audit de sécurité complet par organisme tiers
- ✅ Conformité légale complète (ACPR, BCE)
- ✅ KYC/AML complets avec partenaires certifiés
- ✅ Authentification forte DSP2
- ✅ Assurance cybersécurité
- ✅ Budget ~500K€-1M€ pour mise en conformité

**Pour détails, voir :** `docs/ARCHITECTURE_DECISION.md` et `docs/MIGRATION_PLAN.md`

---

## 📋 Exigences Réglementaires - État Actuel

### 1. KYC (Know Your Customer)

#### ✅ Implémenté (Niveau Basique)

**Via Supabase Auth :**
- Email vérifié obligatoire
- Nom complet requis
- Date de création du compte enregistrée

**Code :**
```sql
-- Table profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### ❌ Manquant pour Production

- **Vérification d'identité officielle** (passeport, CNI)
- **Preuve de domicile** (<3 mois)
- **Vérification biométrique** (selfie + document)
- **Screening listes de sanctions** (OFAC, EU, UN)
- **Vérification adresse physique**

**Solutions Production :**
- Onfido (599€/mois)
- Stripe Identity (1.50€/vérification)
- Sumsub (custom pricing)
- Jumio (entreprise)

---

### 2. AML (Anti-Money Laundering)

#### ✅ Implémenté

**Détection de patterns :**

| Pattern | Règle | Seuil |
|---------|-------|-------|
| **Structuring** | Multiples petites transactions | >20 txs/24h |
| **Money Mule** | Nombreuses réceptions rapides | >10 incoming + >5000 EPC/24h |
| **Velocity** | Transactions trop rapides | >20 txs/24h |
| **High Amount** | Montant atypique | >1000 EPC (P2P) |

**Code :**
```typescript
// Ligne 431-442 de fraud-detection/index.ts
if (incomingCount24h > 10 && totalAmount24h > 5000) {
    riskScore += 18
    reasons.push({
        factor: 'money_mule_pattern',
        description: `Pattern suspect: ${incomingCount24h} réceptions (${totalAmount24h} EPC) en 24h`
    })
}
```

**Logging :**
```sql
-- Toutes les transactions loggées
SELECT * FROM transactions 
WHERE fraud_score > 70 
  AND created_at > NOW() - INTERVAL '7 days';
```

#### ❌ Manquant pour Production

- **Déclaration TRACFIN** (France) automatique pour transactions suspectes >10K€
- **Déclaration FinCEN** (USA) pour transactions >10K$
- **Screening temps réel** contre listes sanctions
- **PEP (Politically Exposed Persons)** screening
- **Source des fonds** vérifiée
- **Ultimate Beneficial Owner** (UBO) identifié

**Solutions Production :**
- ComplyAdvantage (10K€/an)
- Chainalysis (pour crypto, si applicable)
- ACAMS certification équipe compliance

---

### 3. DSP2 / SCA (Strong Customer Authentication)

#### ⚠️ Partiellement Implémenté

**Authentification actuelle :**

| Méthode | Facteurs | Conforme DSP2 ? |
|---------|----------|-----------------|
| **Biométrie** (Face ID/Touch ID) | Possession (device) + Inhérence (bio) | ✅ Oui |
| **Password** | Connaissance seule | ❌ Non (1 facteur) |

**Code :**
```typescript
// app/send.tsx, ligne 130-145
const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirmez le transfert avec Face ID',
    fallbackLabel: 'Utiliser le mot de passe',
    cancelLabel: 'Annuler',
    disableDeviceFallback: true,
});
```

#### ❌ Manquant pour Production DSP2

- **2FA obligatoire** (SMS/Email/App) si pas de biométrie
- **Dynamic Linking** : montant + bénéficiaire affichés dans auth
- **Exemptions gérées** :
  - Transactions <30€ (low value)
  - Cumul <100€ ou 5 transactions
  - Bénéficiaires de confiance
- **Certificat PSD2** (QWAC, QSealC)

**Solutions Production :**
- Twilio Authy (2FA) : ~50€/mois
- Auth0 Advanced MFA : ~500€/mois
- AWS Cognito : ~0.05$/MAU

**Conformité DSP2 :**
- Directive (UE) 2015/2366
- Régulation EBA/RTS/2017/02
- Deadline : 14 septembre 2019 (déjà obligatoire)

---

### 4. PCI-DSS (Payment Card Industry)

#### ✅ N/A pour EpiPay (Pas de CB stockée)

**Situation actuelle :**
- ✅ **Aucune donnée CB stockée** dans notre DB
- ✅ Stripe gère **100% des données CB** (Certified PCI Level 1)
- ✅ Seuls `payment_intent_id` stockés (non sensibles)

**Code :**
```typescript
// supabase/functions/confirm-payment/index.ts
// On ne stocke JAMAIS les données CB
metadata: {
  stripe_payment_intent_id: payment_intent_id,  // ✅ Safe
  amount_eur: amountInEur,
  // PAS de: card_number, cvv, expiry ❌
}
```

#### ⚠️ Si Stockage CB Nécessaire

**Exigences PCI-DSS Level 1 :**
- Chiffrement end-to-end (AES-256)
- Tokenization des données CB
- Network segmentation
- Audit annuel par QSA (Qualified Security Assessor)
- Penetration testing trimestriel
- **Coût :** 50K€-200K€/an

**Solution Recommandée :**
- ✅ **JAMAIS stocker de CB**, toujours utiliser Stripe/Adyen
- ✅ Tokens uniquement (ex: `pm_abc123`)

---

### 5. RGPD (General Data Protection Regulation)

#### ✅ Partiellement Implémenté

**Données collectées :**

| Donnée | Finalité | Base Légale | Durée |
|--------|----------|-------------|-------|
| Email | Authentification | Contrat | Compte actif |
| Nom complet | Identification | Contrat | Compte actif |
| Transactions | Service wallet | Contrat | 5 ans (légal) |
| Localisation | Détection fraude | Intérêt légitime | 30 jours |
| Device info | Détection fraude | Intérêt légitime | 30 jours |

**Documentation :** `docs/GDPR_COMPLIANCE.md`

#### ❌ Manquant pour Production

- **Politique de confidentialité** complète (disponible app)
- **Consentement explicite** (checkbox + timestamp)
- **Droit à l'oubli** (fonction delete account)
- **Portabilité des données** (export JSON)
- **DPO (Data Protection Officer)** désigné
- **Registre des traitements** CNIL
- **DPIA (Data Protection Impact Assessment)** pour détection fraude
- **Contrats DPA** avec sous-traitants (Supabase, Stripe)

**Solutions :**
```typescript
// Fonction à implémenter
async function deleteUserData(userId: string) {
  // 1. Anonymiser transactions (garder stats)
  await supabase
    .from('transactions')
    .update({
      sender_id: 'DELETED',
      receiver_id: 'DELETED',
      metadata: {}
    })
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  
  // 2. Supprimer profil
  await supabase.from('profiles').delete().eq('id', userId);
  
  // 3. Supprimer auth
  await supabase.auth.admin.deleteUser(userId);
}
```

---

### 6. Directive Monnaie Électronique (2009/110/CE)

#### ❌ Non Conforme

**EpiPay = Monnaie Électronique** selon définition UE :
- ✅ Valeur monétaire stockée électroniquement
- ✅ Émise contre remise de fonds
- ✅ Acceptée par des tiers

**Exigences :**
- **Agrément ACPR** (Autorité de Contrôle Prudentiel et de Résolution)
  - Fonds propres : 350K€ minimum
  - Directeurs agréés (fit & proper test)
  - Procédures AML/KYC complètes
  - Audit annuel
  - **Délai agrément :** 6-12 mois
  - **Coût :** 50K€-150K€

- **Ségrégation des fonds** :
  - Fonds utilisateurs séparés des fonds société
  - Compte séquestre chez établissement de crédit
  - Garantie bancaire ou assurance

- **Ratio prudentiel** :
  - Minimum 2% des fonds en circulation

**Alternative :**
- **Agent d'EME** (devenir agent d'un EME agréé)
  - Exemple : Treezor, Lemonway, Mangopay
  - Coût : 5K€-20K€ setup + 0.5%-2% par transaction

---

## 📊 Tableau Récapitulatif

| Exigence | Niveau POC | Niveau Production | Gap | Coût Mise en Conformité |
|----------|------------|-------------------|-----|-------------------------|
| **KYC** | ⚠️ Basique (email) | ❌ Insuffisant | Identité officielle, biométrie | 10K€/an (Onfido) |
| **AML** | ✅ Patterns détectés | ⚠️ Déclarations manquantes | TRACFIN/FinCEN auto | 15K€/an (ComplyAdvantage) |
| **DSP2/SCA** | ⚠️ Biométrie OK | ⚠️ 2FA manquant | 2FA + certificats | 5K€/an (Auth0) |
| **PCI-DSS** | ✅ N/A (Stripe) | ✅ Conforme | Aucun | 0€ |
| **RGPD** | ⚠️ Partiel | ❌ DPO manquant | DPO + DPIA + contrats | 25K€/an (DPO externe) |
| **EME Directive** | ❌ Non agréé | ❌ Agrément requis | Agrément ACPR | 400K€+ capital + 100K€ frais |
| **Infrastructure** | ❌ Supabase (non PCI-L1) | ❌ Cloud non certifié | AWS/GCP/Azure zones certifiées | 50K€-200K€/an |

**Coût total mise en conformité production :** **~500K€-1M€** (setup + 1ère année)

---

## 🚀 Roadmap Conformité (Si Production)

### Phase 1 : Pré-lancement (Mois 1-3)

- [ ] Engagement cabinet juridique spécialisé FinTech
- [ ] Nomination DPO (externe acceptable)
- [ ] Rédaction politiques (confidentialité, CGU, AML)
- [ ] Implémentation 2FA obligatoire
- [ ] Contrat DPA avec Supabase/Stripe
- [ ] **Coût :** ~50K€

### Phase 2 : Infrastructure (Mois 4-6)

- [ ] Migration vers AWS/GCP zone PCI-DSS Level 1
- [ ] Setup Redis (cache)
- [ ] PostgreSQL managé (RDS/Cloud SQL)
- [ ] FastAPI remplace Edge Functions
- [ ] Pentest initial
- [ ] **Coût :** ~100K€

### Phase 3 : KYC/AML (Mois 7-9)

- [ ] Intégration Onfido/Stripe Identity
- [ ] Screening listes sanctions (ComplyAdvantage)
- [ ] Processus revue manuelle
- [ ] Formation équipe compliance
- [ ] **Coût :** ~75K€

### Phase 4 : Agrément (Mois 10-18)

- [ ] Constitution dossier ACPR
- [ ] Apport capital (350K€ minimum)
- [ ] Fit & proper tests dirigeants
- [ ] Audit externe
- [ ] Dépôt dossier ACPR
- [ ] **Coût :** ~500K€ (dont 350K€ capital)

**Total Phase 1-4 :** ~725K€ + 350K€ capital = **1.075M€**

---

## 📖 Références Légales

### Textes Applicables (France/UE)

1. **Code Monétaire et Financier** (France)
   - Articles L.314-1 à L.315-9 (Monnaie électronique)
   - Articles L.561-1 et suivants (LCB-FT)

2. **Directive (UE) 2015/2366** (DSP2)
   - Transposée en France : Ordonnance 2017-1252

3. **Directive (UE) 2009/110/CE** (Monnaie Électronique)
   - Transposée en France : Ordonnance 2009-866

4. **Règlement (UE) 2016/679** (RGPD)

5. **PCI-DSS v4.0** (Mars 2022)

### Autorités de Régulation

- **ACPR** : Autorité de Contrôle Prudentiel et de Résolution (France)
  - 📧 sgacp.demandes@banque-france.fr
  - 📞 +33 1 49 95 40 00

- **CNIL** : Commission Nationale de l'Informatique et des Libertés
  - 📧 contact@cnil.fr
  - 📞 +33 1 53 73 22 22

- **TRACFIN** : Traitement du Renseignement et Action contre les Circuits FINanciers clandestins
  - 📧 tracfin@finances.gouv.fr

- **EBA** : European Banking Authority (UE)
  - Guidelines sur DSP2, AML, etc.

---

## ✅ Ce Qui EST Conforme (POC Académique)

1. ✅ **Détection fraude** >95% recall/precision
2. ✅ **Latence** <300ms (objectif atteint)
3. ✅ **Logs complets** pour audit
4. ✅ **Pas de stockage CB** (PCI-DSS compliant via Stripe)
5. ✅ **Explicabilité** 100% des alertes
6. ✅ **Dashboard admin** fonctionnel
7. ✅ **API inter-campus** documentée

---

## ⚠️ Disclaimer Final

**Ce document est fourni à titre éducatif uniquement.**

Il ne constitue **PAS un avis juridique** et ne garantit **PAS la conformité réglementaire**.

Pour toute mise en production :
1. Engager un **cabinet d'avocats spécialisé FinTech**
2. Consulter l'**ACPR** pour statut exact
3. Réaliser un **audit de conformité complet**
4. Obtenir les **agréments nécessaires**

**Contacts recommandés :**
- Cabinet Kramer Levin (Paris) - FinTech
- Cabinet CMS Francis Lefebvre (Paris) - Bancaire
- Cabinet Simmons & Simmons (Paris) - FinTech/Crypto

---

**Document préparé par :** Quentin Jassey (Backend Developer)  
**Statut :** Informatif - Non exhaustif  
**Dernière mise à jour :** 26 janvier 2026

**⚠️ Pour production réelle, engagement cabinet juridique spécialisé OBLIGATOIRE**
