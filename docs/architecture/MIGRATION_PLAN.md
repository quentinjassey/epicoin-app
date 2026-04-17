# Plan de Migration : POC vers Production Bancaire

**Date**: 20 janvier 2026  
**Version**: 1.0  
**Statut**: Plan Stratégique

---

## 1. Vue d'Ensemble

Ce document détaille la roadmap technique pour migrer EpiPay d'un **POC académique** vers une **application de production bancaire certifiée**.

**Rappel Important** : EpiPay est actuellement un POC. Cette migration n'est **pas planifiée immédiatement** mais documente le chemin si l'ambition production se concrétise.

---

## 2. État des Lieux

### 2.1 Stack Actuelle (POC)

```
Frontend (Mobile)
├── React Native 0.81.5
├── Expo ~54.0
├── NativeWind (Tailwind CSS)
└── @supabase/supabase-js 2.86

Backend
├── Supabase Edge Functions (Deno/TypeScript)
├── Supabase PostgreSQL
├── Supabase Auth
└── Stripe (paiements)

Hébergement
└── Supabase Cloud (multi-région, dont US)
```

### 2.2 Limitations Actuelles

| Composant | Limitation | Impact Production |
|-----------|------------|-------------------|
| **Supabase (backend)** | Non certifié PCI-DSS Level 1 | ❌ Bloquant banque |
| **Supabase PostgreSQL** | Pas de garantie localisation UE stricte | ⚠️ RGPD risqué |
| **Edge Functions** | Pas de SLA 99.99% | ⚠️ Downtime inacceptable |
| **Absence Redis** | Pas de cache distribué | ⚠️ Performance limitée |
| **Absence monitoring** | Logs basiques uniquement | ❌ Bloquant production |
| **Supabase Auth** | Pas de MFA natif robuste | ⚠️ Sécurité insuffisante |

---

## 3. Architecture Cible (Production)

### 3.1 Stack Recommandée

```
Frontend (Mobile/Web)
├── React Native (iOS/Android) OU
├── React + Next.js (Web PWA)
├── TypeScript strict
└── TanStack Query (data fetching)

Backend API
├── FastAPI (Python 3.11+)
├── AWS Lambda OU GCP Cloud Run
├── Pydantic (validation)
└── SQLAlchemy (ORM)

Base de Données
├── PostgreSQL 15+ (AWS RDS Multi-AZ OU GCP Cloud SQL)
├── Réplication master-replica
├── Backups automatiques (PITR 7 jours)
└── Chiffrement au repos (AES-256)

Cache & Queue
├── Redis 7+ (AWS ElastiCache OU GCP Memorystore)
├── Bull/BullMQ (job queues)
└── Rate limiting (Redis)

Authentification
├── AWS Cognito OU Auth0 OU Keycloak
├── MFA obligatoire (TOTP + SMS)
└── Session management (Redis)

Paiements
├── Stripe (conserver, certifié PCI)
└── Bridge API (agrégation bancaire si DSP2)

Monitoring & Observabilité
├── Datadog OU New Relic (APM)
├── Sentry (error tracking)
├── CloudWatch/Stackdriver (logs)
└── PagerDuty (alerting)

Infrastructure
├── AWS OU GCP OU Azure
├── Terraform (IaC)
├── Docker + Kubernetes (orchestration)
└── CI/CD (GitHub Actions + ArgoCD)
```

### 3.2 Architecture Schématique

