# Guide d'intégration du système de détection de fraude enrichi

## ✅ Travail accompli

### Phase 1: Migrations de base de données
- ✅ Créé `20240122000001_enrich_transactions.sql` avec:
  - Nouvelles colonnes: provider, provider_tx_id, initiator_user_id, currency, transaction_type, direction, country, city, device_info, etc.
  - Table `wallets` pour le multi-campus
  - Index pour performance
  - Contraintes et foreign keys

- ✅ Créé `20240122000002_intercampus_functions.sql` avec:
  - Fonctions `intercampus_receive` et `intercampus_send`
  - Fonctions utilitaires pour API keys

- ⚠️ **ACTION MANUELLE REQUISE**: Les migrations doivent être appliquées manuellement dans Supabase Dashboard car il y a un conflit avec l'historique distant.
  - Utiliser le fichier `APPLY_MANUALLY.sql` dans le SQL Editor de Supabase
  - OU: Exécuter les migrations 20240122000001 et 20240122000002 une par une

### Phase 2: Service de collecte de contexte
- ✅ Créé `lib/transactionContext.ts`:
  - Fonction `getDeviceInfo()`: collecte device_id, model, OS, etc.
  - Fonction `getLocationInfo()`: GPS ou fallback IP geolocation (ipapi.co)
  - Fonction `collectTransactionContext()`: agrège tout
  - Fonction `buildTransactionPayload()`: construit le payload complet

- ✅ Installé les packages nécessaires:
  - `expo-device`
  - `expo-location`

- ⚠️ Intégration partielle dans les écrans:
  - ✅ `app/top-up.tsx`: Import du service, collecte du contexte avant paiement
  - ✅ `app/send.tsx`: Import du service
  - ⚠️ À compléter: collecter et envoyer le contexte dans `handleTransfer()`
  - ⚠️ `app/(tabs)/shop.tsx`: à modifier

## 🔄 Travail restant

### Phase 2 (suite): Finir l'intégration frontend

#### A. Compléter `app/send.tsx`
Dans la fonction `handleTransfer()`, ajouter:
```typescript
async function handleTransfer() {
    setShowConfirmModal(false);
    setLoading(true);

    const parsedAmount = parseFloat(amount);

    try {
        // AJOUTER: Collecter le contexte
        const context = await collectTransactionContext();

        const { data, error } = await supabase.rpc('transfer_epicoin', {
            receiver_email: selectedUser?.email,
            amount: parsedAmount,
            // AJOUTER: Passer le contexte
            enriched_data: {
                country: context.location_info.country,
                city: context.location_info.city,
                device_info: context.device_info,
                description: `Transfert vers ${selectedUser?.full_name}`,
            }
        });
        // ... reste du code
    }
}
```

⚠️ **Note**: Ceci nécessite de modifier la signature SQL de `transfer_epicoin` pour accepter `enriched_data`.

#### B. Modifier `app/(tabs)/shop.tsx`
Ajouter la collecte de contexte avant l'achat de produits.

### Phase 3: Refonte de fraud-detection

#### A. Mettre à jour `supabase/functions/fraud-detection/index.ts`
- Modifier l'interface `TransactionPayload` pour accepter tous les nouveaux champs
- Ajouter les nouvelles règles heuristiques:
  1. **Géographique**: pays à haut risque, changements de localisation suspects
  2. **Device**: changement d'appareil, multiple devices
  3. **Temporel**: patterns d'heures, écarts de timestamps
  4. **Provider**: patterns suspects
  5. **Montants par type**: seuils différents selon transaction_type
  6. **Direction**: ratio outgoing/incoming

#### B. Mettre à jour les features ML
Adapter les features PaySim pour inclure:
- `country_encoded`: encoder les pays
- `provider_encoded`: encoder les providers
- `device_changed`: détection de changement d'appareil
- `time_since_last_tx`: temps depuis dernière transaction

### Phase 4: API Intercampus

#### A. Créer `supabase/functions/intercampus-receive/index.ts`
Edge Function pour recevoir des paiements d'autres campus:
```typescript
// Vérifier API key du wallet source
// Appeler fraud-detection
// Si approuvé: appeler intercampus_receive SQL
// Retourner confirmation
```

#### B. Créer `supabase/functions/intercampus-send/index.ts`
Edge Function pour envoyer vers un autre campus:
```typescript
// Collecter contexte
// Appeler fraud-detection local
// Si approuvé: débiter wallet local et appeler API du campus destinataire
// Gérer rollback si échec
```

