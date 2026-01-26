-- Migration: Système ML de détection de fraude
-- Date: 2026-01-20
-- Objectif: Ajouter colonnes fraud_score et fraud_features, améliorer table fraud_alerts

-- 1. Ajouter colonnes ML aux transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0 CHECK (fraud_score >= 0 AND fraud_score <= 100);

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS fraud_features JSONB DEFAULT '{}';

COMMENT ON COLUMN public.transactions.fraud_score IS 'Score de risque fraude ML (0-100)';
COMMENT ON COLUMN public.transactions.fraud_features IS 'Features ayant contribué au score (explicabilité)';

-- Index pour recherches par score
CREATE INDEX IF NOT EXISTS idx_transactions_fraud_score ON public.transactions(fraud_score) WHERE fraud_score > 30;

-- 2. Améliorer table fraud_alerts
ALTER TABLE public.fraud_alerts
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.fraud_alerts
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.fraud_alerts
ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

ALTER TABLE public.fraud_alerts
ADD COLUMN IF NOT EXISTS fraud_features JSONB DEFAULT '{}';

COMMENT ON COLUMN public.fraud_alerts.reviewed_by IS 'Admin qui a examiné l\'alerte';
COMMENT ON COLUMN public.fraud_alerts.reviewed_at IS 'Date de revue';
COMMENT ON COLUMN public.fraud_alerts.resolution_notes IS 'Notes admin sur la décision';
COMMENT ON COLUMN public.fraud_alerts.fraud_features IS 'Copie des features ML pour référence';

