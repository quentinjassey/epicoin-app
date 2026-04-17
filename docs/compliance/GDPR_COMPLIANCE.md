# Conformité RGPD - EpiPay

**Date**: 20 janvier 2026  
**Statut**: POC Académique  
**Version**: 1.0  
**Responsable**: Équipe EpiPay

---

## 1. Introduction

Ce document détaille la conformité d'EpiPay au **RGPD (Règlement Général sur la Protection des Données)**, règlement européen 2016/679 applicable depuis le 25 mai 2018.

**⚠️ Avertissement** : EpiPay est actuellement un **POC académique**. La conformité RGPD décrite ici est **partielle** et adaptée à un contexte éducatif. Une production réelle nécessiterait une conformité complète.

---

## 2. Registre des Traitements

### 2.1 Traitement 1 : Gestion des Comptes Utilisateurs

**Finalité** : Permettre aux utilisateurs de créer et gérer leur compte EpiPay

**Base légale** : Contrat (exécution du service)

**Données collectées** :
- Identité : Nom complet, email
- Données financières : Solde EpiCoins
- Données techniques : ID utilisateur (UUID), campus

**Destinataires** :
- Équipe EpiPay (développeurs, admins)
- Supabase (hébergeur)

**Durée de conservation** :
- Données actives : Tant que compte actif
- Après suppression : 0 jour (POC) | 5 ans (production AML)

**Transferts hors UE** : Oui, Supabase (US) - Privacy Shield invalidé, clauses contractuelles types

**Mesures de sécurité** :
- Chiffrement en transit (TLS 1.3)
- Chiffrement au repos (Supabase PostgreSQL)
- Authentification biométrique (Face ID)
- Row Level Security (RLS)

---

### 2.2 Traitement 2 : Transactions Financières

**Finalité** : Enregistrer et tracer les transactions (transferts, achats, recharges)

**Base légale** : 
- Contrat (exécution du service)
- Obligation légale (traçabilité financière, AML)

**Données collectées** :
- Transaction : Montant, type, date/heure
- Parties : Expéditeur, destinataire
- Métadonnées : ID produit, Stripe payment_intent_id, fraud_score

**Destinataires** :
- Équipe EpiPay
- Supabase (hébergeur)
- Stripe (paiements)

**Durée de conservation** :
- Transactions actives : Illimitée (historique)
- Après suppression compte : 5 ans minimum (obligation AML)

**Transferts hors UE** : Oui (Supabase US, Stripe US/IE)

**Mesures de sécurité** :
- RLS (utilisateur voit uniquement ses transactions)
- Logs d'accès
- Anonymisation après suppression compte (email → `deleted@anonymized.local`)

---

### 2.3 Traitement 3 : Détection de Fraude

**Finalité** : Protéger les utilisateurs contre la fraude et le blanchiment

**Base légale** :
- Intérêt légitime (sécurité des transactions)
- Obligation légale (AML)

**Données collectées** :
- Historique transactions utilisateur
- Patterns comportementaux (fréquence, montants, destinataires)
- Scores de risque (0-100)
- Adresse IP (logs)

**Destinataires** :
- Équipe EpiPay (revue manuelle alertes)
- Modèles ML (traitement automatisé)

**Durée de conservation** :
- Alertes fraude : 5 ans (obligation AML)
- Logs IP : 1 an maximum

**Transferts hors UE** : Non (traitement local)

**Mesures de sécurité** :
- Pseudonymisation (ID utilisateur, pas de nom dans logs)
- Accès restreint (admins uniquement)
- Audit logs

**Prise de décision automatisée** : OUI
- Transactions bloquées automatiquement si score >70
- Droit utilisateur de contester (Article 22 RGPD)
- Revue humaine disponible sous 24h

---

### 2.4 Traitement 4 : Paiements par Carte (Stripe)

**Finalité** : Recharger compte EpiCoins via carte bancaire

**Base légale** : Contrat

**Données collectées** :
- ❌ Aucune donnée carte stockée par EpiPay
- ✅ Stripe gère : numéro carte, CVV, expiration
- EpiPay stocke uniquement : payment_intent_id (référence), montants

**Destinataires** :
- Stripe (processeur paiement, certifié PCI-DSS Level 1)

**Durée de conservation** :
- Stripe : Selon politique Stripe (généralement 7 ans)
- EpiPay : Référence transaction uniquement (illimitée)

**Transferts hors UE** : Oui (Stripe US/IE, clauses contractuelles types)

