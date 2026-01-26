# Protocole de Tests Utilisateurs - Explicabilité Détection Fraude

**Date**: 20 janvier 2026  
**Version**: 1.0  
**Objectif**: Valider que ≥80% des utilisateurs comprennent les alertes de fraude

---

## 1. Objectifs des Tests

### 1.1 Objectif Principal
Mesurer si les utilisateurs **comprennent pourquoi** une transaction a été bloquée ou mise en attente par le système de détection de fraude.

### 1.2 Objectifs Secondaires
- Évaluer la **clarté** des messages d'alerte
- Mesurer la **confiance** générée par le système
- Identifier les **améliorations** possibles dans la communication

### 1.3 Critères de Succès
- ✅ **≥80%** des participants répondent correctement à la question de compréhension
- ✅ **Moyenne ≥4/5** sur la clarté des messages
- ✅ **Moyenne ≥4/5** sur la confiance dans le système

---

## 2. Panel de Testeurs

### 2.1 Nombre
**5 utilisateurs minimum** (recommandé : 8-10 pour marges)

### 2.2 Profils
Diversité importante pour représenter la base utilisateurs :

| Profil | Nombre | Caractéristiques |
|--------|--------|------------------|
| **Étudiant tech** | 2 | Informatique, comprend concepts ML |
| **Étudiant non-tech** | 2 | Design, management, pas de background technique |
| **Administrateur** | 1 | Testera dashboard admin |

### 2.3 Critères d'Inclusion
- ✅ Étudiant Epitech (toute année)
- ✅ Aucune connaissance préalable du système EpiPay
- ✅ Utilise déjà des applications de paiement (Lydia, PayPal, etc.)

### 2.4 Critères d'Exclusion
- ❌ A participé au développement d'EpiPay
- ❌ A déjà testé le système de fraude

---

## 3. Scénarios de Test

### 3.1 Scénario 1 : Transaction Normale (Contrôle)
**Objectif** : Établir baseline UX normale

**Actions** :
1. Se connecter à l'application
2. Effectuer un transfert de 50 EPC vers un ami
3. Observer que la transaction passe immédiatement

**Résultat attendu** : ✅ Transaction complétée, aucune alerte

**Mesure** : Temps de complétion, facilité perçue

---

### 3.2 Scénario 2 : Transaction Suspecte Modérée (Pending)
**Objectif** : Tester compréhension alerte "en attente de vérification"

**Setup** :
- Compte test avec historique : 10 transactions récentes, toutes <100 EPC
- Destinataire : Nouveau contact jamais utilisé

**Actions** :
1. Effectuer un transfert de **800 EPC** vers nouveau destinataire
2. Observer l'alerte de sécurité
3. Lire les raisons affichées
4. Noter les réactions spontanées

**Résultat attendu** : ⚠️ Transaction en attente, alerte affichée avec :
- Score de risque : ~50-65/100
- Raisons :
  - "Montant inhabituellement élevé (800 EPC vs moyenne 80 EPC)"
  - "Premier transfert vers ce destinataire"
  - Éventuellement : "Fréquence élevée" si tests multiples

**Questions immédiates** (verbal) :
- "Que s'est-il passé ?"
- "Pourquoi la transaction n'est pas passée immédiatement ?"
- "Que devez-vous faire maintenant ?"

---

### 3.3 Scénario 3 : Transaction Frauduleuse (Bloquée)
**Objectif** : Tester compréhension alerte "transaction refusée"

**Setup** :
- Compte test similaire Scénario 2
- Destinataire : Nouveau contact
- Heure : 3h du matin (simulation temps inhabituel)

**Actions** :
1. Effectuer un transfert de **5000 EPC** vers nouveau destinataire
2. Observer l'alerte de blocage
3. Tester bouton "Contester"
4. Noter les réactions

**Résultat attendu** : ❌ Transaction bloquée, alerte affichée avec :
- Score de risque : ~85-95/100
- Raisons :
  - "Montant très élevé (5000 EPC). Limite recommandée : 1000 EPC"
  - "Montant représente 95% du solde actuel"
  - "Premier transfert vers ce destinataire"
  - "Transaction à une heure inhabituelle (3h)"

**Questions immédiates** (verbal) :
- "Que s'est-il passé ?"
- "Pourquoi la transaction a été refusée ?"
- "Que pensez-vous de cette décision ?"

---

### 3.4 Scénario 4 : Dashboard Admin (Optionnel)
**Objectif** : Tester utilisabilité dashboard admin

**Profil** : 1 testeur avec profil admin

**Actions** :
1. Se connecter en tant qu'admin
2. Accéder à la page "Fraude" (admin/fraud.tsx)
3. Consulter une alerte en attente
4. Lire les détails (fraud-detail.tsx)
5. Prendre une décision (approuver ou rejeter)

