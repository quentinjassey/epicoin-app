-- ============================================================
-- Script de Création de Données de Test
-- Système de Détection de Fraude - Epicoin
-- ============================================================
-- 
-- Ce script crée des données de test pour valider le système
-- de détection de fraude dans différents scénarios.
--
-- ATTENTION: À exécuter UNIQUEMENT dans un environnement de DEV/TEST
--
-- Usage:
--   psql $DATABASE_URL < create_test_data.sql
--   OU via Supabase SQL Editor
-- ============================================================

-- 1. CRÉER UTILISATEURS DE TEST
-- ============================================================

-- Utilisateur normal (historique clean)
DO $$
DECLARE
    v_user_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Vérifier si l'utilisateur existe déjà
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
        -- Insérer dans auth.users (si accès)
        -- Note: Normalement géré par Supabase Auth, ici on crée juste le profil
        
        INSERT INTO profiles (id, email, full_name, balance, campus, created_at)
        VALUES (
            v_user_id,
            'normal.user@epitech.eu',
            'Normal User',
            1000.00,
            'Paris',
            NOW() - INTERVAL '60 days' -- Compte créé il y a 60 jours
        );
        
        RAISE NOTICE 'Utilisateur normal créé: %', v_user_id;
    ELSE
        RAISE NOTICE 'Utilisateur normal existe déjà: %', v_user_id;
    END IF;
END $$;

-- Utilisateur suspect (compte récent)
DO $$
DECLARE
    v_user_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
        INSERT INTO profiles (id, email, full_name, balance, campus, created_at)
        VALUES (
            v_user_id,
            'suspicious.user@epitech.eu',
            'Suspicious User',
            5000.00,
            'Lyon',
            NOW() - INTERVAL '3 days' -- Compte créé il y a 3 jours
        );
        
        RAISE NOTICE 'Utilisateur suspect créé: %', v_user_id;
    ELSE
        RAISE NOTICE 'Utilisateur suspect existe déjà: %', v_user_id;
    END IF;
END $$;

-- Destinataires de test
DO $$
DECLARE
    v_recipient_1 UUID := '33333333-3333-3333-3333-333333333333';
    v_recipient_2 UUID := '44444444-4444-4444-4444-444444444444';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_recipient_1) THEN
        INSERT INTO profiles (id, email, full_name, balance, campus)
        VALUES (
            v_recipient_1,
            'recipient.one@epitech.eu',
            'Recipient One',
            500.00,
            'Paris'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_recipient_2) THEN
        INSERT INTO profiles (id, email, full_name, balance, campus)
        VALUES (
            v_recipient_2,
            'recipient.two@epitech.eu',
            'Recipient Two',
            300.00,
            'Marseille'
        );
    END IF;
    
    RAISE NOTICE 'Destinataires créés: %, %', v_recipient_1, v_recipient_2;
END $$;

-- 2. CRÉER HISTORIQUE DE TRANSACTIONS (Utilisateur Normal)
-- ============================================================

INSERT INTO transactions (sender_id, receiver_id, amount, type, status, fraud_score, created_at)
VALUES
    -- Transactions normales il y a 30 jours
    ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 50, 'transfer', 'completed', 10, NOW() - INTERVAL '30 days'),
    ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 75, 'transfer', 'completed', 12, NOW() - INTERVAL '25 days'),
    
    -- Achats récents
    ('11111111-1111-1111-1111-111111111111', NULL, 25, 'purchase', 'completed', 5, NOW() - INTERVAL '10 days'),
    ('11111111-1111-1111-1111-111111111111', NULL, 30, 'purchase', 'completed', 8, NOW() - INTERVAL '5 days'),
    
    -- Top-up
    ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 200, 'topup', 'completed', 0, NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Historique transactions créé pour utilisateur normal';

-- 3. CRÉER PRODUITS DE TEST
-- ============================================================

DO $$
DECLARE
    v_product_1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_product_2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = v_product_1) THEN
        INSERT INTO products (id, name, description, price_epicoin, stock_quantity, category)
        VALUES (
            v_product_1,
            'T-Shirt Epitech',
            'T-shirt officiel Epitech - Taille M',
            25,
            100,
            'Vêtements'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = v_product_2) THEN
        INSERT INTO products (id, name, description, price_epicoin, stock_quantity, category)
        VALUES (
            v_product_2,
            'MacBook Pro M3 (Test)',
            'Produit de test à prix élevé',
            1500,
            5,
            'High-Value'
        );
    END IF;
    
    RAISE NOTICE 'Produits de test créés';
END $$;

-- 4. SCÉNARIOS DE TEST PRÉDÉFINIS
-- ============================================================

-- Créer des transactions de test pour validation

