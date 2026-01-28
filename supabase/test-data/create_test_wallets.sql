-- Script pour créer des wallets de test pour transactions inter-campus
-- Exécuter dans le SQL Editor de Supabase Dashboard

-- 1. Créer des utilisateurs de test si nécessaire
-- (utiliser le Auth Dashboard pour créer des utilisateurs réels)

-- 2. Créer des wallets de test
INSERT INTO public.wallets (id, campus_id, campus_name, balance, is_active, api_key_hash)
VALUES 
  (
    'wallet_paris_test',
    'paris',
    'Epitech Paris',
    1000.00,
    true,
    NULL -- Nous générerons l'API key après
  ),
  (
    'wallet_lyon_test',
    'lyon',
    'Epitech Lyon',
    500.00,
    true,
    NULL
  ),
  (
    'wallet_marseille_test',
    'marseille',
    'Epitech Marseille',
    750.00,
    true,
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  balance = EXCLUDED.balance,
  is_active = EXCLUDED.is_active;

-- 3. Générer et stocker une API Key pour le wallet Paris
DO $$
DECLARE
  v_api_key TEXT;
  v_api_key_hash TEXT;
BEGIN
  -- Générer la clé
  v_api_key := generate_wallet_api_key();
  
  -- La hasher
  v_api_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');
  
  -- Stocker le hash
  UPDATE public.wallets
  SET api_key_hash = v_api_key_hash
  WHERE id = 'wallet_paris_test';
  
  -- IMPORTANT : Sauvegarder cette clé dans vos notes !
  RAISE NOTICE 'API Key pour wallet_paris_test: %', v_api_key;
END $$;

-- 4. Générer API Key pour Lyon
DO $$
DECLARE
  v_api_key TEXT;
  v_api_key_hash TEXT;
BEGIN
  v_api_key := generate_wallet_api_key();
  v_api_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');
  
  UPDATE public.wallets
  SET api_key_hash = v_api_key_hash
  WHERE id = 'wallet_lyon_test';
  
  RAISE NOTICE 'API Key pour wallet_lyon_test: %', v_api_key;
END $$;

-- 5. Vérifier les wallets créés
SELECT id, campus_id, campus_name, balance, is_active, 
       CASE WHEN api_key_hash IS NOT NULL THEN '✓ API Key définie' ELSE '✗ Pas d''API Key' END as api_key_status
FROM public.wallets
WHERE id LIKE 'wallet_%_test'
ORDER BY campus_id;

-- NOTE : Copiez les API Keys affichées dans les NOTICES ci-dessus
-- Elles ne seront plus accessibles après cette exécution !