**Mesures de sécurité** :
- Délégation totale à Stripe (certifié PCI)
- Aucune manipulation données carte côté EpiPay
- Stripe Elements (iframe isolé)

---

### 2.5 Traitement 5 : Logs et Monitoring

**Finalité** : Débogage, sécurité, prévention incidents

**Base légale** : Intérêt légitime (sécurité système)

**Données collectées** :
- Logs techniques : Erreurs, requêtes HTTP
- Authentification : Connexions, déconnexions
- Adresses IP
- User-Agent (navigateur)

**Destinataires** :
- Équipe développement EpiPay
- Supabase (logs serveur)

**Durée de conservation** : 1 an maximum

**Transferts hors UE** : Oui (Supabase US)

**Mesures de sécurité** :
- Pseudonymisation emails (m***@epitech.eu)
- Pas de stockage mots de passe en clair (hachage bcrypt)
- Accès logs restreint (développeurs autorisés)

---

## 3. Droits des Utilisateurs

### 3.1 Droit d'Accès (Article 15)

**Implémentation POC** : ❌ Non implémenté  
**Implémentation Production** : ✅ Requise

**Fonctionnalité** :
- Bouton "Exporter mes données" dans profil
- Format JSON ou PDF
- Contenu : Profil, transactions, logs connexion, alertes fraude

**Délai** : 1 mois maximum

**Code type** :
```typescript
// À implémenter
app.get('/api/user/data-export', authenticateUser, async (req, res) => {
  const data = {
    profile: await getProfile(req.user.id),
    transactions: await getTransactions(req.user.id),
    loginHistory: await getLoginHistory(req.user.id),
    fraudAlerts: await getFraudAlerts(req.user.id),
    consents: await getConsents(req.user.id)
  };
  
  res.json({
    exportDate: new Date(),
    userData: data
  });
});
```

---

### 3.2 Droit de Rectification (Article 16)

**Implémentation POC** : ⚠️ Partiel  
**Implémentation Production** : ✅ Requise

**Fonctionnalité actuelle** :
- ✅ Modification nom (profil utilisateur)
- ❌ Modification email (non implémenté)

**À ajouter** :
- Formulaire modification email avec re-vérification
- Modification adresse (si KYC production)
- Historique modifications (audit)

---

### 3.3 Droit à l'Oubli (Article 17)

**Implémentation POC** : ❌ Non implémenté  
**Implémentation Production** : ✅ Requise (avec exceptions)

**Exceptions** :
- Transactions : Conservation 5 ans obligatoire (AML)
- Documents KYC : Conservation 5 ans obligatoire (AML)

**Solution** : Anonymisation

**Code type** :
```typescript
// À implémenter
app.delete('/api/user/account', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  
  // 1. Anonymiser transactions (obligation légale conservation)
  await db.transactions.updateMany(
    { $or: [{ sender_id: userId }, { receiver_id: userId }] },
    { 
      sender_email: 'deleted@anonymized.local',
      receiver_email: 'deleted@anonymized.local'
    }
  );
  
  // 2. Supprimer profil
  await db.profiles.delete({ id: userId });
  
  // 3. Supprimer logs (>1 an)
  await db.logs.delete({ user_id: userId, created_at: { $lt: oneYearAgo } });
  
  // 4. Conserver KYC 5 ans avec flag deleted
  await db.kyc.update(
    { user_id: userId },
    { 
      status: 'deleted_user_retained_legal',
      retention_until: addYears(new Date(), 5)
    }
  );
  
  // 5. Révoquer sessions
  await supabase.auth.admin.deleteUser(userId);
  
  res.json({ 
    message: 'Compte supprimé. Données légales conservées 5 ans (obligation AML).',
    deletionDate: new Date(),
    retentionUntil: addYears(new Date(), 5)
  });
});
```

---

### 3.4 Droit à la Portabilité (Article 20)

**Implémentation POC** : ❌ Non implémenté  
**Implémentation Production** : ✅ Requise

**Fonctionnalité** :
- Export JSON structuré
- Format machine-readable
- Historique complet transactions

**Différence avec droit d'accès** :
- Portabilité : Format réutilisable (JSON, CSV)
- Accès : Format lisible humain (PDF)

---

### 3.5 Droit d'Opposition (Article 21)

**Implémentation POC** : ❌ Non applicable (pas de marketing)  
**Implémentation Production** : ✅ Requise si marketing

