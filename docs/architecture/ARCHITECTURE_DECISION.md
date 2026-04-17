# Décision Architecturale : POC Académique vs Production Bancaire

**Date**: 20 janvier 2026  
**Statut**: POC Académique  
**Auteurs**: Équipe EpiPay - Epitech Digital  
**Version**: 1.0

---

## 1. Contexte

EpiPay est une application de paiement mobile développée dans le cadre d'un projet académique à Epitech Digital. L'application permet aux étudiants de :
- Recharger leur compte via Stripe
- Effectuer des achats dans la boutique campus
- Transférer des EpiCoins entre utilisateurs
- Gérer des transactions intra-campus et inter-campus

**Question centrale** : EpiPay est-il un POC académique ou une application bancaire prête pour la production ?

---

## 2. Décision : POC Académique avec Roadmap Production

### ✅ Statut Actuel : **Projet Académique / Proof of Concept**

EpiPay est **explicitement positionné comme un POC académique**, conçu pour :
- Démontrer la faisabilité technique d'un système de paiement mobile
- Expérimenter avec des technologies modernes (React Native, Supabase, ML)
- Servir de support pédagogique pour l'apprentissement du développement full-stack
- Tester des concepts d'IA pour la détection de fraude

**❌ EpiPay n'est PAS actuellement adapté pour une production bancaire réelle.**

---

## 3. Analyse de la Stack Actuelle

### 3.1 Technologies Utilisées

| Composant | Technologie | Certification Production Bancaire |
|-----------|-------------|-----------------------------------|
| **Frontend** | React Native (Expo) | ❌ Non certifié (mais acceptable) |
| **Backend** | Supabase Edge Functions (Deno) | ❌ **NON certifié PCI-DSS Level 1** |
| **Base de données** | Supabase PostgreSQL | ❌ **NON certifié pour production bancaire** |
| **Authentification** | Supabase Auth | ❌ Pas de certification bancaire |
| **Paiements** | Stripe | ✅ **Certifié PCI-DSS Level 1** |
| **Hébergement** | Supabase Cloud | ❌ **Pas de zones géographiques conformes** |
| **Cache** | Aucun | ❌ Absent (requis pour production) |
| **Monitoring** | Logs basiques | ❌ Insuffisant pour production |

### 3.2 Avantages de la Stack Actuelle (POC)

✅ **Développement rapide** : Supabase permet de prototyper très vite  
✅ **Coûts réduits** : Plan gratuit ou faible coût pour POC  
✅ **Simplicité** : Moins de composants à gérer  
✅ **Parfait pour apprentissage** : Technologies modernes et populaires  
✅ **Paiements sécurisés** : Stripe gère la conformité PCI pour les cartes bancaires

### 3.3 Limitations Critiques pour Production Bancaire

❌ **Supabase n'est pas certifié PCI-DSS Level 1**
   - Supabase est excellent pour des applications web/mobile classiques
   - Mais il ne possède **pas les certifications bancaires requises**
   - Pas d'audit de sécurité niveau bancaire
   - Pas de conformité SOC 2 Type II démontrée publiquement

❌ **Absence de zones géographiques dédiées**
   - Les réglementations bancaires européennes (RGPD, DSP2) exigent souvent des serveurs en UE
   - Supabase ne garantit pas la localisation des données au niveau requis

❌ **Architecture non optimisée pour haute disponibilité**
   - Pas de multi-région automatique
   - Pas de SLA 99.99% (requis pour production bancaire)

❌ **Absence de cache distribué (Redis)**
   - Performance insuffisante pour volume élevé de transactions
   - Pas de rate limiting robuste

❌ **Monitoring et observabilité limités**
   - Logs basiques, pas de traces distribuées (OpenTelemetry)
   - Pas d'alerting avancé pour incidents de sécurité

---

## 4. Exigences pour Production Bancaire Réelle

### 4.1 Certifications Obligatoires

| Certification | Description | Fournisseurs Conformes |
|---------------|-------------|------------------------|
| **PCI-DSS Level 1** | Protection données cartes bancaires | AWS, GCP, Azure |
| **SOC 2 Type II** | Audit sécurité indépendant | AWS, GCP, Azure |
| **ISO 27001** | Gestion sécurité de l'information | AWS, GCP, Azure |
| **GDPR** | Protection données personnelles (UE) | Tous clouds majeurs |

### 4.2 Réglementations Françaises/Européennes

#### DSP2 (Directive Services de Paiement 2)
- **SCA (Strong Customer Authentication)** : 2 facteurs parmi 3 obligatoires
- **API bancaires sécurisées** : Si interface avec comptes bancaires
- **Agrément ACPR** : Si gestion de fonds réels (Autorité de Contrôle Prudentiel)