**Mesures** :
- Clarté des informations affichées
- Facilité de décision
- Compréhension des facteurs de risque

---

## 4. Déroulement d'une Session

### 4.1 Introduction (5 min)
```
"Bonjour, merci de participer à ce test.

Nous testons une nouvelle fonctionnalité de sécurité dans une application
de paiement mobile pour étudiants appelée EpiPay.

Votre rôle est d'utiliser l'application naturellement et de nous dire ce que
vous pensez à voix haute (think-aloud protocol).

Il n'y a pas de bonnes ou mauvaises réponses. Nous testons l'application,
pas vous. Soyez honnête dans vos retours.

La session durera environ 15-20 minutes.

Avez-vous des questions avant de commencer ?"
```

### 4.2 Contexte Utilisateur (2 min)
```
"Imaginez que vous utilisez EpiPay, une app de paiement entre étudiants Epitech.

Vous avez un solde de 5200 EPC (EpiCoins) sur votre compte.
1 EPC = 0.20€, donc vous avez environ 1040€.

Vous pouvez transférer de l'argent à d'autres étudiants ou acheter des 
produits dans la boutique campus.

Prêt à commencer ?"
```

### 4.3 Scénario 1 - Transaction Normale (3 min)
- Laisser l'utilisateur effectuer le transfert
- Observer, noter les commentaires
- Ne pas intervenir sauf si bloqué

### 4.4 Scénario 2 - Transaction Pending (5 min)
- Laisser l'utilisateur effectuer le transfert
- Observer sa réaction à l'alerte
- Poser les questions immédiates
- Laisser explorer l'interface ("En savoir plus", etc.)

### 4.5 Scénario 3 - Transaction Bloquée (5 min)
- Similaire scénario 2
- Observer réaction au blocage
- Noter si l'utilisateur teste "Contester"

### 4.6 Questionnaire Post-Test (5 min)
- Remplir le questionnaire (voir section 5)

### 4.7 Débriefing (5 min)
```
"Merci ! Quelques dernières questions :

- Globalement, que pensez-vous de ce système de sécurité ?
- Les messages étaient-ils clairs ?
- Vous sentez-vous en sécurité avec ce système ?
- Que changeriez-vous ?"

[Noter les réponses qualitatives]
```

---

## 5. Questionnaire Post-Test

### Question 1 : Compréhension (Ouverte)
**"Dans le scénario 2 (transfert 800 EPC), pourquoi la transaction a-t-elle été mise en attente ?"**

**Critères d'évaluation** :
- ✅ **Correct** : Mentionne au moins 2 raisons affichées (montant élevé, nouveau destinataire)
- ⚠️ **Partiel** : Mentionne 1 raison correcte
- ❌ **Incorrect** : Réponse générique ("sécurité") ou fausse

**Objectif** : ≥80% réponses correctes ou partielles

---

### Question 2 : Clarté (Échelle Likert 1-5)
**"Les raisons affichées dans les alertes étaient-elles claires et compréhensibles ?"**

1. Pas du tout clair
2. Peu clair
3. Moyennement clair
4. Clair
5. Très clair

**Objectif** : Moyenne ≥4.0

---

### Question 3 : Sécurité (Échelle Likert 1-5)
**"Ce système de détection de fraude vous fait-il sentir en sécurité ?"**

1. Pas du tout en sécurité
2. Peu en sécurité
3. Moyennement en sécurité
4. En sécurité
5. Très en sécurité

**Objectif** : Moyenne ≥4.0

---

### Question 4 : Confiance Décision (Échelle Likert 1-5)
**"Faites-vous confiance aux décisions prises par ce système automatique ?"**

1. Pas du tout confiance
2. Peu confiance
3. Confiance modérée
4. Confiance
5. Confiance totale

**Objectif** : Moyenne ≥3.5 (plus difficile, décisions automatiques)

---

### Question 5 : Amélioration (Ouverte)
**"Que changeriez-vous dans les messages d'alerte pour les rendre plus clairs ?"**

**Objectif** : Récolter suggestions qualitatives

---

### Question 6 : Contestation (Oui/Non + Ouverte)
**"Avez-vous trouvé le bouton 'Contester' ? Si oui, était-il rassurant de pouvoir contester une décision ?"**

**Objectif** : Vérifier découvrabilité et perception du droit de contestation

---

## 6. Métriques à Collecter

### 6.1 Métriques Quantitatives