**Fonctionnalité** :
- Opt-out emails marketing
- Opt-out cookies analytiques (non essentiels)
- Impossible d'opposer : Traitement contractuel (transactions) ou légal (AML)

---

### 3.6 Droit de Contestation (Article 22)

**Implémentation POC** : ❌ Non implémenté  
**Implémentation Production** : ✅ Requise (décision automatisée)

**Contexte** : EpiPay utilise ML pour bloquer transactions automatiquement

**Fonctionnalité** :
- Bouton "Contester décision" si transaction bloquée
- Revue humaine (admin) sous 24-48h
- Notification résultat

**Interface** :
```
❌ Transaction refusée pour sécurité

Montant : 1500 EPC
Raison : Score de risque élevé (85/100)

Cette décision a été prise automatiquement par notre système.

[Contester cette décision]  [En savoir plus]
```

---

## 4. Consentements

### 4.1 Consentements Actuels (POC)

**Implémentation** : ❌ Aucun consentement formalisé

**À implémenter** :
- Conditions Générales d'Utilisation (CGU)
- Politique de Confidentialité
- Bannière cookies (si cookies non essentiels)

---

### 4.2 Consentements Production

**Types** :

| Consentement | Obligatoire | Implémentation |
|--------------|-------------|----------------|
| **CGU** | ✅ Oui | Checkbox inscription, non pré-cochée |
| **Politique Confidentialité** | ✅ Oui | Checkbox inscription, liée CGU |
| **Cookies essentiels** | ✅ Oui | Pas de consentement requis (strictement nécessaire) |
| **Cookies analytiques** | ❌ Non | Bannière RGPD, opt-in |
| **Emails marketing** | ❌ Non | Checkbox séparée, opt-in |

**Traçabilité** :
```typescript
interface Consent {
  userId: string;
  type: 'cgu' | 'privacy_policy' | 'marketing_emails' | 'analytics_cookies';
  version: string; // Ex: "1.2" (version CGU)
  granted: boolean;
  grantedAt: Date;
  revokedAt?: Date;
  ipAddress: string;
  userAgent: string;
}
```

**Interface inscription** :
```
Créer un compte EpiPay

Nom complet : [________]
Email : [________]
Mot de passe : [________]

☐ J'accepte les Conditions Générales d'Utilisation (obligatoire)
☐ J'accepte la Politique de Confidentialité (obligatoire)
☐ J'accepte de recevoir des emails promotionnels (optionnel)

[Créer mon compte]
```

---

## 5. Mesures de Sécurité

### 5.1 Chiffrement

**En transit** :
- ✅ TLS 1.3 sur toutes connexions
- ✅ HTTPS obligatoire (redirect HTTP → HTTPS)
- ✅ Certificats Let's Encrypt (renouvellement auto)

**Au repos** :
- ✅ Supabase PostgreSQL chiffré (AES-256)
- ⚠️ Mots de passe hachés (bcrypt, non réversible)
- ❌ Pas de chiffrement E2E (End-to-End) - Non requis POC

**Production** :
- ✅ Chiffrement colonnes sensibles (KYC documents)
- ✅ Clés gérées par HSM (Hardware Security Module) ou KMS (Key Management Service)

---

### 5.2 Contrôle d'Accès

**Principe moindre privilège** :

| Rôle | Accès Données | Accès Base | Accès Logs |
|------|---------------|------------|-----------|
| **Utilisateur** | Ses données uniquement (RLS) | ❌ Non | ❌ Non |
| **Développeur** | Lecture anonymisée (dev) | ⚠️ Lecture (staging) | ✅ Oui (debug) |
| **Admin** | Lecture toutes données | ⚠️ Lecture (production) | ✅ Oui |
| **Compliance Officer** | Lecture KYC/Fraude | ❌ Non | ✅ Oui (audit) |

**Authentification forte** :
- ✅ POC : Mot de passe + biométrie
- ✅ Production : MFA obligatoire (Admins)

---

### 5.3 Pseudonymisation

**Techniques** :

1. **Masquage emails (logs)** :
   - `marie.dupont@epitech.eu` → `m***e@e***.eu`

2. **UUIDs au lieu de noms** :
   - Logs : `User a1b2c3d4 initiated transfer` (pas de nom)

3. **Agrégation statistiques** :
   - "150 utilisateurs campus Paris" (pas de liste individuelle)