#### KYC (Know Your Customer)
- Vérification identité avec pièces officielles (passeport, CNI)
- Vérification adresse avec justificatif domicile
- Conservation documents 5 ans minimum (obligation légale)

#### AML (Anti-Money Laundering)
- Screening listes sanctions (OFAC, EU, UN)
- Détection patterns blanchiment (structuration, smurfing)
- Déclarations obligatoires à TRACFIN (France) pour transactions suspectes
- Formation obligatoire du personnel

#### RGPD
- Droit à l'oubli (suppression données sous 30 jours)
- Portabilité données (export format lisible)
- Consentement explicite pour traitement données
- DPO (Data Protection Officer) si traitement massif

### 4.3 Infrastructure Technique Requise

**Backend Production** :
- FastAPI ou Django (Python) pour API robuste
- AWS Lambda / GCP Cloud Run / Azure Functions pour scalabilité
- PostgreSQL géré (RDS, Cloud SQL) avec réplication multi-zone
- Redis (ElastiCache, Memorystore) pour cache et rate limiting

**Sécurité** :
- WAF (Web Application Firewall) : AWS WAF, Cloudflare
- DDoS protection : Cloudflare, AWS Shield
- Secrets management : AWS Secrets Manager, Vault
- Chiffrement au repos : AES-256
- Chiffrement en transit : TLS 1.3

**Monitoring** :
- APM : Datadog, New Relic, Elastic APM
- Logs centralisés : ELK Stack, CloudWatch, Stackdriver
- Alerting : PagerDuty, Opsgenie
- Traces distribuées : OpenTelemetry, Jaeger

**Haute Disponibilité** :
- Multi-région (au minimum 2 zones)
- Load balancing automatique
- Failover automatique
- Backup quotidien avec rétention 7 ans (obligation bancaire)
- SLA 99.99% minimum (4.38 min downtime/mois)

---

## 5. Roadmap Migration vers Production

### Phase 1 : POC Académique (Actuel) ✅
**Durée** : Terminé  
**Objectifs** :
- ✅ Démonstration technique faisabilité
- ✅ Application mobile fonctionnelle
- ✅ Intégration Stripe pour paiements
- ✅ Système de fraude basique

**Stack** : React Native + Supabase + Stripe

