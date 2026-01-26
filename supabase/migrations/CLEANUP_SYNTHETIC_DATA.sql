-- ================================================================
-- Script de Nettoyage des Données Synthétiques d'Entraînement
-- ================================================================
-- Date: 2026-01-23
-- Objectif: Supprimer les 1200 transactions et 60 profils synthétiques
--           créés pour l'entraînement ML, tout en préservant les vraies données
-- ================================================================
BEGIN;
-- 1. Afficher un résumé avant suppression
DO $$
DECLARE synthetic_profiles_count INTEGER;
synthetic_transactions_count INTEGER;
real_profiles_count INTEGER;
real_transactions_count INTEGER;
BEGIN -- Compter les profils synthétiques (emails commençant par synthetic_)
SELECT COUNT(*) INTO synthetic_profiles_count
FROM auth.users
WHERE email LIKE 'synthetic_%@test.epicoin.app';
-- Compter TOUTES les transactions liées aux utilisateurs synthétiques
SELECT COUNT(*) INTO synthetic_transactions_count
FROM public.transactions
WHERE sender_id IN (
        SELECT id
        FROM auth.users
        WHERE email LIKE 'synthetic_%@test.epicoin.app'
    )
    OR receiver_id IN (
        SELECT id
        FROM auth.users
        WHERE email LIKE 'synthetic_%@test.epicoin.app'
    )
    OR metadata->>'synthetic' = 'true';
-- Compter les vrais profils
SELECT COUNT(*) INTO real_profiles_count
FROM auth.users
WHERE email NOT LIKE 'synthetic_%@test.epicoin.app';
-- Compter les vraies transactions (celles qui n'impliquent aucun utilisateur synthétique)
SELECT COUNT(*) INTO real_transactions_count
FROM public.transactions
WHERE sender_id NOT IN (
        SELECT id
        FROM auth.users
        WHERE email LIKE 'synthetic_%@test.epicoin.app'
    )
    AND receiver_id NOT IN (
        SELECT id
        FROM auth.users
        WHERE email LIKE 'synthetic_%@test.epicoin.app'
    )
    AND (
        metadata->>'synthetic' IS NULL
        OR metadata->>'synthetic' != 'true'
    );
RAISE NOTICE '========================================';
RAISE NOTICE 'RÉSUMÉ AVANT NETTOYAGE';
RAISE NOTICE '========================================';
RAISE NOTICE 'Profils synthétiques à supprimer: %',
synthetic_profiles_count;
RAISE NOTICE 'Transactions synthétiques à supprimer: %',
synthetic_transactions_count;
RAISE NOTICE 'Profils réels à conserver: %',
real_profiles_count;
RAISE NOTICE 'Transactions réelles à conserver: %',
real_transactions_count;
RAISE NOTICE '========================================';
END $$;
-- 2. Supprimer TOUTES les transactions liées aux utilisateurs synthétiques
-- (pas seulement celles marquées comme synthétiques)
DELETE FROM public.transactions
WHERE sender_id IN (
        SELECT id
        FROM auth.users
        WHERE email LIKE 'synthetic_%@test.epicoin.app'
    )
    OR receiver_id IN (
        SELECT id
        FROM auth.users
        WHERE email LIKE 'synthetic_%@test.epicoin.app'
    )
    OR metadata->>'synthetic' = 'true';
-- 3. Supprimer les alertes de fraude liées aux transactions synthétiques (si elles existent)
DELETE FROM public.fraud_alerts
WHERE transaction_id NOT IN (
        SELECT id
        FROM public.transactions
    );
-- 4. Supprimer d'abord les profils synthétiques de public.profiles
-- Note: On identifie les profils synthétiques via les emails des utilisateurs auth
DELETE FROM public.profiles
WHERE id IN (
        SELECT id
        FROM auth.users
        WHERE email LIKE 'synthetic_%@test.epicoin.app'
    );
-- 5. Puis supprimer les utilisateurs synthétiques de auth.users
DELETE FROM auth.users
WHERE email LIKE 'synthetic_%@test.epicoin.app';
-- 6. Afficher un résumé après suppression
DO $$
DECLARE remaining_profiles INTEGER;
remaining_transactions INTEGER;
BEGIN
SELECT COUNT(*) INTO remaining_profiles
FROM auth.users;
SELECT COUNT(*) INTO remaining_transactions
FROM public.transactions;
RAISE NOTICE '========================================';
RAISE NOTICE 'RÉSUMÉ APRÈS NETTOYAGE';
RAISE NOTICE '========================================';
RAISE NOTICE 'Profils restants: %',
remaining_profiles;
RAISE NOTICE 'Transactions restantes: %',
remaining_transactions;
RAISE NOTICE '========================================';
RAISE NOTICE '✅ NETTOYAGE TERMINÉ AVEC SUCCÈS';
RAISE NOTICE '========================================';
END $$;
COMMIT;
-- ================================================================
-- VÉRIFICATIONS POST-NETTOYAGE (Optionnel)
-- ================================================================
-- Vérifier qu'il ne reste aucun profil synthétique
SELECT COUNT(*) as remaining_synthetic_profiles
FROM auth.users
WHERE email LIKE 'synthetic_%@test.epicoin.app';
-- Vérifier qu'il ne reste aucune transaction liée aux utilisateurs synthétiques
SELECT COUNT(*) as remaining_synthetic_transactions
FROM public.transactions
WHERE sender_id IN (
        SELECT id
        FROM auth.users
        WHERE email LIKE 'synthetic_%@test.epicoin.app'
    )
    OR receiver_id IN (
        SELECT id
        FROM auth.users
        WHERE email LIKE 'synthetic_%@test.epicoin.app'
    )
    OR metadata->>'synthetic' = 'true';
-- Afficher les vraies transactions restantes
SELECT id,
    amount,
    type,
    status,
    created_at
FROM public.transactions
ORDER BY created_at DESC
LIMIT 10;