-- Index pour dashboard admin
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status_created ON public.fraud_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_reviewed_by ON public.fraud_alerts(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- 3. Fonction helper: Créer alerte fraude
CREATE OR REPLACE FUNCTION create_fraud_alert(
  p_transaction_id UUID,
  p_risk_score INTEGER,
  p_reason TEXT,
  p_fraud_features JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO fraud_alerts (
    transaction_id,
    risk_score,
    reason,
    fraud_features,
    status
  ) VALUES (
    p_transaction_id,
    p_risk_score,
    p_reason,
    p_fraud_features,
    'pending'
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_fraud_alert IS 'Créer une alerte fraude avec features ML';

-- 4. Fonction: Approuver alerte fraude (admin)
CREATE OR REPLACE FUNCTION approve_fraud_alert(
  p_alert_id UUID,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_transaction_id UUID;
  v_sender_id UUID;
  v_receiver_id UUID;
  v_amount NUMERIC;
  v_type TEXT;
  v_metadata JSONB;
  v_scope TEXT;
BEGIN
  -- Vérifier que l'admin est bien admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_admin_id 
    AND (is_admin = TRUE OR email LIKE '%@epitech.digital')
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin rights required');
  END IF;
  
  -- Récupérer infos transaction
  SELECT t.id, t.sender_id, t.receiver_id, t.amount, t.type, t.metadata, t.scope
  INTO v_transaction_id, v_sender_id, v_receiver_id, v_amount, v_type, v_metadata, v_scope
  FROM fraud_alerts fa
  JOIN transactions t ON t.id = fa.transaction_id
  WHERE fa.id = p_alert_id AND fa.status = 'pending';
  
  IF v_transaction_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Alert not found or already processed');
  END IF;
  
  -- Marquer alerte comme approuvée
  UPDATE fraud_alerts
  SET status = 'approved',
      reviewed_by = p_admin_id,
      reviewed_at = NOW(),
      resolution_notes = p_notes
  WHERE id = p_alert_id;
  
  -- Exécuter transaction (selon type)
  IF v_type = 'transfer' THEN
    -- Transférer fonds
    UPDATE profiles SET balance = balance - v_amount WHERE id = v_sender_id;
    UPDATE profiles SET balance = balance + v_amount WHERE id = v_receiver_id;
    
    -- Mettre à jour transaction
    UPDATE transactions
    SET status = 'completed'
    WHERE id = v_transaction_id;
    
  ELSIF v_type = 'purchase' THEN
    -- Déduire montant
    UPDATE profiles SET balance = balance - v_amount WHERE id = v_sender_id;
    
    -- Mettre à jour stock produit
    UPDATE products
    SET stock_quantity = stock_quantity - (v_metadata->>'quantity')::INTEGER
    WHERE id = (v_metadata->>'product_id')::UUID;
    
    -- Mettre à jour transaction
    UPDATE transactions
    SET status = 'completed'
    WHERE id = v_transaction_id;
    
  ELSIF v_type = 'topup' THEN
    -- Créditer compte
    UPDATE profiles SET balance = balance + v_amount WHERE id = v_sender_id;
    
    -- Mettre à jour transaction
    UPDATE transactions
    SET status = 'completed'
    WHERE id = v_transaction_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Transaction approved and executed',
    'transaction_id', v_transaction_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_fraud_alert IS 'Approuver une alerte fraude et exécuter la transaction';

-- 5. Fonction: Rejeter alerte fraude (admin)
CREATE OR REPLACE FUNCTION reject_fraud_alert(
  p_alert_id UUID,
  p_admin_id UUID,
  p_notes TEXT
) RETURNS JSON AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Vérifier que l'admin est bien admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_admin_id 
    AND (is_admin = TRUE OR email LIKE '%@epitech.digital')
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin rights required');
  END IF;
  
  -- Récupérer transaction_id
  SELECT transaction_id INTO v_transaction_id
  FROM fraud_alerts
  WHERE id = p_alert_id AND status = 'pending';
  
  IF v_transaction_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Alert not found or already processed');
  END IF;
  
  -- Marquer alerte comme rejetée
  UPDATE fraud_alerts
  SET status = 'rejected',
      reviewed_by = p_admin_id,
      reviewed_at = NOW(),
      resolution_notes = p_notes
  WHERE id = p_alert_id;
  
  -- Marquer transaction comme échouée
  UPDATE transactions
  SET status = 'failed',
      metadata = metadata || jsonb_build_object('rejection_reason', p_notes)
  WHERE id = v_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Transaction rejected',
    'transaction_id', v_transaction_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_fraud_alert IS 'Rejeter une alerte fraude et annuler la transaction';

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION create_fraud_alert TO authenticated;
GRANT EXECUTE ON FUNCTION approve_fraud_alert TO authenticated;
GRANT EXECUTE ON FUNCTION reject_fraud_alert TO authenticated;

-- 7. RLS policies (sécurité supplémentaire)
-- Les admins peuvent exécuter approve/reject via les fonctions, mais RLS empêche modification directe

-- 8. Vues utiles pour dashboard admin
CREATE OR REPLACE VIEW fraud_alerts_pending AS
SELECT 
  fa.id AS alert_id,
  fa.risk_score,
  fa.reason,
  fa.fraud_features,
  fa.created_at,
  t.id AS transaction_id,
  t.amount,
  t.type,
  t.scope,
  sender.email AS sender_email,
  sender.full_name AS sender_name,
  receiver.email AS receiver_email,
  receiver.full_name AS receiver_name
FROM fraud_alerts fa
JOIN transactions t ON t.id = fa.transaction_id
JOIN profiles sender ON sender.id = t.sender_id
LEFT JOIN profiles receiver ON receiver.id = t.receiver_id
WHERE fa.status = 'pending'
ORDER BY fa.created_at DESC;

COMMENT ON VIEW fraud_alerts_pending IS 'Vue des alertes fraude en attente (dashboard admin)';

-- Grant read access à la vue pour admins
GRANT SELECT ON fraud_alerts_pending TO authenticated;

-- 9. Fonction: Stats fraude (dashboard admin)
CREATE OR REPLACE FUNCTION get_fraud_stats(
  days_ago INTEGER DEFAULT 7
) RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  WITH fraud_data AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
      AVG(risk_score) AS avg_risk_score,
      MAX(risk_score) AS max_risk_score,
      COUNT(*) AS total_alerts
    FROM fraud_alerts
    WHERE created_at > NOW() - (days_ago || ' days')::INTERVAL
  ),
  transaction_data AS (
    SELECT
      COUNT(*) FILTER (WHERE fraud_score > 70) AS high_risk_count,
      COUNT(*) FILTER (WHERE fraud_score BETWEEN 31 AND 70) AS medium_risk_count,
      COUNT(*) FILTER (WHERE fraud_score BETWEEN 1 AND 30) AS low_risk_count,
      AVG(fraud_score) FILTER (WHERE fraud_score > 0) AS avg_fraud_score
    FROM transactions
    WHERE created_at > NOW() - (days_ago || ' days')::INTERVAL
  )
  SELECT json_build_object(
    'period_days', days_ago,
    'alerts', row_to_json(fraud_data.*),
    'transactions', row_to_json(transaction_data.*)
  ) INTO stats
  FROM fraud_data, transaction_data;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_fraud_stats IS 'Statistiques fraude pour dashboard admin';
GRANT EXECUTE ON FUNCTION get_fraud_stats TO authenticated;

-- 10. Index performances
CREATE INDEX IF NOT EXISTS idx_transactions_created_fraud ON public.transactions(created_at DESC, fraud_score);
CREATE INDEX IF NOT EXISTS idx_transactions_user_fraud ON public.transactions(sender_id, created_at DESC) WHERE fraud_score > 0;

-- Fin migration