```
┌─────────────────────────────────────────────────────┐
│                   UTILISATEURS                       │
│            (iOS / Android / Web PWA)                 │
└────────────────────┬────────────────────────────────┘
                     │
                     │ HTTPS/TLS 1.3
                     ▼
┌─────────────────────────────────────────────────────┐
│             CloudFront / Cloudflare CDN              │
│           (Cache statique + DDoS protection)         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         API Gateway (AWS / GCP / Kong)               │
│     (Rate limiting, Auth, Routing)                   │
└──────┬──────────────────────────────────────────┬───┘
       │                                          │
       │  ┌───────────────────────────────────────┘
       │  │
       ▼  ▼
┌──────────────────┐        ┌──────────────────────┐
│   Lambda/Cloud   │◄──────►│   Redis Cache        │
│   Run (FastAPI)  │        │ (Sessions, Limites)  │
└────────┬─────────┘        └──────────────────────┘
         │
         │
         ▼
┌──────────────────────────────────────────────────┐
│         PostgreSQL RDS Multi-AZ                   │
│    (Master-Replica, Auto-backup, Encryption)     │
└──────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│            Services Externes                      │
│  • Stripe (Paiements)                             │
│  • Onfido (KYC)                                   │
│  • ComplyAdvantage (AML)                          │
│  • Datadog (Monitoring)                           │
│  • Sentry (Errors)                                │
└──────────────────────────────────────────────────┘
```

---

## 4. Phases de Migration

### PHASE 0 : POC Académique (Actuel) ✅

**Durée** : Terminé  
**Budget** : ~50€/mois  
**Équipe** : 2-3 étudiants

**Périmètre** :
- ✅ Application mobile React Native fonctionnelle
- ✅ Authentification basique (email/password)
- ✅ Transferts entre utilisateurs
- ✅ Achats produits
- ✅ Recharge via Stripe
- ✅ Détection fraude basique (règles >1000 EPC)
- ✅ Interface admin

**Limitations acceptées** :
- Supabase non certifié bancaire
- KYC/AML minimal
- Pas de conformité RGPD complète
- Volume limité (<100 users)

---

### PHASE 1 : Backend Hybride (MVP Pilote)

**Durée** : 6-8 mois  
**Budget** : 25-35k€  
**Équipe** : 3-4 développeurs + 1 DevOps + 1 Compliance

#### 1.1 Objectifs

- Migrer backend critique vers FastAPI (AWS Lambda)
- Conserver Supabase temporairement (BDD + Auth)
- Ajouter Redis pour cache et rate limiting
- Implémenter KYC simplifié (email + téléphone vérifié)
- Améliorer détection fraude (ML models)
- Monitoring basique (Sentry + CloudWatch)

#### 1.2 Architecture Hybride

```
Frontend (React Native) - Inchangé
         ↓
API Gateway (AWS)
    ↙        ↘
FastAPI      Supabase (temporaire)
(Lambda)     ├── PostgreSQL (BDD)
  ↓          └── Auth
Redis Cache
```

#### 1.3 Tâches Détaillées

**Backend (3 mois)** :
- [ ] Setup AWS compte + zone eu-west-1 (Paris)
- [ ] Créer API FastAPI :
  - Endpoints : `/auth`, `/transactions`, `/products`, `/fraud-detection`
  - Validation Pydantic
  - ORM SQLAlchemy (préparer migration BDD)
- [ ] Déployer Lambda + API Gateway
  - CI/CD GitHub Actions
  - Environnements : dev, staging, production
- [ ] Intégrer Redis (ElastiCache)
  - Cache : Profils users (TTL 5min)
  - Rate limiting : 100 req/min par user
  - Sessions (si migration auth)

**Authentification (2 mois)** :
- [ ] Conserver Supabase Auth court terme
- [ ] Préparer migration Cognito :
  - Sync users Supabase → Cognito
  - MFA (TOTP via app authenticator)
  - Migration progressive (feature flag)

**Base de Données (2 mois)** :
- [ ] Conserver Supabase PostgreSQL court terme
- [ ] Préparer RDS PostgreSQL :
  - Instance db.t3.medium Multi-AZ (eu-west-1)
  - Export Supabase → RDS (pg_dump/pg_restore)
  - Tests charge (simulate 1000 users)
  - Migration finale (weekend downtime 2-4h acceptable)

**KYC Simplifié (1 mois)** :
- [ ] Vérification email renforcée (lien + code)
- [ ] Vérification téléphone (SMS OTP via AWS SNS)
- [ ] Limites sans KYC complet :
  - Solde max : 250€
  - Transactions max : 100€/mois