### Phase 5: Mises à jour Edge Functions existantes

#### A. Modifier `supabase/functions/confirm-payment/index.ts`
Enrichir l'appel à fraud-detection:
```typescript
const fraudResponse = await fetch(/*...*/, {
    body: JSON.stringify({
        transaction: {
            userId: user.id,
            amount: amountInEpc,
            type: 'topup',
            provider: 'stripe',
            provider_tx_id: payment_intent_id,
            transaction_type: 'CASHIN',
            direction: 'incoming',
            currency: 'EPC',
            country: /* extraire de headers ou contexte */,
            city: /* ... */,
            device_info: {
                ip: req.headers.get('x-forwarded-for'),
                user_agent: req.headers.get('user-agent'),
            },
            // ...
        }
    })
})
```

#### B. Créer `supabase/functions/transfer/index.ts`
Nouveau wrapper pour les transferts P2P:
- Recevoir payload enrichi du frontend
- Appeler fraud-detection
- Appeler transfer_epicoin SQL avec fraud_score
- Enregistrer transaction avec toutes les données enrichies

#### C. Créer `supabase/functions/purchase/index.ts`
Nouveau wrapper pour les achats:
- Similaire à transfer
- Type: MERCHANT

### Phase 6: Interfaces admin

#### A. Mettre à jour `app/admin/fraud-detail.tsx`
Afficher les nouveaux champs:
- Provider, country, city
- Device info (IP, device model, OS)
- Timestamps détaillés
- Carte géographique (optionnel)

#### B. Mettre à jour `app/admin/transactions.tsx`
- Ajouter filtres: country, provider, transaction_type
- Afficher les nouveaux champs dans les colonnes

### Phase 7: Testing

#### Tests à effectuer:
1. Top-up avec collecte de contexte
2. Transfert P2P avec contexte
3. Achat produit avec contexte
4. Vérifier logs fraud-detection affichent bien tous les champs
5. Vérifier transactions DB contiennent country, city, device_info
6. Tester avec VPN/changement de localisation
7. Tester transactions intercampus (après setup wallets)

## 📋 Ordre d'exécution recommandé

1. ✅ **FAIT**: Créer migrations SQL
2. ⚠️ **ACTION MANUELLE**: Appliquer migrations dans Supabase Dashboard
3. ✅ **FAIT**: Créer service transactionContext
4. **EN COURS**: Finir intégration frontend (send.tsx, shop.tsx)
5. **À FAIRE**: Refonte fraud-detection
6. **À FAIRE**: Mettre à jour confirm-payment
7. **À FAIRE**: Créer Edge Functions transfer et purchase
8. **À FAIRE**: Créer API intercampus
9. **À FAIRE**: Enrichir interfaces admin
10. **À FAIRE**: Tests complets

## ⚠️ Points d'attention

1. **Permissions géolocalisation**: L'app demande maintenant la permission de localisation. À documenter dans app.json.
2. **RGPD**: device_info et IP sont des données personnelles. Documenter rétention.
3. **API ipapi.co**: Gratuite mais limitée (30k requêtes/mois). Prévoir fallback.
4. **Performance**: Collecte de contexte ajoute ~1-2s. Afficher loader approprié.
5. **Migrations**: Doivent être appliquées manuellement à cause du conflit d'historique.

## 🔧 Dépannage

### Si les migrations ne s'appliquent pas:
```bash
# Option 1: Utiliser le SQL Editor dans Supabase Dashboard
# Copier-coller le contenu de APPLY_MANUALLY.sql

# Option 2: Repair et réessayer
supabase migration repair --status reverted [migration_ids]
supabase db push
```

### Si la géolocalisation ne fonctionne pas:
- Vérifier les permissions dans app.json
- Le fallback IP geolocation devrait fonctionner automatiquement
- Tester avec: `await collectTransactionContext()`

### Si les Edge Functions ne reçoivent pas les nouvelles données:
- Vérifier que le frontend envoie bien le contexte
- Logger le payload dans l'Edge Function
- Vérifier que fraud-detection accepte les nouveaux champs

## 📚 Ressources

- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo Device](https://docs.expo.dev/versions/latest/sdk/device/)
- [IP Geolocation API](https://ipapi.co/api/)
- [PaySim Dataset](https://www.kaggle.com/datasets/ealaxi/paysim1) (pour features ML)
