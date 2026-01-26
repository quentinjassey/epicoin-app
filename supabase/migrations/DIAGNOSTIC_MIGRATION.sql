-- =====================================================
-- SCRIPT DE DIAGNOSTIC pour problème de migration
-- À exécuter dans Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Voir toutes les valeurs de 'type' qui existent actuellement
SELECT type, COUNT(*) as count
FROM public.transactions
GROUP BY type
ORDER BY count DESC;

-- 2. Voir les transactions avec des types qui ne sont pas dans la liste attendue
SELECT id, type, status, created_at
FROM public.transactions
WHERE type NOT IN ('topup', 'purchase', 'transfer', 'intercampus')
ORDER BY created_at DESC
LIMIT 10;

-- 3. Voir la contrainte actuelle
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'transactions_type_check';