**Détection Fraude ML (2 mois)** :
- [ ] Entraîner modèle Random Forest sur PaySim
- [ ] Déployer modèle sur Lambda séparé
- [ ] Intégration avec Edge Function ou FastAPI endpoint
- [ ] Seuils ajustables (scoring 0-100)

**Monitoring (1 mois)** :
- [ ] Sentry : Error tracking
- [ ] CloudWatch : Logs centralisés
- [ ] Métriques : Latency, error rate, transactions/min
- [ ] Alertes : Email si error rate >5%

**Conformité (2 mois)** :
- [ ] Rédiger CGU + Politique Confidentialité
- [ ] Implémenter consentements (checkboxes inscription)
- [ ] Droit d'accès : Export données (endpoint `/user/export`)
- [ ] Droit à l'oubli : Suppression compte (endpoint `/user/delete`)

#### 1.4 Budget Phase 1

| Poste | Coût Mensuel | Coût Total (8 mois) |
|-------|--------------|---------------------|
| **Infrastructure AWS** |||
| - Lambda (1M requêtes/mois) | 200€ | 1 600€ |
| - RDS PostgreSQL (db.t3.medium) | 150€ | 1 200€ |
| - ElastiCache Redis (cache.t3.micro) | 100€ | 800€ |
| - CloudWatch logs | 50€ | 400€ |
| **Services Tiers** |||
| - Supabase Pro (transition) | 25€ | 200€ |
| - Stripe (tx fees) | Variable | 500€ |
| - Sentry | 50€ | 400€ |
| - SMS OTP (AWS SNS) | 30€ | 240€ |
| **Développement** |||
| - 3 Devs backend (freelance 400€/j) | - | 14 400€ (3x 12j) |
| - 1 DevOps (freelance 500€/j) | - | 4 000€ (8j) |
| - 1 Compliance consultant | - | 3 000€ (forfait) |
| **Total** | **~600€/mois** | **26 740€** |

#### 1.5 Jalons (Milestones)

| Jalon | Mois | Livrable |
|-------|------|----------|
| M1 | 1 | Infrastructure AWS provisionnée + FastAPI Hello World |
| M2 | 2 | Endpoints auth + transactions migrés |
| M3 | 3 | Redis opérationnel + rate limiting |
| M4 | 4 | KYC simplifié + vérification téléphone |
| M5 | 5-6 | Modèle ML fraude déployé |
| M6 | 7 | Migration BDD Supabase → RDS (staging) |
| M7 | 8 | Tests charge + migration production |
| M8 | 8 | Pilote fermé 100 users + monitoring |

#### 1.6 Critères de Succès Phase 1

- ✅ Latency API <200ms (P95)
- ✅ Uptime >99.5% (44min downtime/mois acceptable)
- ✅ 100 users pilote actifs
- ✅ Conformité RGPD basique (droits users)
- ✅ ML fraude opérationnel (recall >80%)

---

### PHASE 2 : Production Beta Publique

**Durée** : 6 mois  
**Budget** : 50-70k€  
**Équipe** : 5-6 développeurs + 1 DevOps + 1 Product + 1 Compliance

#### 2.1 Objectifs

- Migration complète hors Supabase
- KYC Standard (Onfido, documents officiels)
- AML avec screening sanctions
- SCA complet (DSP2)
- Monitoring avancé (Datadog APM)
- Scaling : 1000-5000 users
- App stores : iOS App Store + Google Play

#### 2.2 Tâches Détaillées

**Authentification (2 mois)** :
- [ ] Migration totale vers AWS Cognito
- [ ] MFA obligatoire (TOTP + SMS)
- [ ] SCA pour transactions : Biométrie + Cognito
- [ ] Session management Redis

**KYC Standard (2 mois)** :
- [ ] Intégration Onfido :
  - SDK React Native
  - Vérification documents (CNI, passeport)
  - Selfie + liveness detection
  - Webhook résultats
- [ ] Limites avec KYC :
  - Solde max : 1000€
  - Transactions : 500€/mois
- [ ] Stockage sécurisé documents (S3 chiffré)

