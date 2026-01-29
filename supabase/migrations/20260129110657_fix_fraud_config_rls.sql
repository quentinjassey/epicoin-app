-- Supprimer les anciennes politiques RLS restrictives
DROP POLICY IF EXISTS "Admins can view fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can update fraud config" ON public.fraud_config;
DROP POLICY IF EXISTS "Admins can insert fraud config" ON public.fraud_config;

-- Créer une politique qui permet l'accès via service_role (pour les Edge Functions)
-- et aux admins authentifiés
CREATE POLICY "Allow service_role and admins to read fraud config" 
ON public.fraud_config 
FOR SELECT 
USING (
  -- Permettre service_role (pour Edge Functions)
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR
  -- Permettre les admins authentifiés
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can update fraud config" 
ON public.fraud_config 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can insert fraud config" 
ON public.fraud_config 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
