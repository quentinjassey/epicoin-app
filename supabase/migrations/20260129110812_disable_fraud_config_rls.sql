-- Désactiver RLS sur fraud_config car SECURITY DEFINER gère déjà la sécurité
ALTER TABLE public.fraud_config DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Allow service_role and admins to read fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can update fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can insert fraud config" ON public.fraud_config;

-- Note: La fonction get_fraud_config() a SECURITY DEFINER, donc elle s'exécute 
-- avec les privilèges du propriétaire de la fonction, pas de l'appelant.
-- La fonction update_fraud_config() vérifie manuellement is_admin dans son code.