**AML (3 mois)** :
- [ ] Intégration ComplyAdvantage :
  - Screening listes sanctions (OFAC, EU, UN)
  - API check avant chaque transaction >100€
  - Check quotidien base utilisateurs
- [ ] Règles AML automatisées :
  - Détection smurfing (10 tx <100€ en 24h)
  - Round-robin (A→B→C→A)
  - Volume inhabituel (x10 vs historique)
- [ ] Dashboard admin :
  - Alertes AML pending
  - Workflow validation/rejet
  - Export rapports TRACFIN (si requis)

**Monitoring & Observabilité (1 mois)** :
- [ ] Migration vers Datadog :
  - APM (traces distribuées)
  - Infrastructure monitoring
  - Logs centralisés
  - Dashboards custom (transactions/min, error rate, fraud rate)
- [ ] Alerting PagerDuty :
  - P1 : API down >2min → SMS équipe
  - P2 : Error rate >5% → Email
  - P3 : Latency >500ms → Slack

**Performance & Scalabilité (2 mois)** :
- [ ] Load testing : 10k users, 1000 tx/min
- [ ] Optimisations :
  - Index BDD (transactions by user_id, created_at)
  - Cache Redis : Soldes users (invalidation on update)
  - CDN CloudFront pour assets statiques
- [ ] Auto-scaling Lambda (50-500 instances)

**Conformité (2 mois)** :
- [ ] Audit RGPD externe (cabinet avocat)
- [ ] DPIA détection fraude ML
- [ ] DPO externalisé (contrat prestataire)
- [ ] Scans vulnérabilités trimestriels (Qualys)

**App Stores (1 mois)** :
- [ ] Préparation dossiers :
  - iOS : Compliance bancaire, KYC process
  - Android : Same
- [ ] Soumission App Store (délai 1-2 semaines)
- [ ] Soumission Google Play (délai 1-3 jours)

#### 2.3 Budget Phase 2

| Poste | Coût Mensuel | Coût Total (6 mois) |
|-------|--------------|---------------------|
| **Infrastructure** |||
| - Lambda (10M req/mois) | 600€ | 3 600€ |
| - RDS (db.r5.large Multi-AZ) | 500€ | 3 000€ |
| - ElastiCache (cache.r5.large) | 200€ | 1 200€ |
| - CloudFront CDN | 100€ | 600€ |
| - S3 (KYC documents) | 50€ | 300€ |
| **Services Tiers** |||
| - Datadog APM | 400€ | 2 400€ |
| - Sentry | 100€ | 600€ |
| - Onfido (300 vérif/mois × 4€) | 1 200€ | 7 200€ |
| - ComplyAdvantage | 1 000€ | 6 000€ |
| - DPO externalisé | 800€ | 4 800€ |
| - PagerDuty | 100€ | 600€ |
| **Développement** |||
| - 5 Devs (mix interne/freelance) | - | 30 000€ |
| - 1 DevOps senior | - | 8 000€ |
| - 1 Product Manager | - | 6 000€ |
| **Audits & Conformité** |||
| - Audit RGPD externe | - | 5 000€ |
| - Pentest externe | - | 8 000€ |
| **Total** | **~5 000€/mois** | **~87 300€** |

*Note : Budget légèrement dépassé, optimisations possibles (Onfido volume, devs internes)*

#### 2.4 Critères de Succès Phase 2

- ✅ Latency API <150ms (P95)
- ✅ Uptime >99.9% (43min downtime/mois)
- ✅ 1000+ users actifs
- ✅ KYC : >90% taux succès
- ✅ AML : 0 faux négatifs critiques
- ✅ Conformité RGPD : Audit externe validé
- ✅ App Store : Applications approuvées

---

### PHASE 3 : Production Certifiée & Scale

**Durée** : 12 mois  
**Budget** : 150-200k€  
**Équipe** : 8-10 personnes (devs, DevOps, Product, Compliance, Support)

#### 3.1 Objectifs