**Limitations acceptées** :
- Pas de certification bancaire
- Volume limité (quelques centaines d'utilisateurs max)
- Pas de conformité réglementaire complète

---

### Phase 2 : Backend Hybride (6 mois)
**Budget estimé** : 15-20k€  
**Objectifs** :
- Migration backend vers FastAPI sur AWS Lambda
- Conservation Supabase pour auth et BDD (court terme)
- Ajout Redis pour cache et rate limiting
- Implémentation KYC basique (vérification email renforcée)
- Amélioration détection fraude (ML models)

**Stack** :
- Frontend : React Native (inchangé)
- Backend : FastAPI (Python) sur AWS Lambda
- BDD : Supabase PostgreSQL (migration progressive)
- Cache : Redis (ElastiCache)
- Auth : Supabase Auth → Migration vers AWS Cognito
- Paiements : Stripe (inchangé)

**Conformité** :
- Préparation KYC (interface, workflow)
- Documentation RGPD complète
- Audit sécurité externe (pentest)

---

### Phase 3 : Production Complète Certifiée (12-18 mois)
**Budget estimé** : 100-150k€ (infrastructure + audits + licences)  
**Objectifs** :
- Infrastructure 100% AWS/GCP/Azure avec zones PCI-DSS Level 1
- Migration BDD vers PostgreSQL RDS (ACID strict, backups)
- Authentification Cognito ou Keycloak avec MFA obligatoire
- KYC complet avec intégration Onfido/Jumio
- AML avec screening listes sanctions (ComplyAdvantage)
- Monitoring APM (Datadog) avec alerting 24/7
- Obtention certifications SOC 2, ISO 27001
- Agrément ACPR si gestion fonds (optionnel selon business model)

**Stack** :
- Frontend : React Native OU React Web (PWA)
- Backend : FastAPI sur AWS Lambda / ECS
- BDD : PostgreSQL RDS Multi-AZ
- Cache : Redis ElastiCache
- Auth : AWS Cognito avec MFA
- Paiements : Stripe + agrégateur bancaire (Bridge, TrueLayer)
- Monitoring : Datadog, CloudWatch, Sentry
- Secrets : AWS Secrets Manager

**Conformité** :
- ✅ PCI-DSS Level 1 (infrastructure AWS)
- ✅ KYC complet (Onfido)
- ✅ AML avec déclarations TRACFIN
- ✅ DSP2 avec SCA
- ✅ GDPR complet (DPO nommé)
- ✅ SOC 2 Type II (audit annuel)

---

## 6. Coûts Estimés

### POC Académique (Actuel)
- Supabase : **Gratuit** (plan free tier)
- Stripe : **0€ fixe** + 1.4% + 0.25€ par transaction
- Expo : **Gratuit**
- Hébergement : **0€** (inclus Supabase)
- **Total mensuel** : ~50€ (pour 100 transactions/mois)

### Backend Hybride (Phase 2)
- AWS Lambda : **~200€/mois** (estimation 1M requêtes)
- Redis ElastiCache : **~100€/mois** (cache.t3.micro)
- Supabase Pro : **25€/mois** (si dépassement free tier)
- Stripe : **1.4% + 0.25€** par transaction
- Monitoring (Sentry) : **~50€/mois**
- **Total mensuel** : ~375€ + frais transactions

### Production Complète (Phase 3)
- AWS RDS PostgreSQL : **~500€/mois** (db.r5.large Multi-AZ)
- AWS Lambda/ECS : **~300€/mois** (trafic moyen)
- Redis ElastiCache : **~200€/mois** (cache.r5.large)
- AWS Cognito : **~100€/mois** (10k users actifs)
- Datadog APM : **~400€/mois** (monitoring complet)
- Onfido KYC : **~2-5€ par vérification** (coût variable)
- ComplyAdvantage AML : **~1000€/mois** (licence + API)
- Audits SOC 2 : **~20k€/an** (audit externe)
- Assurance cyber : **~5k€/an**
- **Total mensuel** : ~2500-3000€ + coûts variables

---

## 7. Recommandations

### Pour le Contexte Académique Actuel

✅ **Maintenir le statut POC** et clairement le documenter  
✅ **Ajouter disclaimers** dans l'application :
   - "Application à des fins pédagogiques uniquement"
   - "Ne pas utiliser avec de vraies sommes importantes"
   - "Aucune garantie de sécurité niveau bancaire"

✅ **Améliorer le POC** sans migration majeure :
   - Implémenter système ML de détection fraude (objectif du projet actuel)
   - Ajouter tests utilisateurs pour UX
   - Documenter architecture et choix techniques
   - Créer documentation conformité (même si non applicable)

✅ **Préparer l'avenir** si passage en production envisagé :
   - Documenter roadmap migration (ce document)
   - Estimer coûts et délais réalistes
   - Identifier partenaires techniques (AWS, Onfido, etc.)

### Si Passage en Production Réelle

⚠️ **NE PAS sous-estimer** la complexité et les coûts :
- Budget minimum : **100-150k€** pour Phase 3 (1ère année)
- Délai minimum : **12-18 mois** de développement et audits
- Équipe requise : 3-5 développeurs + 1 DevOps + 1 compliance officer

⚠️ **Considérer alternative** : White label bancaire
- Partenaires : Treezor, Swan, Solarisbank
- Ils gèrent : KYC, AML, licences, conformité
- Vous gérez : UX, features métier
- Coût : ~1-2€ par utilisateur/mois + setup fee 10-50k€
- **Recommandé si budget limité**

---

## 8. Conclusion

### Décision Finale : POC Académique ✅

EpiPay est et reste un **projet académique de démonstration technique**. Cette décision est justifiée par :

1. **Contexte éducatif** : Epitech Digital, objectif pédagogique
2. **Budget limité** : Migration production = 100-150k€
3. **Stack actuelle** : Non certifiée pour production bancaire
4. **Délais** : 12-18 mois minimum pour production réelle
5. **Réglementation** : Complexité KYC/AML/DSP2 importante

**Cette décision n'est pas une limitation**, mais une clarification honnête du positionnement du projet. Le POC permet de :
- Démontrer la faisabilité technique ✅
- Expérimenter avec des technologies modernes ✅
- Apprendre le développement full-stack ✅
- Tester des concepts ML innovants ✅

**Si passage en production souhaité ultérieurement**, la roadmap documentée ci-dessus fournit un plan clair et réaliste.

---

## 9. Références

- [PCI Security Standards Council](https://www.pcisecuritystandards.org/)
- [ACPR - Autorité de Contrôle Prudentiel](https://acpr.banque-france.fr/)
- [DSP2 - Directive Services de Paiement 2](https://www.ecb.europa.eu/paym/intro/mip-online/2018/html/1803_revisedpsd.en.html)
- [CNIL - RGPD](https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on)
- [Stripe PCI Compliance](https://stripe.com/docs/security/guide)
- [AWS Compliance Programs](https://aws.amazon.com/compliance/programs/)
- [GCP Compliance](https://cloud.google.com/security/compliance)

---

**Document approuvé par** : Équipe EpiPay  
**Prochaine révision** : Juin 2026 (si évolution projet)