**Code type** :
```typescript
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const [domainName, tld] = domain.split('.');
  
  return `${local[0]}***${local[local.length - 1]}@${domainName[0]}***.${tld}`;
}

// marie.dupont@epitech.eu → m***t@e***.eu
```

---

### 5.4 Audits et Logs

**Logs d'accès** :
- Qui : User ID ou Admin ID
- Quoi : Action (read, update, delete)
- Quand : Timestamp
- Où : Adresse IP, ressource
- Résultat : Succès/échec

**Conservation** : 1 an maximum

**Exemple** :
```
[2026-01-20 15:32:41] user_a1b2c3d4 READ transactions 200 OK 192.168.1.1
[2026-01-20 15:33:12] admin_x9y8z7 UPDATE fraud_alert fa_123 200 OK 10.0.0.5
```

---

## 6. Violations de Données

### 6.1 Définition

Une **violation de données** (data breach) = accès non autorisé, perte, destruction ou altération de données personnelles.

**Exemples** :
- Hack base de données (SQL injection)
- Vol laptop avec données non chiffrées
- Email envoyé au mauvais destinataire
- Accès non autorisé par employé

---

### 6.2 Processus de Notification

**Obligation** : Notifier CNIL sous **72 heures** si risque pour droits/libertés

**Étapes** :

1. **Détection** (T+0h)
   - Monitoring automatique (alertes intrusion)
   - Signalement utilisateur
   - Découverte interne

2. **Évaluation** (T+2h)
   - Nature violation : Confidentialité, intégrité, disponibilité
   - Données impactées : Quels types, combien d'users
   - Risque utilisateurs : Faible, moyen, élevé

3. **Notification CNIL** (T+72h maximum)
   - Si risque moyen/élevé : Notification obligatoire
   - Via téléservice CNIL : https://www.cnil.fr/notifier-une-violation
   - Contenu : Nature, données, nombre users, mesures prises

4. **Notification Utilisateurs** (T+72h maximum)
   - Si risque élevé (ex: mots de passe exposés) : Notification directe users
   - Email : Nature violation, recommandations (changer mot de passe)

5. **Documentation** (T+7 jours)
   - Registre violations (même si pas notifié CNIL)
   - Conservation 3 ans minimum

6. **Mesures Correctives** (T+30 jours)
   - Patch vulnérabilité
   - Audit sécurité complet
   - Formation équipe si erreur humaine

---

### 6.3 Modèle Notification Utilisateurs

```
Objet : Information importante concernant votre compte EpiPay

Bonjour,

Nous vous contactons pour vous informer d'un incident de sécurité affectant votre compte EpiPay.

Qu'est-ce qui s'est passé ?
Le [DATE], nous avons détecté un accès non autorisé à notre base de données. Environ [NOMBRE] comptes ont été impactés, dont le vôtre.

Quelles données sont concernées ?
- Nom et email
- Historique transactions (montants, dates)
- Aucune donnée bancaire (gérée par Stripe, non impactée)

Que devez-vous faire ?
1. Changez votre mot de passe immédiatement : [LIEN]
2. Activez l'authentification à deux facteurs
3. Surveillez vos transactions des prochains jours

Que faisons-nous ?
- Vulnérabilité corrigée le [DATE]
- Audit sécurité complet en cours
- Notification CNIL effectuée
- Renforcement mesures sécurité

Contact :
Pour toute question : security@epipay.app

Nous présentons nos excuses pour cet incident.

Équipe EpiPay
```

---

## 7. Transferts Hors UE

### 7.1 Cadre Légal

**Schrems II (2020)** : Privacy Shield invalidé, transferts US complexifiés

**Mécanismes légaux** :
1. ✅ Clauses Contractuelles Types (CCT) - Standard UE
2. ✅ Règles d'Entreprise Contraignantes (BCR) - Grandes entreprises
3. ❌ Privacy Shield - Invalidé
4. ⚠️ Décision d'adéquation (UK post-Brexit valide jusqu'en 2025)

---

### 7.2 Transferts EpiPay

| Service | Pays | Base Légale | Mesures Supplémentaires |
|---------|------|-------------|-------------------------|
| **Supabase** | US (AWS) | CCT + Évaluation risque | Chiffrement, accès restreint |
| **Stripe** | US/IE | CCT + Certifié PCI | Données carte isolées, chiffrement |

**Évaluation risque** (Schrems II) :
- Données sensibles ? Non (pas de santé, opinions politiques)
- Surveillance gouvernementale US ? Risque théorique faible (données financières limitées)
- Mesures techniques ? Chiffrement E2E possible si requis