- Certifications : SOC 2 Type II, ISO 27001
- Agrément ACPR (Établissement de Paiement) OU Partenariat PSP
- Multi-région (Paris + Francfort pour HA)
- Scale : 10k-50k users
- SLA 99.99% (52min downtime/an)
- DSP2 complet avec API bancaires
- Support client 24/7

#### 3.2 Certifications

**SOC 2 Type II** (12-18 mois)
- Audit externe par Big Four (Deloitte, EY, KPMG, PwC)
- Coût : 30-50k€
- Contrôles : Sécurité, disponibilité, confidentialité
- Requis pour : Grandes entreprises clientes, levées fonds

**ISO 27001** (12-18 mois)
- Certification ISMS (Information Security Management System)
- Coût : 20-40k€
- Audits : Annuels
- Requis pour : Marchés publics, B2B enterprise

**PCI-DSS SAQ A** (3 mois)
- Auto-évaluation (Stripe gère cartes)
- Coût : 2-5k€ (consultant + scans)
- Scans vulnérabilités trimestriels (ASV approved)

#### 3.3 Agrément ACPR

**Option A : Agrément Établissement de Paiement (EP)**

**Avantages** :
- ✅ Contrôle total opérations
- ✅ Marque blanche totale
- ✅ Marges élevées

**Inconvénients** :
- ❌ Capital minimum : 125 000€
- ❌ Délai obtention : 9-12 mois
- ❌ Conformité lourde (audits trimestriels, rapports ACPR)
- ❌ Équipe compliance 2-3 FTE

**Coût total** :
- Capital : 125k€
- Dossier ACPR : 30-50k€ (avocat spécialisé)
- Audits annuels : 20-30k€
- Compliance : 150-200k€/an (salaires)
- **Total 1ère année : ~400-500k€**

---

**Option B : Partenariat PSP White Label (Recommandé)**

**Partenaires** :
- Treezor (Société Générale)
- Swan
- Lemonway

**Avantages** :
- ✅ Pas d'agrément direct (ils sont agréés)
- ✅ KYC, AML, comptes gérés par eux
- ✅ Time-to-market : 3-6 mois
- ✅ Conformité déléguée

**Inconvénients** :
- ⚠️ Marges réduites (ils prennent commission)
- ⚠️ Dépendance partenaire (lock-in)
- ⚠️ Marque blanche limitée

**Coût** :
- Setup fee : 10-50k€
- Coût par user : 1-2€/mois
- Transaction fees : 0.10-0.30€
- **Total pour 10k users : ~20-30k€/mois**

**Recommandation** : **Option B (Partenariat PSP)** pour EpiPay
- Budget limité startup
- Focus sur UX/features, pas compliance
- Scalabilité rapide

#### 3.4 Multi-Région & HA

**Architecture** :
```
Région Primaire (eu-west-1 Paris)
├── Lambda (API) : 100-500 instances
├── RDS Primary (db.r5.2xlarge)
├── ElastiCache Primary
└── S3 (documents)

Région Secondaire (eu-central-1 Francfort)
├── Lambda (API) : Standby (auto-scale si failover)
├── RDS Replica (read-only, promotion auto si primaire down)
└── ElastiCache Replica

Route 53 (DNS)
└── Health checks : Bascule auto Frankfurt si Paris down

CloudFront CDN
└── Global (cache edge locations Europe)
```

**RTO/RPO** :
- RTO (Recovery Time Objective) : <15 min
- RPO (Recovery Point Objective) : <5 min (réplication async RDS)

**Coût supplémentaire** : +60% infra (~3k€/mois additionnel)

#### 3.5 Support Client

**Canaux** :
- In-app chat (Intercom : ~200€/mois)
- Email : support@epipay.app
- Téléphone : +33 1 XX XX XX XX (heures ouvrées)

**SLA** :
- Réponse initiale : <2h (heures ouvrées), <24h (weekend)
- Résolution : <48h (problèmes critiques)

**Équipe** :
- 2 agents support (CDI : 30-35k€/an chacun)
- 1 responsable support/compliance

#### 3.6 Budget Phase 3