-- Scénario A: Transaction normale (devrait passer)
INSERT INTO transactions (sender_id, receiver_id, amount, type, status, fraud_score, fraud_features, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    50,
    'transfer',
    'completed',
    15,
    '{"user_avg_amount": 62.5, "new_recipient": false, "balance_ratio": 0.05}',
    NOW() - INTERVAL '1 hour'
) ON CONFLICT DO NOTHING;

-- Scénario B: Transaction suspecte (devrait être en revue)
INSERT INTO transactions (sender_id, receiver_id, amount, type, status, fraud_score, fraud_features, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    800,
    'transfer',
    'pending_review',
    55,
    '{"user_avg_amount": 62.5, "new_recipient": true, "amount_unusual": true, "balance_ratio": 0.8}',
    NOW() - INTERVAL '30 minutes'
) ON CONFLICT DO NOTHING;

-- Créer alerte fraude pour Scénario B
DO $$
DECLARE
    v_tx_id UUID;
BEGIN
    SELECT id INTO v_tx_id
    FROM transactions
    WHERE sender_id = '11111111-1111-1111-1111-111111111111'
    AND amount = 800
    AND created_at > NOW() - INTERVAL '1 hour'
    LIMIT 1;
    
    IF v_tx_id IS NOT NULL THEN
        INSERT INTO fraud_alerts (transaction_id, risk_score, reason, status, fraud_features)
        VALUES (
            v_tx_id,
            55,
            'Montant inhabituellement élevé; Premier transfert vers ce destinataire',
            'pending',
            '{"user_avg_amount": 62.5, "new_recipient": true, "amount_unusual": true}'
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Alerte fraude créée pour transaction: %', v_tx_id;
    END IF;
END $$;

-- Scénario C: Transaction bloquée (fraude élevée)
INSERT INTO transactions (sender_id, receiver_id, amount, type, status, fraud_score, fraud_features, created_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    5000,
    'transfer',
    'failed',
    95,
    '{"user_avg_amount": 0, "new_recipient": true, "amount_very_high": true, "account_age_days": 3, "balance_ratio": 1.0}',
    NOW() - INTERVAL '15 minutes'
) ON CONFLICT DO NOTHING;

-- Créer alerte fraude pour Scénario C
DO $$
DECLARE
    v_tx_id UUID;
BEGIN
    SELECT id INTO v_tx_id
    FROM transactions
    WHERE sender_id = '22222222-2222-2222-2222-222222222222'
    AND amount = 5000
    AND created_at > NOW() - INTERVAL '30 minutes'
    LIMIT 1;
    
    IF v_tx_id IS NOT NULL THEN
        INSERT INTO fraud_alerts (transaction_id, risk_score, reason, status, fraud_features)
        VALUES (
            v_tx_id,
            95,
            'Montant très élevé (5000 EPC); Compte récent (3 jours) avec transaction élevée; Premier transfert vers ce destinataire',
            'rejected',
            '{"amount_very_high": true, "new_account": true, "new_recipient": true}'
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Alerte fraude créée pour transaction bloquée: %', v_tx_id;
    END IF;
END $$;

-- 5. VÉRIFICATION
-- ============================================================

DO $$
DECLARE
    v_user_count INT;
    v_tx_count INT;
    v_alert_count INT;
BEGIN
    SELECT COUNT(*) INTO v_user_count FROM profiles WHERE email LIKE '%@epitech.eu';
    SELECT COUNT(*) INTO v_tx_count FROM transactions;
    SELECT COUNT(*) INTO v_alert_count FROM fraud_alerts;
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'DONNÉES DE TEST CRÉÉES AVEC SUCCÈS';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Utilisateurs: %', v_user_count;
    RAISE NOTICE 'Transactions: %', v_tx_count;
    RAISE NOTICE 'Alertes Fraude: %', v_alert_count;
    RAISE NOTICE '============================================================';
    
    -- Afficher les utilisateurs de test
    RAISE NOTICE 'Utilisateurs de test:';
    RAISE NOTICE '  - normal.user@epitech.eu (11111111-1111-1111-1111-111111111111)';
    RAISE NOTICE '  - suspicious.user@epitech.eu (22222222-2222-2222-2222-222222222222)';
    RAISE NOTICE '  - recipient.one@epitech.eu (33333333-3333-3333-3333-333333333333)';
    RAISE NOTICE '  - recipient.two@epitech.eu (44444444-4444-4444-4444-444444444444)';
    RAISE NOTICE '';
    RAISE NOTICE 'Pour tester le système:';
    RAISE NOTICE '  1. Exécuter: deno run --allow-net --allow-env test-fraud-system.ts';
    RAISE NOTICE '  2. Ou appeler manuellement transfer_epicoin() via SQL';
    RAISE NOTICE '  3. Vérifier dashboard admin: /admin/fraud';
    RAISE NOTICE '============================================================';
END $$;

-- Afficher statistiques
SELECT * FROM get_fraud_stats(30);