---

### 7.3 Alternative Production (Si Requis)

**Option 1** : Hébergement 100% UE
- OVH Cloud (France)
- Scaleway (France)
- Hetzner (Allemagne)

**Option 2** : Supabase avec régions UE
- Supabase propose régions Frankfurt, Londres
- Configurer région UE lors création projet

---

## 8. DPO (Data Protection Officer)

### 8.1 Obligation

**DPO obligatoire si** :
- ✅ Organisme public
- ✅ >250 employés
- ✅ Traitement sensible grande échelle (santé, biométrie, géolocalisation)

**EpiPay POC** : ❌ Non obligatoire (petite équipe, données non sensibles)  
**EpiPay Production** : ⚠️ Recommandé (bonne pratique FinTech)

---

### 8.2 Rôle DPO

- Conseiller sur conformité RGPD
- Point de contact CNIL et utilisateurs
- Superviser DPIAs (études d'impact)
- Former équipe
- Auditer traitements

**Indépendance** : Ne peut être révoqué pour avis RGPD

---

### 8.3 Solutions Startup

**Option 1** : DPO externalisé
- Prestataire spécialisé : 500-1500€/mois selon volume
- Mutualisé : 1 DPO pour plusieurs clients
- Exemples : DPMS, DPO as a Service, Fedlex

**Option 2** : DPO interne temps partiel
- Collaborateur formé (certification AFCDP, CNIL)
- 20-40% de son temps
- Risque : Conflit intérêts si aussi développeur

**Recommandation POC** : Aucun DPO (non requis)  
**Recommandation Production** : DPO externalisé (budget limité)

---

## 9. DPIA (Data Protection Impact Assessment)

### 9.1 Définition

**DPIA** (ou AIPD en français) = Étude d'impact sur la vie privée

**Obligatoire si** :
- Traitement automatisé avec décision significative (ex: ML bloquant transactions)
- Surveillance systématique grande échelle
- Données sensibles grande échelle (santé, biométrie)

---

### 9.2 EpiPay Concerné ?

**Traitement à risque** : Détection fraude par ML bloquant transactions automatiquement

**Évaluation** :
- ✅ Décision automatisée significative (blocage transaction)
- ❌ Pas de données sensibles (pas de santé, opinions)
- ⚠️ Échelle limitée (POC <100 users, production <10k users)

**Conclusion** : 
- POC : DPIA non requise (échelle limitée)
- Production : DPIA recommandée (bonne pratique)

---

### 9.3 Contenu DPIA

1. **Description traitement**
   - Finalité : Détecter transactions frauduleuses
   - Données : Historique transactions, patterns comportement
   - Destinataires : Admins, modèle ML

2. **Évaluation nécessité/proportionnalité**
   - Nécessaire ? Oui (protection utilisateurs, obligation AML)
   - Proportionné ? Oui (seulement données transactions, pas vie privée)

3. **Risques pour droits/libertés**
   - Risque : Faux positifs bloquant transactions légitimes
   - Impact : Gêne utilisateur, perte confiance
   - Probabilité : Moyenne (10-20% faux positifs attendus)

4. **Mesures atténuation**
   - Droit contestation (revue humaine <24h)
   - Explicabilité (raisons blocage affichées)
   - Amélioration continue (feedback loop)
   - Seuils ajustables (minimiser faux positifs)

5. **Validation**
   - Avis DPO (si existant)
   - Consultation utilisateurs (tests)
   - Validation direction

---

## 10. Sanctions RGPD

### 10.1 Niveaux Amendes

**Niveau 1** (moins grave) : Jusqu'à **10 millions €** OU **2% CA mondial**
- Violations : Défaut sécurité, notification tardive violation

**Niveau 2** (grave) : Jusqu'à **20 millions €** OU **4% CA mondial**
- Violations : Absence consentement, non-respect droits users, transferts illégaux hors UE

**Le montant le plus élevé s'applique** (10M€ ou 2% CA)

---

### 10.2 Exemples Réels

| Entreprise | Amende | Année | Raison |
|------------|--------|-------|--------|
| **Meta (Facebook)** | 1,2 Md€ | 2023 | Transferts US illégaux |
| **Amazon** | 746 M€ | 2021 | Ciblage publicitaire sans consentement |
| **Google** | 90 M€ | 2020 | Cookies sans consentement valide |
| **H&M** | 35 M€ | 2020 | Surveillance excessive employés |
| **British Airways** | 22 M€ | 2020 | Violation données 400k clients |

---

### 10.3 Facteurs Aggravants/Atténuants

**Aggravants** :
- Données sensibles (santé, enfants)
- Volume important (millions de personnes)
- Négligence grave
- Absence coopération avec CNIL

**Atténuants** :
- PME/startup (capacité financière limitée)
- Bonne foi, mesures correctives rapides
- Coopération proactive avec CNIL
- Première infraction

---

## 11. Checklist Conformité RGPD

### 11.1 Documentation

- [ ] Registre des traitements (ce document)
- [ ] Politique de Confidentialité publiée
- [ ] CGU publiées
- [ ] Procédure violations de données
- [ ] DPIA si traitement à risque
- [ ] DPO nommé (si requis)

---

### 11.2 Droits Utilisateurs

- [ ] Droit d'accès (export données)
- [ ] Droit rectification (formulaire)
- [ ] Droit à l'oubli (suppression compte)
- [ ] Droit portabilité (export JSON)
- [ ] Droit opposition (opt-out marketing)
- [ ] Droit contestation (décisions auto)

---

### 11.3 Consentements

- [ ] CGU à l'inscription (checkbox)
- [ ] Politique Confidentialité (checkbox)
- [ ] Bannière cookies (si cookies non essentiels)
- [ ] Opt-in marketing (si applicable)
- [ ] Traçabilité consentements (BDD)

---

### 11.4 Sécurité

- [ ] Chiffrement transit (TLS 1.3)
- [ ] Chiffrement repos (AES-256)
- [ ] Mots de passe hachés (bcrypt)
- [ ] RLS activé (isolation données)
- [ ] Logs d'accès (audit trail)
- [ ] Pseudonymisation (logs, stats)
- [ ] MFA admins

---

### 11.5 Transferts Hors UE

- [ ] Inventaire transferts (services US)
- [ ] CCT signées (Supabase, Stripe)
- [ ] Évaluation risque Schrems II
- [ ] Mesures supplémentaires si requis

---

### 11.6 Processus

- [ ] Procédure notification violations <72h
- [ ] Formation équipe RGPD (annuelle)
- [ ] Revue périodique conformité (annuelle)
- [ ] Contact CNIL identifié
- [ ] Assurance cyber (recommandé)

---

## 12. Ressources

### 12.1 Autorités

**CNIL** (Commission Nationale Informatique et Libertés)
- Site : https://www.cnil.fr/
- Téléphone : 01 53 73 22 22
- Notification violations : https://www.cnil.fr/notifier-une-violation

**EDPB** (European Data Protection Board)
- Guidelines RGPD européennes
- Site : https://edpb.europa.eu/

---

### 12.2 Outils

**Générateurs** :
- CNIL : Modèles registre, mentions légales (gratuit)
- https://www.cnil.fr/fr/modele/registre

**Formation** :
- CNIL : MOOC RGPD gratuit
- https://atelier-rgpd.cnil.fr/

**Certifications** :
- AFCDP : Certified Data Protection Officer
- CNIL : DPO certifié

---

### 12.3 Prestataires Conformité

**DPO externalisés** :
- DPMS : https://www.dpms.eu/ (500-1000€/mois)
- Witik : https://www.witik.io/ (spécialiste startups)
- DPO as a Service : https://www.dpoaas.fr/

**Audits RGPD** :
- Lexing : https://www.lexing.eu/ (cabinet avocat tech)
- Deloitte Legal : Audits conformité grandes entreprises

---

## 13. Conclusion

EpiPay dans son état actuel (**POC académique**) présente une **conformité RGPD partielle (~35%)**, suffisante pour un projet éducatif mais **inadaptée pour production**.

**Prochaines étapes** :
1. ✅ Documenter traitements (ce document)
2. ⚠️ Implémenter droits users (export, suppression) - Si production
3. ⚠️ Formaliser consentements (CGU, cookies) - Si production
4. ⚠️ DPO externalisé - Si production >1000 users
5. ⚠️ DPIA détection fraude - Si production ML

**Estimation effort conformité complète** : 3-4 mois développement + 10-15k€ (DPO, audits)

---

**Document rédigé par** : Équipe EpiPay  
**Contact** : [email projet]  
**Prochaine révision** : Juin 2026

**Disclaimer** : Ce document est informatif et ne constitue pas un avis juridique. Pour conformité production, consulter avocat spécialisé RGPD/FinTech.