| Poste | Coût Annuel |
|-------|-------------|
| **Infrastructure AWS (multi-région)** | 60 000€ |
| **Services Tiers** ||
| - Datadog APM | 5 000€ |
| - Onfido (1000 KYC/mois) | 48 000€ |
| - ComplyAdvantage | 15 000€ |
| - Partenariat PSP (10k users) | 300 000€ |
| - DPO externalisé | 12 000€ |
| - Intercom (support) | 2 400€ |
| **Certifications** ||
| - SOC 2 Type II (audit initial) | 40 000€ |
| - ISO 27001 (certification) | 30 000€ |
| - Pentests annuels | 15 000€ |
| - Scans vulnérabilités | 5 000€ |
| **Équipe (8-10 personnes)** ||
| - 5 Devs (50k€/an) | 250 000€ |
| - 2 DevOps (60k€/an) | 120 000€ |
| - 1 Product Manager (55k€) | 55 000€ |
| - 2 Support (33k€/an) | 66 000€ |
| - 1 CTO/Tech Lead (80k€) | 80 000€ |
| **Assurances & Légal** ||
| - Cyber insurance | 10 000€ |
| - Avocat FinTech (forfait annuel) | 20 000€ |
| **Marketing & Acquisition** ||
| - Budget user acquisition | 50 000€ |
| **TOTAL ANNUEL** | **~1 200 000€** |

**Revenus Estimés** (10k users, 20€ ARPU/an) :
- Revenus : 200k€/an
- **Break-even** : Non atteint (déficit ~1M€)
- **Levée fonds requise** : Seed 1-2M€ minimum

#### 3.7 Critères de Succès Phase 3

- ✅ Uptime 99.99% (SLA respecté)
- ✅ Certifications SOC 2 + ISO 27001 obtenues
- ✅ 10k+ users actifs
- ✅ Agrément ACPR OU Partenariat PSP actif
- ✅ Support client : Satisfaction >85%
- ✅ Compliance : 0 incident majeur CNIL/ACPR

---

## 5. Risques & Mitigations

### 5.1 Risques Techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Migration BDD data loss** | Moyen | Critique | Backups multiples, tests staging, fenêtre maintenance, rollback plan |
| **Latence API >300ms** | Moyen | Élevé | Cache Redis agressif, CDN, optimisation requêtes SQL, monitoring |
| **Supabase lock-in difficile** | Faible | Moyen | Export régulier données, ORM agnostique (SQLAlchemy) |
| **Scalabilité Lambda coûts** | Moyen | Moyen | Auto-scaling intelligent, cache, envisager ECS Fargate si >10M req/mois |

### 5.2 Risques Conformité

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Refus agrément ACPR** | Moyen | Critique | Option B (partenariat PSP), dossier avocat spécialisé |
| **Violation RGPD (amende)** | Faible | Élevé | DPO dès phase 2, audits réguliers, formation équipe |
| **Faille sécurité (hack)** | Moyen | Critique | Pentests trimestriels, bug bounty (HackerOne), monitoring 24/7 |
| **AML false negatives** | Moyen | Élevé | Règles + ML, revue humaine transactions >1000€, amélioration continue |

### 5.3 Risques Business

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Budget dépassé** | Élevé | Élevé | Phases incrémentales, levée fonds anticipée, pivots si nécessaire |
| **Acquisition users lente** | Élevé | Critique | Marketing agressif, partenariats campus, freemium model |
| **Compétition (Lydia, Pumpkin)** | Élevé | Moyen | Niche Epitech/écoles ingé, features différenciantes (ML fraude) |
| **Réglementations durcissent** | Moyen | Élevé | Veille réglementaire, flexibilité technique, partenariat PSP |

---

## 6. Alternatives à la Migration Complète

### 6.1 Option : Rester POC Académique

**Si** : Pas d'ambition commerciale, projet reste éducatif

**Avantages** :
- ✅ Coût minimal (~50€/mois)
- ✅ Simplicité maintenance
- ✅ Focus apprentissage technique

