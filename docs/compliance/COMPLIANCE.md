# Documentation Conformité Réglementaire - EpiPay

**Date**: 20 janvier 2026  
**Statut Projet**: POC Académique  
**Version**: 1.0  
**Prochaine Révision**: Juin 2026

---

## ⚠️ Avertissement Important

**EpiPay est actuellement un POC académique** développé dans le cadre d'un projet éducatif à Epitech Digital. Ce document décrit :
1. L'état actuel de conformité (limité, adapté au POC)
2. Les exigences pour une production bancaire réelle (non implémentées actuellement)
3. La roadmap de mise en conformité si passage en production

**Ce document NE certifie PAS que EpiPay est conforme aux réglementations bancaires.**

---

## Table des Matières

1. [KYC - Know Your Customer](#1-kyc---know-your-customer)
2. [AML - Anti-Money Laundering](#2-aml---anti-money-laundering)
3. [DSP2 - Directive Services de Paiement 2](#3-dsp2---directive-services-de-paiement-2)
4. [PCI-DSS - Payment Card Industry](#4-pci-dss---payment-card-industry)
5. [RGPD - Règlement Général sur la Protection des Données](#5-rgpd---règlement-général-sur-la-protection-des-données)
6. [Matrice de Conformité](#6-matrice-de-conformité)
7. [Roadmap de Mise en Conformité](#7-roadmap-de-mise-en-conformité)

---

## 1. KYC - Know Your Customer

### 1.1 Qu'est-ce que le KYC ?

Le **KYC (Know Your Customer)** est l'ensemble des processus permettant d'identifier et de vérifier l'identité des clients. Obligatoire pour tout service financier en Europe depuis la directive **4AMLD** (4ème directive anti-blanchiment).

### 1.2 État Actuel (POC)

| Exigence | Implémenté | Détails |
|----------|-----------|---------|
| **Vérification identité** | ❌ Partiel | Email + Nom uniquement (Supabase Auth) |
| **Documents officiels** | ❌ Non | Pas de scan passeport/CNI |
| **Vérification adresse** | ❌ Non | Pas de justificatif domicile |
| **Vérification téléphone** | ❌ Non | Pas de SMS OTP |
| **Selfie/Liveness** | ❌ Non | Pas de détection usurpation identité |
| **Stockage sécurisé** | ⚠️ Basique | Supabase PostgreSQL (non chiffré spécifiquement) |
| **Conservation 5 ans** | ❌ Non | Pas de politique rétention documentée |

**Résumé POC** : Authentification basique suffisante pour projet académique, **inadaptée pour production bancaire**.

### 1.3 Exigences Production

#### Niveau 1 : KYC Simplifié (faibles montants)
**Applicable si** : Solde max 250€ ET transactions max 100€/mois

- ✅ Nom complet + Date naissance
- ✅ Email vérifié
- ✅ Numéro téléphone vérifié (SMS OTP)
- ✅ Adresse postale déclarative

**Fournisseurs recommandés** : Intégration maison possible

#### Niveau 2 : KYC Standard (usage normal)
**Applicable si** : Solde jusqu'à 1000€ ET transactions 500€/mois

Niveau 1 **+**
- ✅ Scan pièce identité (CNI, passeport, titre séjour)
- ✅ Extraction automatique données (OCR)
- ✅ Vérification authenticité document (holograms, MRZ)
- ✅ Selfie utilisateur + détection liveness (anti-spoofing)
- ✅ Matching visage document ↔ selfie

**Fournisseurs recommandés** :
- [Onfido](https://onfido.com/) : 2-5€ par vérification, API REST, 95% précision
- [Jumio](https://www.jumio.com/) : 3-7€ par vérification, support 200+ pays
- [Veriff](https://www.veriff.com/) : 2-4€ par vérification, temps réel <6 min

#### Niveau 3 : KYC Renforcé (montants élevés)
**Applicable si** : Solde >1000€ OU transactions >500€/mois

Niveau 2 **+**
- ✅ Justificatif domicile (<3 mois) : facture, relevé bancaire
- ✅ Vérification registres publics (SIREN/SIRET pour entreprises)
- ✅ Screening listes sanctions (voir section AML)
- ✅ Source de fonds : justifier origine argent si montants élevés
- ✅ Entretien vidéo si transactions >10k€/mois

**Fournisseurs recommandés** : Onfido Premium, Jumio Identity Verification

### 1.4 Implémentation Technique Recommandée

#### Architecture KYC

```typescript
// Workflow KYC type (à implémenter en production)
interface KYCVerification {
  userId: string;
  level: 'simplified' | 'standard' | 'enhanced';
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  
  // Documents
  documents: {
    idCard?: {
      frontImageUrl: string;
      backImageUrl?: string;
      extractedData: {
        firstName: string;
        lastName: string;
        dateOfBirth: Date;
        documentNumber: string;
        expiryDate: Date;
        nationality: string;
      };
      verificationScore: number; // 0-100
    };
    selfie?: {
      imageUrl: string;
      livenessScore: number; // 0-100
      faceMatchScore: number; // 0-100 (match avec idCard)
    };
    proofOfAddress?: {
      imageUrl: string;
      documentType: 'utility_bill' | 'bank_statement' | 'tax_notice';
      issueDate: Date;
      address: string;
    };
  };
  
  // Résultat
  checks: {
    documentAuthentic: boolean;
    faceMatch: boolean;
    livenessDetected: boolean;
    addressVerified: boolean;
    sanctionsScreening: boolean;
  };
  
  rejectionReason?: string;
}
```

#### Intégration Onfido (Exemple)

```typescript
// Exemple d'intégration (non implémenté dans POC)
import { Applicant, OnfidoClient } from '@onfido/api';

async function createKYCVerification(userId: string) {
  const onfido = new OnfidoClient({
    apiToken: process.env.ONFIDO_API_TOKEN
  });
  
  // 1. Créer applicant
  const applicant = await onfido.applicant.create({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email
  });
  
  // 2. Générer SDK token pour frontend
  const sdkToken = await onfido.sdkToken.generate({
    applicantId: applicant.id,
    referrer: 'https://epipay.app/*'
  });
  
  // 3. Frontend utilise Onfido SDK pour capture documents + selfie
  // (React Native: @onfido/react-native-sdk)
  
  // 4. Créer check (vérification automatique)
  const check = await onfido.check.create({
    applicantId: applicant.id,
    reportNames: ['document', 'facial_similarity_photo', 'watchlist_standard']
  });
  
  // 5. Webhook reçoit résultat
  // GET /onfido-webhook avec résultat check
  
  return { applicantId: applicant.id, sdkToken, checkId: check.id };
}
```

### 1.5 Obligations Légales

#### Conservation Documents
- **Durée** : 5 ans minimum après fin relation client (obligation légale France)
- **Format** : PDF ou image haute qualité (300 DPI minimum)
- **Chiffrement** : AES-256 au repos, TLS 1.3 en transit
- **Accès** : Logs d'accès conservés 3 ans

#### Mise à Jour KYC
- **Périodicité** : Révision tous les 3 ans minimum
- **Changements** : Mise à jour si changement adresse, nom, situation
- **Transactions élevées** : Re-vérification si montant inhabituel détecté

#### Droit d'Accès Client
- Client peut demander copie documents sous 1 mois (RGPD)
- Client peut contester rejet KYC (processus appel documenté)

---

## 2. AML - Anti-Money Laundering

### 2.1 Qu'est-ce que l'AML ?

L'**AML (Anti-Money Laundering)** vise à détecter et prévenir le blanchiment d'argent et le financement du terrorisme. Régi par les directives européennes **4AMLD** et **5AMLD**, et en France par l'ordonnance Tracfin.

### 2.2 État Actuel (POC)

| Exigence | Implémenté | Détails |
|----------|-----------|---------|
| **Détection montants élevés** | ✅ Partiel | Seuil basique >1000 EPC dans transferts |
| **Screening sanctions** | ❌ Non | Pas de vérification listes OFAC/EU/UN |
| **Détection structuration** | ❌ Non | Pas de détection smurfing |
| **Monitoring patterns** | ❌ Non | Pas d'analyse comportementale |
| **Déclarations TRACFIN** | ❌ Non | Aucun processus déclaratif |
| **Formation personnel** | ❌ Non | Pas de formation AML |
| **Compliance Officer** | ❌ Non | Pas de responsable conformité |

**Résumé POC** : Détection fraude basique présente, **totalement insuffisant pour AML légal**.

### 2.3 Exigences Production

#### 2.3.1 Screening Listes de Sanctions

**Obligation** : Vérifier chaque client contre listes sanctions internationales

**Listes obligatoires** :
- **OFAC** (Office of Foreign Assets Control, USA) : ~6000 entités
- **UN Sanctions** (Nations Unies) : Terrorisme, prolifération
- **EU Sanctions** (Union Européenne) : Personnes/entités sanctionnées
- **HMT** (UK Treasury) : Liste britannique
- **Listes nationales** : Gel des avoirs France (DGFIP)

**Fréquence** :
- ✅ Lors inscription client (KYC)
- ✅ Avant chaque transaction >1000€
- ✅ Vérification continue (quotidienne) des clients existants

**Fournisseurs recommandés** :
- [ComplyAdvantage](https://complyadvantage.com/) : ~1000€/mois + 0.10€ par check, API temps réel
- [Dow Jones Risk & Compliance](https://www.dowjones.com/professional/risk/) : ~2000€/mois, base données exhaustive
- [Refinitiv World-Check](https://www.refinitiv.com/en/products/world-check-kyc-screening) : Leader marché, pricing sur devis

#### 2.3.2 Détection de Structuration (Smurfing)

**Définition** : Fractionner montants élevés en multiples petites transactions pour éviter seuils détection.

**Exemples à détecter** :
- Utilisateur A envoie 10 x 90€ à utilisateur B en 2h (au lieu de 1 x 900€)
- Utilisateur B reçoit 50€ de 20 personnes différentes le même jour
- Pattern répétitif : Tous les lundis, transferts 95€ (juste sous seuil 100€)

**Règles de détection** :

```typescript
// Règles AML à implémenter
interface AMLRule {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
}

const AML_RULES: AMLRule[] = [
  {
    id: 'SMURFING_AMOUNT',
    name: 'Structuration par montant',
    description: 'Multiples transactions juste sous seuil (ex: 9 x 99€)',
    riskLevel: 'high',
    threshold: 80 // Score de risque
  },
  {
    id: 'SMURFING_FREQUENCY',
    name: 'Fréquence anormale',
    description: '>5 transactions identiques en 24h',
    riskLevel: 'high',
    threshold: 85
  },
  {
    id: 'ROUND_ROBIN',
    name: 'Circulation circulaire',
    description: 'A→B→C→A (retour à l\'expéditeur)',
    riskLevel: 'critical',
    threshold: 95
  },
  {
    id: 'SUDDEN_VOLUME',
    name: 'Volume soudain',
    description: 'Volume x10 par rapport à historique',
    riskLevel: 'medium',
    threshold: 70
  },
  {
    id: 'DORMANT_ACTIVATION',
    name: 'Compte dormant réactivé',
    description: 'Inactif >6 mois puis grosse transaction',
    riskLevel: 'medium',
    threshold: 65
  }
];
```

#### 2.3.3 Seuils de Déclaration TRACFIN (France)

**Obligation légale** : Déclarer transactions suspectes à TRACFIN (Traitement du Renseignement et Action contre les Circuits FINanciers clandestins)

**Seuils automatiques** :
- **10 000€** : Déclaration obligatoire pour transactions en espèces
- **1 000€** : Surveillance renforcée recommandée
- **Pas de seuil minimum** : Si suspicion, déclaration obligatoire quel que soit montant

**Critères de suspicion** :
- Client refuse de fournir informations KYC
- Source de fonds incohérente avec profil (étudiant avec 50k€)
- Transactions incompatibles avec activité déclarée
- Tentatives multiples de contourner contrôles
- Géographie à risque (pays sous sanctions)

**Processus déclaratif** :
1. Détection transaction suspecte (automatique ou manuelle)
2. Enquête interne (Compliance Officer)
3. Déclaration TRACFIN sous **24-48h** via ERMES (plateforme dédiée)
4. **Interdiction d'informer le client** (secret professionnel)
5. Conservation dossier 5 ans

**Pénalités non-respect** :
- Amende jusqu'à **5 millions €** (entreprise)
- Amende jusqu'à **750 000€** + 5 ans prison (dirigeant)

#### 2.3.4 Monitoring Transactionnel

**Approche recommandée** : Système de scoring continu

```typescript
// Score AML par transaction
interface AMLScore {
  transactionId: string;
  overallScore: number; // 0-100 (100 = risque maximal)
  
  factors: {
    amountRisk: number; // Montant inhabituel
    frequencyRisk: number; // Fréquence anormale
    geographyRisk: number; // Pays à risque
    networkRisk: number; // Relations suspectes (graphe)
    behaviorRisk: number; // Déviation pattern habituel
    sanctionsRisk: number; // Match listes sanctions
  };
  
  triggeredRules: string[]; // IDs règles déclenchées
  actionRequired: 'none' | 'review' | 'block' | 'report_tracfin';
}

// Seuils décision
const AML_THRESHOLDS = {
  LOW: 30, // 0-30: Vert, pas d'action
  MEDIUM: 60, // 31-60: Orange, revue manuelle sous 48h
  HIGH: 80, // 61-80: Rouge, bloquer + revue urgente
  CRITICAL: 81 // 81-100: Bloquer + déclaration TRACFIN immédiate
};
```

### 2.4 Implémentation Technique Recommandée

#### Architecture AML

```
┌─────────────────┐
│   Transaction   │
│     Event       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AML Engine     │
│  - Règles       │◄─── Listes sanctions (quotidiennes)
│  - ML Model     │◄─── Historique transactions
│  - Graph DB     │◄─── Réseau utilisateurs
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │ Score  │
    │ 0-100  │
    └───┬────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
[0-30]   [31-100]
 AUTO    REVIEW/BLOCK
```

#### Intégration ComplyAdvantage (Exemple)

```typescript
// Exemple screening sanctions (non implémenté dans POC)
import axios from 'axios';

async function screenSanctions(user: { firstName: string; lastName: string; dateOfBirth: Date; country: string }) {
  const response = await axios.post(
    'https://api.complyadvantage.com/searches',
    {
      search_term: `${user.firstName} ${user.lastName}`,
      fuzziness: 0.8,
      filters: {
        types: ['sanction', 'warning', 'fitness-probity'],
        birth_year: user.dateOfBirth.getFullYear()
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.COMPLYADVANTAGE_API_KEY}`
      }
    }
  );
  
  const matches = response.data.content.data.matches;
  
  if (matches.length > 0) {
    // Match trouvé sur liste sanctions !
    return {
      isMatch: true,
      riskLevel: matches[0].match_types[0], // 'sanction', 'pep', 'warning'
      matchScore: matches[0].score, // 0-100
      details: matches[0]
    };
  }
  
  return { isMatch: false, riskLevel: 'none', matchScore: 0 };
}
```

### 2.5 Obligations Organisationnelles

#### Compliance Officer (Responsable Conformité)
- **Obligatoire** : Entreprise >50 employés OU volume transactions >1M€/an
- **Rôle** : Superviser AML, relations TRACFIN, formation personnel
- **Profil** : Formation juridique/finance, certification ACAMS (Certified AML Specialist)

#### Formation Personnel
- **Fréquence** : Annuelle obligatoire
- **Contenu** : Reconnaître signaux, processus déclaration, pénalités
- **Traçabilité** : Registre formations conservé 5 ans

#### Audit Interne
- **Fréquence** : Annuel minimum
- **Externe** : Audit par cabinet indépendant tous les 2-3 ans
- **Rapport** : Conservation 5 ans, disponible pour ACPR/TRACFIN

---

## 3. DSP2 - Directive Services de Paiement 2

### 3.1 Qu'est-ce que la DSP2 ?

La **DSP2 (Payment Services Directive 2)** est la directive européenne régissant les services de paiement. Entrée en vigueur en janvier 2018, elle impose notamment la **SCA (Strong Customer Authentication)**.

### 3.2 État Actuel (POC)

| Exigence | Implémenté | Détails |
|----------|-----------|---------|
| **SCA (2 facteurs)** | ⚠️ Partiel | Biométrie locale (Face ID) uniquement |
| **Authentification dynamique** | ❌ Non | Pas de code unique par transaction |
| **Gestion exemptions** | ❌ Non | Pas de logique faibles montants |
| **API PSD2** | ❌ Non | Pas d'interface comptes bancaires |
| **Agrément PSP** | ❌ Non | Pas de statut Prestataire Services Paiement |

**Résumé POC** : Authentification biométrique locale présente, **insuffisant pour DSP2 complète**.

### 3.3 Exigences Production

#### 3.3.1 SCA - Strong Customer Authentication

**Principe** : Au moins **2 facteurs parmi 3 catégories** :

1. **Connaissance** (ce que l'utilisateur sait)
   - Mot de passe
   - Code PIN
   - Question secrète

2. **Possession** (ce que l'utilisateur possède)
   - Téléphone mobile (SMS OTP, push notification)
   - Token hardware (Yubikey)
   - Carte bancaire

3. **Inhérence** (ce que l'utilisateur est)
   - Empreinte digitale
   - Face ID / reconnaissance faciale
   - Reconnaissance vocale

**Exemple conforme** : Mot de passe (connaissance) + Face ID (inhérence)

**Implémentation actuelle EpiPay** :
- ✅ Face ID (inhérence) pour accès app
- ❌ Manque 2ème facteur pour transactions (connaissance ou possession)

**Amélioration requise** :
```typescript
// Workflow SCA type
async function authenticateTransaction(transaction: Transaction) {
  // Facteur 1 : Session active (mot de passe déjà validé)
  if (!user.isAuthenticated) {
    throw new Error('Session expirée');
  }
  
  // Facteur 2 : Biométrie OU SMS OTP selon config user
  if (user.has BiometricsEnabled) {
    const biometricResult = await LocalAuthentication.authenticateAsync({
      promptMessage: `Confirmer transfert ${transaction.amount} EPC`,
      fallbackLabel: 'Utiliser PIN'
    });
    
    if (!biometricResult.success) {
      throw new Error('Authentification échouée');
    }
  } else {
    // Fallback: SMS OTP
    const otpCode = await sendSMS OTP(user.phoneNumber);
    const userInput = await promptUserForOTP();
    
    if (userInput !== otpCode) {
      throw new Error('Code OTP invalide');
    }
  }
  
  // Facteur 3 (optionnel si montant élevé) : Confirmation email
  if (transaction.amount > 1000) {
    await sendConfirmationEmail(transaction);
  }
}
```

#### 3.3.2 Exemptions SCA

**Cas où SCA peut être allégée** (sous conditions strictes) :

| Exemption | Condition | Implémentation |
|-----------|-----------|----------------|
| **Faibles montants** | <30€ ET volume cumulé <100€ ou <5 transactions depuis dernière SCA | Compteur local + serveur |
| **Bénéficiaire de confiance** | User a ajouté destinataire en liste blanche (après SCA initiale) | Table `trusted_recipients` |
| **Analyse risque** | Score fraude faible (<10/100) ET historique clean | Intégration moteur ML |
| **Paiement récurrent** | Abonnement avec montant fixe (1ère fois SCA, puis exemption) | Métadata `subscription_id` |

**Important** : Exemptions ≠ pas d'authentification. Toujours avoir session active (mot de passe).

#### 3.3.3 Authentification Dynamique (Dynamic Linking)

**Obligation** : Pour paiements, lier authentification aux détails transaction

**Mauvaise pratique** :
```
Authentifiez-vous pour continuer
[Face ID] ← Pas de détails transaction visibles
```

**Bonne pratique** :
```
Confirmer le transfert suivant :
Montant : 150,00 EPC
Destinataire : marie.dupont@epitech.eu
Date : 20/01/2026 15:32

[Confirmer avec Face ID]
```

**Implémentation** :
- Afficher montant + destinataire AVANT authentification
- Hash (montant + destinataire + timestamp) inclus dans challenge biométrique
- Serveur vérifie que hash reçu correspond à transaction

#### 3.3.4 Agrément PSP (Prestataire Services de Paiement)

**Si EpiPay gère de l'argent réel**, agrément ACPR requis :

**Types agrément** :
- **Établissement de Paiement (EP)** : Gestion comptes paiement, virements
  - Capital minimum : **125 000€**
  - Délai obtention : 6-12 mois
  
- **Établissement de Monnaie Électronique (EME)** : Émission monnaie électronique
  - Capital minimum : **350 000€**
  - Délai obtention : 9-18 mois

**Alternative** : Partenariat avec PSP agréé (Treezor, Swan, Lemonway)
- Pas besoin agrément direct
- Ils gèrent : KYC, AML, comptes, conformité
- Vous gérez : UX, features métier
- **Recommandé pour startups**

### 3.4 Implémentation Technique Recommandée

#### Middleware SCA

```typescript
// Middleware Express pour forcer SCA
function requireSCA(exemptionRules: ExemptionRule[] = []) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId, transactionAmount, recipientId } = req.body;
    
    // Vérifier si exemption applicable
    const isExempt = await checkExemptions(userId, transactionAmount, recipientId, exemptionRules);
    
    if (isExempt) {
      req.scaRequired = false;
      return next();
    }
    
    // SCA requis
    const scaToken = req.headers['x-sca-token'];
    
    if (!scaToken) {
      return res.status(403).json({
        error: 'SCA_REQUIRED',
        message: 'Authentification forte requise',
        scaChallengeId: await generateSCAChallenge(userId)
      });
    }
    
    // Valider token SCA
    const isValid = await validateSCAToken(scaToken, userId);
    
    if (!isValid) {
      return res.status(403).json({
        error: 'SCA_INVALID',
        message: 'Authentification échouée'
      });
    }
    
    req.scaRequired = true;
    req.scaValidated = true;
    next();
  };
}

// Utilisation
app.post('/api/transfer', requireSCA(['low_amount', 'trusted_recipient']), transferHandler);
```

---

## 4. PCI-DSS - Payment Card Industry

### 4.1 Qu'est-ce que PCI-DSS ?

Le **PCI-DSS (Payment Card Industry Data Security Standard)** est un ensemble de normes de sécurité pour protéger les données des cartes bancaires. Obligatoire pour tout acteur manipulant des cartes de paiement.

### 4.2 État Actuel (POC)

| Exigence | Implémenté | Détails |
|----------|-----------|---------|
| **Pas de stockage données carte** | ✅ OUI | Stripe gère 100% des cartes |
| **Chiffrement transit** | ✅ OUI | HTTPS/TLS 1.3 |
| **Chiffrement repos** | ⚠️ Partiel | Supabase chiffre, mais pas certifié PCI |
| **Logs sécurisés** | ❌ Non | Logs basiques non chiffrés |
| **Tests pénétration** | ❌ Non | Jamais réalisé |
| **Audits trimestriels** | ❌ Non | Pas d'audits |

**Résumé POC** : Grâce à Stripe (certifié PCI Level 1), aucune donnée carte stockée côté EpiPay. **Conformité passive acceptable pour POC**.

### 4.3 Exigences Production

#### 4.3.1 Niveaux PCI-DSS

**Classification selon volume transactions** :

| Niveau | Volume Transactions/An | Exigences |
|--------|------------------------|-----------|
| **Level 1** | >6 millions | Audit externe annuel + scan trimestriel + pentest |
| **Level 2** | 1-6 millions | Auto-évaluation annuelle (SAQ) + scan trimestriel |
| **Level 3** | 20k-1 million | Auto-évaluation annuelle (SAQ) + scan trimestriel |
| **Level 4** | <20k | Auto-évaluation annuelle (SAQ) |

**EpiPay POC** : Level 4 (quelques centaines transactions/an)

#### 4.3.2 Stratégie EpiPay : Délégation Totale à Stripe

**✅ Approche recommandée** : **SAQ A** (simplest level)

**Conditions SAQ A** :
- ✅ Aucune donnée carte stockée, traitée ou transmise par nos serveurs
- ✅ Redirection totale vers Stripe pour saisie carte
- ✅ Utilisation Stripe Elements (iframe isolé) ou Stripe Mobile SDK
- ✅ Serveurs EpiPay jamais en contact avec PAN (Primary Account Number)

**Implémentation actuelle** :
```typescript
// ✅ CONFORME : Stripe gère tout
// Frontend : app/top-up.tsx
const { error } = await stripe.confirmPayment({
  elements, // Stripe Elements
  confirmParams: {
    return_url: 'https://epipay.app/payment-success'
  }
});

// Backend : supabase/functions/create-payment-intent/index.ts
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount * 100,
  currency: 'eur',
  // ✅ Aucune donnée carte manipulée côté backend
});
```

**❌ À NE JAMAIS FAIRE** :
```typescript
// ❌ INTERDIT : Stocker données carte
const cardNumber = req.body.cardNumber; // PAN
const cvv = req.body.cvv;
const expiryDate = req.body.expiryDate;

// Même pour logger ou transiter, c'est INTERDIT
await db.insert({ cardNumber, cvv }); // ❌ Violation PCI-DSS
```

#### 4.3.3 Exigences Complémentaires (même avec Stripe)

**Malgré délégation Stripe, certaines exigences restent** :

1. **Chiffrement au repos**
   - Données sensibles (même non-carte) : AES-256
   - EpiPay : Soldes, transactions → chiffrement PostgreSQL

2. **Chiffrement en transit**
   - ✅ TLS 1.3 minimum
   - ✅ Certificats valides (Let's Encrypt)
   - ❌ Désactiver TLS 1.0 / 1.1 (vulnérables)

3. **Logs sécurisés**
   - Masquer données sensibles : emails partiels (m***@epitech.eu)
   - Chiffrer logs si contiennent infos personnelles
   - Rétention 1 an minimum, destruction sécurisée après

4. **Contrôle d'accès**
   - Principe du moindre privilège
   - MFA pour accès admin/serveurs
   - Révocation accès sous 24h (départs employés)

5. **Scans vulnérabilités**
   - Trimestriel minimum
   - Outils : Qualys, Rapid7, Nessus
   - Correction vulnérabilités critiques <30 jours

6. **Tests pénétration**
   - Annuel minimum
   - Après changements majeurs infrastructure
   - Par société indépendante (PASSI/CREST certifiée)

### 4.4 Auto-Évaluation SAQ A (Production)

**Questionnaire à compléter annuellement** : ~20 questions

Extraits clés :
- ✅ Q1 : "Acceptez-vous uniquement les cartes via redirection Stripe ?" → OUI
- ✅ Q2 : "Aucun système PAN(cardholder data) stocké ?" → OUI
- ✅ Q3 : "HTTPS pour toutes pages paiement ?" → OUI
- ✅ Q4 : "Scans vulnérabilités trimestriels ?" → À implémenter production

**Soumission** : Via portail Stripe Connect (ils gèrent validation)

---

## 5. RGPD - Règlement Général sur la Protection des Données

### 5.1 Qu'est-ce que le RGPD ?

Le **RGPD (General Data Protection Regulation)** est le règlement européen protégeant les données personnelles. Applicable depuis mai 2018, il impose des obligations strictes à tout traitement de données de résidents UE.

### 5.2 État Actuel (POC)

| Exigence | Implémenté | Détails |
|----------|-----------|---------|
| **Consentement explicite** | ❌ Non | Pas de bannière cookies/CGU |
| **Droit d'accès** | ⚠️ Partiel | User peut voir profil, mais pas exporter |
| **Droit à l'oubli** | ❌ Non | Pas de fonction suppression compte |
| **Portabilité données** | ❌ Non | Pas d'export JSON/CSV |
| **Minimisation données** | ✅ Partiel | Collecte limitée (email, nom, solde) |
| **Chiffrement** | ⚠️ Basique | Supabase chiffre, mais pas E2E |
| **DPO** | ❌ Non | Pas de Data Protection Officer |
| **Registre traitements** | ❌ Non | Non documenté |
| **Notification violations** | ❌ Non | Pas de processus |

**Résumé POC** : Conformité RGPD minimale, **insuffisant pour production**.

### 5.3 Exigences Production

#### 5.3.1 Bases Légales du Traitement

**RGPD exige une base légale pour chaque traitement** :

| Donnée | Base Légale | Justification |
|--------|-------------|---------------|
| **Email + Nom** | Consentement | Inscription volontaire |
| **Solde + Transactions** | Contrat | Nécessaire pour service paiement |
| **Adresse IP + Logs** | Intérêt légitime | Sécurité et prévention fraude |
| **Documents KYC** | Obligation légale | AML/KYC requis par loi |
| **Données marketing** | Consentement | Opt-in explicite requis |

#### 5.3.2 Droits des Utilisateurs

**Implémentations requises** :

##### Droit d'Accès (Article 15)
- User peut demander copie de toutes ses données
- Délai réponse : **1 mois maximum**
- Format : Lisible (PDF ou JSON)

```typescript
// API à créer
app.get('/api/user/data-export', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  
  const userData = {
    profile: await db.profiles.findOne({ id: userId }),
    transactions: await db.transactions.find({ 
      $or: [{ sender_id: userId }, { receiver_id: userId }]
    }),
    kycDocuments: await db.kyc.find({ user_id: userId }),
    loginHistory: await db.logs.find({ user_id: userId, event: 'login' })
  };
  
  res.json(userData);
});
```

##### Droit à l'Oubli (Article 17)
- User peut demander suppression compte
- Exceptions : Obligations légales (conservation 5 ans KYC/transactions)
- Anonymisation si suppression impossible

```typescript
// API à créer
app.delete('/api/user/account', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  
  // 1. Anonymiser données (conservation légale)
  await db.transactions.updateMany(
    { sender_id: userId },
    { sender_email: 'deleted@anonymized.local' }
  );
  
  // 2. Supprimer données non-légales
  await db.profiles.delete({ id: userId });
  await db.logs.delete({ user_id: userId });
  
  // 3. Conserver KYC 5 ans (obligation AML)
  await db.kyc.update(
    { user_id: userId },
    { status: 'deleted_retained_legal', retention_until: addYears(new Date(), 5) }
  );
  
  res.json({ message: 'Compte supprimé' });
});
```

##### Droit de Rectification (Article 16)
- User peut corriger données inexactes
- Implémentation : Formulaire édition profil

##### Droit à la Portabilité (Article 20)
- Export données format machine-readable (JSON, CSV)
- Délai : 1 mois maximum

##### Droit d'Opposition (Article 21)
- User peut refuser marketing
- Implémentation : Checkbox opt-out emails

#### 5.3.3 Consentement

**Exigences** :
- ✅ **Explicite** : Checkbox non pré-cochée
- ✅ **Granulaire** : Séparer consentements (analytique vs marketing)
- ✅ **Révocable** : Aussi facile de retirer que de donner
- ✅ **Tracé** : Conserver preuve consentement (timestamp, IP)

**Implémentation** :
```typescript
// Table consentements
interface Consent {
  userId: string;
  type: 'terms_of_service' | 'privacy_policy' | 'marketing_emails' | 'analytics';
  granted: boolean;
  grantedAt: Date;
  revokedAt?: Date;
  ipAddress: string;
  userAgent: string;
}
```

**Interface** :
```
☐ J'accepte les Conditions Générales d'Utilisation (obligatoire)
☐ J'accepte la Politique de Confidentialité (obligatoire)
☐ J'accepte de recevoir des emails marketing (optionnel)
☐ J'accepte les cookies analytiques (optionnel)
```

#### 5.3.4 DPO (Data Protection Officer)

**Obligatoire si** :
- Organisme public
- >250 employés
- Traitement sensible à grande échelle (données santé, biométrie)

**EpiPay POC** : Pas obligatoire (petite équipe)  
**EpiPay Production** : Recommandé dès 50 users (bonnes pratiques)

**Rôle DPO** :
- Conseiller sur conformité RGPD
- Point de contact CNIL
- Superviser audits et DPIAs (études d'impact)
- Formation équipe

**Solution startup** : DPO externalisé (500-1000€/mois selon volume)

#### 5.3.5 Notification Violations

**Obligation** : Notifier CNIL sous **72h** si violation données

**Exemples violations** :
- Hack base données (emails/mots de passe exposés)
- Perte backup non chiffré
- Accès non autorisé par employé

**Processus** :
1. Détection violation (monitoring, alerte)
2. Évaluation risque pour users
3. Si risque élevé : Notification CNIL <72h + Users concernés
4. Documentation : Nature violation, données impactées, mesures prises

**Pénalités** :
- Jusqu'à **20 millions €** OU **4% CA mondial** (le plus élevé)
- Exemples : Google (50M€), Amazon (746M€), Meta (1.2Md€)

#### 5.3.6 Privacy by Design

**Principe** : Intégrer protection données dès conception

**Mesures EpiPay** :
- ✅ Chiffrement par défaut (TLS, AES-256)
- ✅ Minimisation données (collecter strict nécessaire)
- ✅ Pseudonymisation logs (masquer emails)
- ✅ Segmentation accès (admins ≠ devs)
- ⚠️ À ajouter : E2E encryption (optionnel, complexe)

---

## 6. Matrice de Conformité

### 6.1 Vue d'Ensemble

| Réglementation | POC Actuel | Production Requise | Priorité |
|----------------|------------|---------------------|----------|
| **KYC** | ❌ 20% | ✅ 100% (Onfido Standard) | 🔴 Critique |
| **AML** | ⚠️ 15% | ✅ 100% (Sanctions + Monitoring) | 🔴 Critique |
| **DSP2** | ⚠️ 40% | ✅ 100% (SCA complet) | 🔴 Critique |
| **PCI-DSS** | ✅ 80% | ✅ 95% (SAQ A + scans) | 🟡 Moyen |
| **RGPD** | ⚠️ 35% | ✅ 100% (Droits users + DPO) | 🔴 Critique |

### 6.2 Checklist Détaillée

#### KYC
- [x] Email vérifié (POC)
- [ ] Téléphone vérifié (SMS OTP)
- [ ] Scan pièce identité (OCR)
- [ ] Selfie + liveness detection
- [ ] Vérification adresse
- [ ] Conservation 5 ans
- [ ] Mise à jour tous les 3 ans

#### AML
- [x] Détection montants élevés basique (POC)
- [ ] Screening listes sanctions (OFAC, EU, UN)
- [ ] Détection structuration (smurfing)
- [ ] Monitoring comportemental continu
- [ ] Processus déclaration TRACFIN
- [ ] Formation équipe AML
- [ ] Compliance Officer nommé
- [ ] Audit annuel

#### DSP2
- [x] Biométrie locale (POC)
- [ ] SCA 2 facteurs systématique
- [ ] Gestion exemptions (faibles montants)
- [ ] Authentification dynamique (dynamic linking)
- [ ] Liste bénéficiaires de confiance
- [ ] Agrément PSP (ou partenariat)

#### PCI-DSS
- [x] Pas de stockage données carte (Stripe)
- [x] HTTPS/TLS 1.3
- [ ] Chiffrement logs sensibles
- [ ] Scans vulnérabilités trimestriels
- [ ] Tests pénétration annuels
- [ ] SAQ A soumis annuellement

#### RGPD
- [x] Minimisation données (POC)
- [ ] Consentement explicite (CGU/Cookies)
- [ ] Droit d'accès (export données)
- [ ] Droit à l'oubli (suppression compte)
- [ ] Portabilité données (JSON export)
- [ ] Notification violations <72h
- [ ] DPO nommé (si requis)
- [ ] Registre traitements
- [ ] DPIA (étude d'impact) si risque élevé

---

## 7. Roadmap de Mise en Conformité

### Phase 1 : POC Académique (Actuel) ✅
**Durée** : Terminé  
**Conformité** : 20-40% selon domaines  
**Acceptable pour** : Projet académique, volume faible, montants symboliques

### Phase 2 : MVP Pilote (6 mois)
**Budget** : 25-35k€  
**Objectifs conformité** :
- ✅ KYC Simplifié (email + téléphone vérifié)
- ✅ RGPD Basique (droits users, consentements)
- ✅ SCA Complet (2 facteurs)
- ⚠️ AML Intermédiaire (règles + sanctions basiques)
- ✅ PCI-DSS SAQ A (scans vulnérabilités)

**Conformité** : 60-70%  
**Acceptable pour** : Pilote restreint (100-500 users), montants limités (<500€)

### Phase 3 : Production Complète (12-18 mois)
**Budget** : 100-150k€  
**Objectifs conformité** :
- ✅ KYC Standard (Onfido, documents officiels)
- ✅ AML Complet (ComplyAdvantage, monitoring ML, TRACFIN)
- ✅ DSP2 Certifié (agrément ou partenariat PSP)
- ✅ PCI-DSS Level 2-3 (audits)
- ✅ RGPD Total (DPO, DPIA, processus violations)

**Conformité** : 95-100%  
**Acceptable pour** : Production publique, volumes élevés, montants illimités

---

## 8. Ressources et Contacts

### Autorités de Régulation (France)

- **ACPR** (Autorité de Contrôle Prudentiel et de Résolution)
  - Agrément PSP, supervision bancaire
  - https://acpr.banque-france.fr/
  - Email : sg-informa tion@acpr.banque-france.fr

- **CNIL** (Commission Nationale Informatique et Libertés)
  - RGPD, protection données
  - https://www.cnil.fr/
  - Téléphone : 01 53 73 22 22

- **TRACFIN** (Anti-blanchiment)
  - Déclarations transactions suspectes
  - https://www.economie.gouv.fr/tracfin
  - Plateforme ERMES (déclarations)

### Fournisseurs Conformité Recommandés

**KYC/AML** :
- Onfido : https://onfido.com/ - KYC standard (2-5€/vérif)
- Jumio : https://www.jumio.com/ - KYC premium (3-7€/vérif)
- ComplyAdvantage : https://complyadvantage.com/ - Screening sanctions (~1000€/mois)

**PSP White Label** :
- Treezor (Société Générale) : https://www.treezor.com/
- Swan : https://www.swan.io/
- Lemonway : https://www.lemonway.com/

**DPO Externalisé** :
- DPMS : https://www.dpms.eu/ (500-1000€/mois)
- DPO as a Service : https://www.dpoaas.fr/

**Audits Sécurité** :
- Vaadata (France) : https://www.vaadata.com/ - Pentests, audits PCI
- Synacktiv : https://www.synacktiv.com/ - Sécurité offensive

---

## 9. Conclusion

EpiPay, dans son état actuel de **POC académique**, présente une conformité réglementaire de **20-40%** selon les domaines. Cette situation est :

✅ **Acceptable pour** :
- Projet pédagogique Epitech Digital
- Démonstration technique
- Volume limité (<100 users)
- Montants symboliques (<100€)

❌ **Inadapté pour** :
- Production bancaire réelle
- Volume élevé (>1000 users)
- Montants significatifs (>500€)
- Commercialisation publique

**Prochaines étapes recommandées** :
1. ✅ Documenter clairement statut POC (ce document)
2. ✅ Améliorer système ML fraude (projet en cours)
3. ⚠️ Si passage production envisagé : Budget 100-150k€, délai 12-18 mois
4. ⚠️ Alternative recommandée : Partenariat PSP white label (Treezor, Swan)

---

**Document rédigé par** : Équipe EpiPay  
**Révision légale** : Non (POC académique)  
**Prochaine mise à jour** : Juin 2026 (ou si évolution projet)

**Disclaimer** : Ce document est informatif et ne constitue pas un avis juridique. Pour conformité production, consulter avocat spécialisé FinTech.

