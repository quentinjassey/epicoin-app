-- Script de diagnostic pour identifier la source de l'erreur JWT
-- Exécutez ces requêtes dans le SQL Editor de Supabase

-- 1. Vérifier que le RLS est bien désactivé sur fraud_config
SELECT 
    schemaname,
    tablename, 
    rowsecurity as "RLS activé"
FROM pg_tables 
WHERE tablename = 'fraud_config';
-- Résultat attendu: RLS activé = false

-- 2. Vérifier qu'il n'y a plus de politiques RLS sur fraud_config
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'fraud_config';
-- Résultat attendu: 0 lignes (aucune politique)

-- 3. Vérifier que la table fraud_config contient des données
SELECT * FROM public.fraud_config;
-- Résultat attendu: 1 ligne avec ml_weight, heuristic_weight, etc.

-- 4. Tester directement la fonction get_fraud_config
SELECT * FROM public.get_fraud_config();
-- Résultat attendu: 1 ligne avec les valeurs de configuration

-- 5. Vérifier les permissions de la fonction
SELECT 
    p.proname as "Fonction",
    pg_get_functiondef(p.oid) as "Définition"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_fraud_config';
-- Vérifier que SECURITY DEFINER est présent

-- 6. Vérifier que la table profiles n'a pas de RLS bloquant
SELECT 
    tablename, 
    rowsecurity as "RLS activé"
FROM pg_tables 
WHERE tablename = 'profiles';

-- 7. Tester l'accès à profiles avec service_role (simulé)
-- Cette requête devrait retourner des résultats
SELECT id, balance, campus, created_at 
FROM public.profiles 
LIMIT 1;