**Limitations** :
- ❌ Volume limité (<100 users)
- ❌ Montants symboliques uniquement
- ❌ Pas de monétisation

**Recommandation** : Valide si objectif = portfolio étudiant

---

### 6.2 Option : White Label 100%

**Principe** : Déléguer backend financier totalement (Treezor, Swan)

**Architecture** :
```
Frontend EpiPay (React Native)
         ↓
API EpiPay (logique métier, UX)
         ↓
Treezor/Swan API (comptes, KYC, AML, transactions)
```

**Avantages** :
- ✅ Time-to-market rapide (3-6 mois)
- ✅ Conformité déléguée (agrément, audits)
- ✅ Budget réduit (~50-100k€ 1ère année)

**Inconvénients** :
- ⚠️ Marges réduites (1-2€/user/mois payés au PSP)
- ⚠️ Dépendance forte (lock-in)
- ⚠️ Personnalisation limitée

**Recommandation** : **Meilleure option pour startup FinTech**

---

### 6.3 Option : Hybrid (API Proxy)

**Principe** : Backend EpiPay pour UX/features, déléguer compliance

**Architecture** :
```
Frontend EpiPay
    ↓
API EpiPay (FastAPI)
  ↙        ↘
Logique UX    Swan/Treezor
Features       (Comptes, KYC)
Fraude ML
```

**Avantages** :
- ✅ Contrôle features innovantes (ML fraude)
- ✅ Compliance déléguée
- ✅ Flexibilité partielle

**Inconvénients** :
- ⚠️ Complexité architecture (2 systèmes)
- ⚠️ Coûts intermédiaires

**Recommandation** : Si features différenciantes fortes (ML)

---

## 7. Recommandation Finale

### 7.1 Pour EpiPay Actuel (2026)

**Contexte** : Projet académique Epitech, budget étudiant

**Recommandation** : **Rester POC avec améliorations**

**Actions** :
1. ✅ Documenter architecture (fait)
2. ✅ Améliorer système ML fraude (projet en cours)
3. ✅ Tests utilisateurs (prévu)
4. ⚠️ Ne PAS migrer production immédiatement (budget 100-200k€)

**Si ambition commerciale future** :
- Valider product-market fit (100+ early adopters)
- Lever fonds Seed (500k-1M€)
- Phase 1 (Backend Hybride) : 6-8 mois
- Partenariat PSP (Treezor/Swan) : Recommandé

---

### 7.2 Timeline Réaliste Production

```
2026 Q1-Q2: POC Académique + ML Fraude ✅
2026 Q3-Q4: Validation PMF (Product-Market Fit)
2027 Q1-Q2: Levée fonds Seed (500k-1M€)
2027 Q3-Q4: Phase 1 - Backend Hybride
2028 Q1-Q2: Phase 2 - Beta Publique (1000 users)
2028 Q3-Q4: Phase 3 - Production (10k users)
2029+: Scale & Certifications
```

**Durée totale** : **2-3 ans** du POC à production certifiée

**Budget total** : **1-2M€** (levées fonds multiples)

---

## 8. Conclusion

La migration d'EpiPay vers une production bancaire certifiée est **techniquement faisable** mais requiert :

**Ressources** :
- 💰 Budget : 100-200k€ minimum (Phase 1-2)
- 👥 Équipe : 5-10 personnes
- ⏱️ Temps : 12-24 mois

**Décision Critique** : **Agrément ACPR vs Partenariat PSP**
- Agrément : 400-500k€, contrôle total, 12-18 mois
- Partenariat : 50-100k€, délégation, 3-6 mois

**Recommandation Forte** : **Partenariat PSP (Treezor/Swan)** pour startup

**Alternative** : Maintenir POC académique si objectif = formation technique uniquement

---

**Document rédigé par** : Équipe EpiPay  
**Prochaine révision** : Si levée fonds ou pivot commercial

**Contacts partenaires potentiels** :
- Treezor : sales@treezor.com
- Swan : hello@swan.io
- Lemonway : sales@lemonway.com

