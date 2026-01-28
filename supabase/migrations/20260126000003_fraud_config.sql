-- Table de configuration du système de détection de fraude
CREATE TABLE IF NOT EXISTS public.fraud_config (
  id uuid default gen_random_uuid() primary key,
  -- Poids du système de scoring
  ml_weight decimal(3, 2) default 0.40 not null check (
    ml_weight >= 0
    and ml_weight <= 1
  ),
  heuristic_weight decimal(3, 2) default 0.60 not null check (
    heuristic_weight >= 0
    and heuristic_weight <= 1
  ),
  -- Seuils de décision (scores de 0 à 100)
  threshold_approve integer default 30 not null check (
    threshold_approve >= 0
    and threshold_approve <= 100
  ),
  threshold_review integer default 70 not null check (
    threshold_review >= 0
    and threshold_review <= 100
  ),
  -- threshold_block est implicite : > threshold_review
  -- Métadonnées
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references public.profiles(id),
  -- Contrainte : ml_weight + heuristic_weight = 1
  constraint weights_sum_check check (ml_weight + heuristic_weight = 1.00),
  -- Contrainte : threshold_approve < threshold_review
  constraint thresholds_order_check check (threshold_approve < threshold_review)
);
-- RLS pour fraud_config
ALTER TABLE public.fraud_config ENABLE ROW LEVEL SECURITY;
-- Seuls les admins peuvent lire et modifier la configuration
CREATE POLICY "Admins can view fraud config" ON fraud_config FOR
SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND is_admin = true
    )
  );
CREATE POLICY "Admins can update fraud config" ON fraud_config FOR
UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND is_admin = true
    )
  );
CREATE POLICY "Admins can insert fraud config" ON fraud_config FOR
INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND is_admin = true
    )
  );
-- Insérer la configuration par défaut (si elle n'existe pas)
INSERT INTO public.fraud_config (
    ml_weight,
    heuristic_weight,
    threshold_approve,
    threshold_review
  )
VALUES (0.40, 0.60, 30, 70) ON CONFLICT DO NOTHING;
-- Fonction pour récupérer la configuration active
CREATE OR REPLACE FUNCTION public.get_fraud_config() RETURNS TABLE (
    ml_weight decimal,
    heuristic_weight decimal,
    threshold_approve integer,
    threshold_review integer
  ) AS $$ BEGIN RETURN QUERY
SELECT fc.ml_weight,
  fc.heuristic_weight,
  fc.threshold_approve,
  fc.threshold_review
FROM public.fraud_config fc
ORDER BY fc.updated_at DESC
LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Fonction pour mettre à jour la configuration
CREATE OR REPLACE FUNCTION public.update_fraud_config(
    p_ml_weight decimal,
    p_heuristic_weight decimal,
    p_threshold_approve integer,
    p_threshold_review integer,
    p_admin_id uuid
  ) RETURNS json AS $$
DECLARE v_config_id uuid;
v_is_admin boolean;
BEGIN -- Vérifier que l'utilisateur est admin
SELECT is_admin INTO v_is_admin
FROM public.profiles
WHERE id = p_admin_id;
IF NOT v_is_admin THEN RETURN json_build_object(
  'success',
  false,
  'message',
  'Accès refusé : vous devez être administrateur'
);
END IF;
-- Vérifier les contraintes
IF p_ml_weight + p_heuristic_weight != 1.00 THEN RETURN json_build_object(
  'success',
  false,
  'message',
  'La somme des poids ML et heuristique doit être égale à 1.00'
);
END IF;
IF p_threshold_approve >= p_threshold_review THEN RETURN json_build_object(
  'success',
  false,
  'message',
  'Le seuil d''approbation doit être inférieur au seuil de révision'
);
END IF;
-- Récupérer l'ID de la configuration existante (ou créer une nouvelle)
SELECT id INTO v_config_id
FROM public.fraud_config
ORDER BY updated_at DESC
LIMIT 1;
IF v_config_id IS NULL THEN -- Créer une nouvelle configuration
INSERT INTO public.fraud_config (
    ml_weight,
    heuristic_weight,
    threshold_approve,
    threshold_review,
    updated_by
  )
VALUES (
    p_ml_weight,
    p_heuristic_weight,
    p_threshold_approve,
    p_threshold_review,
    p_admin_id
  )
RETURNING id INTO v_config_id;
ELSE -- Mettre à jour la configuration existante
UPDATE public.fraud_config
SET ml_weight = p_ml_weight,
  heuristic_weight = p_heuristic_weight,
  threshold_approve = p_threshold_approve,
  threshold_review = p_threshold_review,
  updated_by = p_admin_id,
  updated_at = timezone('utc'::text, now())
WHERE id = v_config_id;
END IF;
RETURN json_build_object(
  'success',
  true,
  'message',
  'Configuration mise à jour avec succès',
  'config_id',
  v_config_id
);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_fraud_config_updated_at ON public.fraud_config(updated_at DESC);