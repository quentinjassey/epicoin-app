-- =====================================================================================
-- Migration: Fix Purchase Fraud Detection System
-- Date: 2026-01-26
-- Description: 
--   1. Corriger purchase_product pour débiter immédiatement lors d'achats suspects
--   2. Corriger approve_fraud_alert pour ne pas re-débiter
--   3. Corriger reject_fraud_alert pour rembourser l'utilisateur
-- =====================================================================================

-- =====================================================================================
-- 1. CORRIGER purchase_product
-- =====================================================================================

CREATE OR REPLACE FUNCTION purchase_product(
  product_id UUID, 
  qty INTEGER DEFAULT 1,
  fraud_score INTEGER DEFAULT 0,
  fraud_features JSONB DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  buyer_id UUID;
  buyer_balance NUMERIC;
  product_price NUMERIC;
  product_stock INTEGER;
  product_name TEXT;
  total_price NUMERIC;
  tx_id UUID;
BEGIN
  -- Get buyer ID from auth context
  buyer_id := auth.uid();
  
  IF buyer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Utilisateur non authentifié');
  END IF;

  -- Validate quantity
  IF qty <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'La quantité doit être positive');
  END IF;

  -- Get product info
  SELECT price_epicoin, stock_quantity, name 
  INTO product_price, product_stock, product_name
  FROM products
  WHERE id = product_id;
  
  IF product_price IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Produit introuvable');
  END IF;

  -- Check stock
  IF product_stock < qty THEN
    RETURN json_build_object('success', false, 'message', 'Stock insuffisant');
  END IF;

  -- Calculate total
  total_price := product_price * qty;

  -- Get buyer balance
  SELECT balance INTO buyer_balance FROM profiles WHERE id = buyer_id;
  
  IF buyer_balance < total_price THEN
    RETURN json_build_object('success', false, 'message', 'Solde insuffisant');
  END IF;

  -- ==================== LOGIQUE BASÉE SUR FRAUD_SCORE ====================
  
  IF fraud_score > 70 THEN
    -- ============ BLOCK ============
    -- Ne PAS débiter, transaction bloquée
    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, fraud_score, fraud_features)
    VALUES (buyer_id, NULL, total_price, 'purchase', 'failed',
            json_build_object('product_id', product_id, 'product_name', product_name, 'quantity', qty, 'block_reason', 'High fraud risk'),
            fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    PERFORM create_fraud_alert(tx_id, fraud_score, 'Achat bloqué - Score de risque élevé', fraud_features);

    RETURN json_build_object(
      'success', false,
      'message', 'Achat bloqué pour des raisons de sécurité',
      'status', 'blocked',
      'fraud_score', fraud_score,
      'transaction_id', tx_id
    );
    
  ELSIF fraud_score > 30 THEN
    -- ============ REVIEW - DÉBITER IMMÉDIATEMENT ============
    -- NOUVEAU: Débiter le solde immédiatement pour réserver les fonds
    UPDATE profiles SET balance = balance - total_price WHERE id = buyer_id;
    
    -- NE PAS décrémenter le stock (il sera décrémenté lors de l'approbation)
    
    -- Créer transaction en pending
    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, fraud_score, fraud_features)
    VALUES (buyer_id, NULL, total_price, 'purchase', 'pending',
            json_build_object(
              'product_id', product_id, 
              'product_name', product_name, 
              'quantity', qty, 
              'unit_price', product_price,
              'review_reason', 'Fraud detection',
              'balance_debited', true
            ),
            fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    PERFORM create_fraud_alert(tx_id, fraud_score, 'Achat en attente de revue manuelle - Fonds réservés', fraud_features);

    RETURN json_build_object(
      'success', true,
      'message', 'Achat mis en attente pour vérification de sécurité. Vos fonds ont été réservés.',
      'status', 'pending_review',
      'fraud_score', fraud_score,
      'transaction_id', tx_id
    );
    
  ELSE
    -- ============ APPROVE - Achat normal ============
    -- 1. Deduct balance
    UPDATE profiles SET balance = balance - total_price WHERE id = buyer_id;
    
    -- 2. Decrease stock
    UPDATE products SET stock_quantity = stock_quantity - qty WHERE id = product_id;
    
    -- 3. Record transaction
    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, fraud_score, fraud_features)
    VALUES (buyer_id, NULL, total_price, 'purchase', 'completed',
            json_build_object('product_id', product_id, 'product_name', product_name, 'quantity', qty, 'unit_price', product_price),
            fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Achat réussi',
      'transaction_id', tx_id,
      'product_name', product_name,
      'quantity', qty,
      'total_price', total_price,
      'fraud_score', fraud_score
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION purchase_product IS 'Acheter un produit avec détection fraude intégrée - Débite immédiatement pour les achats suspects';

-- =====================================================================================
-- 2. CORRIGER approve_fraud_alert
-- =====================================================================================

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
  v_product_stock INTEGER;
  v_quantity INTEGER;
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
    -- ============ TRANSFER ============
    -- Transférer fonds
    UPDATE profiles SET balance = balance - v_amount WHERE id = v_sender_id;
    UPDATE profiles SET balance = balance + v_amount WHERE id = v_receiver_id;
    
    -- Mettre à jour transaction
    UPDATE transactions
    SET status = 'completed'
    WHERE id = v_transaction_id;
    
  ELSIF v_type = 'purchase' THEN
    -- ============ PURCHASE ============
    -- NOUVEAU: Le solde est DÉJÀ débité, on ne fait que :
    -- 1. Vérifier que le stock est encore disponible
    -- 2. Décrémenter le stock
    -- 3. Mettre à jour le statut
    
    v_quantity := (v_metadata->>'quantity')::INTEGER;
    
    SELECT stock_quantity INTO v_product_stock
    FROM products
    WHERE id = (v_metadata->>'product_id')::UUID;
    
    IF v_product_stock IS NULL THEN
      -- Produit supprimé depuis la mise en attente
      -- Rembourser l'utilisateur
      UPDATE profiles SET balance = balance + v_amount WHERE id = v_sender_id;
      UPDATE transactions 
      SET status = 'failed', 
          metadata = v_metadata || jsonb_build_object('failure_reason', 'Produit supprimé', 'refunded', true)
      WHERE id = v_transaction_id;
      
      RETURN json_build_object('success', false, 'message', 'Produit supprimé - Utilisateur remboursé automatiquement');
    END IF;
    
    IF v_product_stock < v_quantity THEN
      -- Stock épuisé depuis la mise en attente
      -- Rembourser l'utilisateur
      UPDATE profiles SET balance = balance + v_amount WHERE id = v_sender_id;
      UPDATE transactions 
      SET status = 'failed', 
          metadata = v_metadata || jsonb_build_object('failure_reason', 'Stock épuisé', 'refunded', true)
      WHERE id = v_transaction_id;
      
      RETURN json_build_object('success', false, 'message', 'Stock épuisé - Utilisateur remboursé automatiquement');
    END IF;
    
    -- Décrémenter le stock maintenant
    UPDATE products
    SET stock_quantity = stock_quantity - v_quantity
    WHERE id = (v_metadata->>'product_id')::UUID;
    
    -- Mettre à jour la transaction en "completed"
    UPDATE transactions
    SET status = 'completed'
    WHERE id = v_transaction_id;
    
  ELSIF v_type = 'topup' THEN
    -- ============ TOPUP ============
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

COMMENT ON FUNCTION approve_fraud_alert IS 'Approuver une alerte fraude et exécuter la transaction - Ne re-débite pas pour les achats';

-- =====================================================================================
-- 3. CORRIGER reject_fraud_alert
-- =====================================================================================

CREATE OR REPLACE FUNCTION reject_fraud_alert(
  p_alert_id UUID,
  p_admin_id UUID,
  p_notes TEXT
) RETURNS JSON AS $$
DECLARE
  v_transaction_id UUID;
  v_sender_id UUID;
  v_amount NUMERIC;
  v_type TEXT;
  v_metadata JSONB;
BEGIN
  -- Vérifier que l'admin est bien admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_admin_id 
    AND (is_admin = TRUE OR email LIKE '%@epitech.digital')
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin rights required');
  END IF;
  
  -- Récupérer transaction_id et infos
  SELECT t.id, t.sender_id, t.amount, t.type, t.metadata
  INTO v_transaction_id, v_sender_id, v_amount, v_type, v_metadata
  FROM fraud_alerts fa
  JOIN transactions t ON t.id = fa.transaction_id
  WHERE fa.id = p_alert_id AND fa.status = 'pending';
  
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
  
  -- Marquer transaction comme failed
  UPDATE transactions
  SET status = 'failed',
      metadata = v_metadata || jsonb_build_object('rejection_reason', p_notes, 'rejected_by_admin', true)
  WHERE id = v_transaction_id;
  
  -- NOUVEAU: Rembourser l'utilisateur si c'est un achat (solde déjà débité)
  IF v_type = 'purchase' AND (v_metadata->>'balance_debited')::BOOLEAN = true THEN
    UPDATE profiles 
    SET balance = balance + v_amount 
    WHERE id = v_sender_id;
    
    -- Mettre à jour metadata pour indiquer le remboursement
    UPDATE transactions
    SET metadata = metadata || jsonb_build_object('refunded', true, 'refund_reason', 'Transaction rejected by admin')
    WHERE id = v_transaction_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Transaction rejected and user refunded',
      'transaction_id', v_transaction_id,
      'refunded_amount', v_amount
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Transaction rejected',
    'transaction_id', v_transaction_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_fraud_alert IS 'Rejeter une alerte fraude et rembourser l''utilisateur si nécessaire';

-- =====================================================================================
-- 4. GRANT PERMISSIONS
-- =====================================================================================

GRANT EXECUTE ON FUNCTION purchase_product TO authenticated;
GRANT EXECUTE ON FUNCTION approve_fraud_alert TO authenticated;
GRANT EXECUTE ON FUNCTION reject_fraud_alert TO authenticated;

-- =====================================================================================
-- Migration completed successfully
-- =====================================================================================