| Métrique | Méthode | Objectif |
|----------|---------|----------|
| **Taux de compréhension** | Question 1 (% correct) | ≥80% |
| **Clarté moyenne** | Question 2 (moyenne) | ≥4.0/5 |
| **Sécurité perçue** | Question 3 (moyenne) | ≥4.0/5 |
| **Confiance décisions** | Question 4 (moyenne) | ≥3.5/5 |
| **Temps lecture alerte** | Observation (secondes) | <30s |
| **Taux de découverte "Contester"** | Observation (%) | ≥60% |

### 6.2 Métriques Qualitatives

- Réactions spontanées (surprise, compréhension, frustration)
- Citations verbatim intéressantes
- Suggestions d'amélioration
- Comportements non attendus

---

## 7. Matériel Requis

### 7.1 Technique
- [ ] 1 iPhone ou Android (app EpiPay installée)
- [ ] 5 comptes test pré-configurés
  - Compte 1 : Historique normal, solde 5200 EPC
  - Compte 2 : Historique normal, solde 5200 EPC
  - Compte 3 : Historique normal, solde 5200 EPC
  - Compte 4 : Historique normal, solde 5200 EPC
  - Compte 5 : Compte admin pour Scénario 4
- [ ] Backend avec fraud detection activé
- [ ] Enregistreur vidéo (optionnel, avec consentement)

### 7.2 Administratif
- [ ] Formulaires de consentement (RGPD)
- [ ] Feuilles de questionnaire (imprimées)
- [ ] Stylos
- [ ] Chronomètre

### 7.3 Environnement
- [ ] Salle calme, sans distractions
- [ ] Table + 2 chaises
- [ ] Eau pour les participants

---

## 8. Rôles et Responsabilités

### 8.1 Facilitateur (1 personne)
**Rôle** : Guider le participant, poser les questions

**Responsabilités** :
- Accueillir le participant
- Expliquer le contexte
- Guider les scénarios
- Poser les questions
- Assurer un environnement bienveillant

### 8.2 Observateur (1 personne)
**Rôle** : Noter les comportements, réactions

**Responsabilités** :
- Prendre notes détaillées
- Chronomètrer
- Noter les citations verbatim
- Remplir les métriques quantitatives
- Ne PAS interagir avec le participant

---

## 9. Considérations Éthiques

### 9.1 Consentement
- [ ] Expliquer l'objectif des tests
- [ ] Obtenir consentement écrit (RGPD)
- [ ] Préciser que les données sont anonymisées
- [ ] Donner droit de retrait à tout moment

### 9.2 Confidentialité
- [ ] Anonymiser les résultats (Participant A, B, C...)
- [ ] Ne pas partager noms ou emails
- [ ] Détruire données personnelles après analyse

### 9.3 Bienveillance
- [ ] Rappeler : "On teste l'app, pas vous"
- [ ] Ne pas juger les réponses
- [ ] Remercier chaleureusement

---

## 10. Analyse des Résultats

### 10.1 Analyse Quantitative
```
Taux de compréhension = (Réponses correctes + partielles) / Total participants * 100%
Moyenne clarté = Somme(scores Q2) / Nombre participants
Moyenne sécurité = Somme(scores Q3) / Nombre participants
Moyenne confiance = Somme(scores Q4) / Nombre participants
```

### 10.2 Analyse Qualitative
- Identifier thèmes récurrents dans Q5 (améliorations)
- Grouper suggestions par catégorie
- Prioriser par fréquence

### 10.3 Rapport Final
Voir [`docs/TESTING_RESULTS.md`](TESTING_RESULTS.md) pour template

---

## 11. Timeline

| Phase | Durée | Responsable |
|-------|-------|-------------|
| Préparation matériel | 2h | Équipe dev |
| Recrutement participants | 3 jours | Product |
| Sessions de test (5x 30min) | 3h | Facilitateur + Observateur |
| Analyse résultats | 2h | Équipe |
| Rédaction rapport | 2h | Product |
| **Total** | **~5 jours** | - |

---

## 12. Budget

| Poste | Coût |
|-------|------|
| Compensation participants (5x 10€ bon Amazon) | 50€ |
| Impression formulaires | 5€ |
| Café/snacks | 15€ |
| **Total** | **70€** |

---

## 13. Checklist Pré-Test

**24h avant** :
- [ ] Comptes test créés et validés
- [ ] App EpiPay déployée en staging
- [ ] Fraud detection testé et fonctionnel
- [ ] Formulaires imprimés
- [ ] Salle réservée
- [ ] Participants confirmés

**1h avant** :
- [ ] Téléphone chargé
- [ ] App ouverte sur compte test 1
- [ ] Backend opérationnel
- [ ] Salle préparée
- [ ] Chronomètre prêt

---

## 14. Contact

**Responsable Tests** : [Nom]  
**Email** : [email]  
**Téléphone** : [tel]

---

**Document validé par** : Équipe EpiPay  
**Prochaine révision** : Après tests

