-- =====================================================================================
-- Migration: Fix race condition on stock and balance during purchases
-- Date: 2026-03-20
-- Description: Utiliser SELECT ... FOR UPDATE pour verrouiller les lignes produit
--              et profil pendant l'achat, empêchant les achats concurrents
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

  -- Lock product row and get info (prevents concurrent stock modification)
  SELECT price_epicoin, stock_quantity, name
  INTO product_price, product_stock, product_name
  FROM products
  WHERE id = product_id
  FOR UPDATE;

  IF product_price IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Produit introuvable');
  END IF;

  -- Check stock (now safe from race condition thanks to FOR UPDATE)
  IF product_stock < qty THEN
    RETURN json_build_object('success', false, 'message', 'Stock insuffisant (disponible: ' || product_stock || ')');
  END IF;

  -- Calculate total
  total_price := product_price * qty;

  -- Lock buyer profile and check balance (prevents concurrent balance modification)
  SELECT balance INTO buyer_balance FROM profiles WHERE id = buyer_id FOR UPDATE;

  IF buyer_balance < total_price THEN
    RETURN json_build_object('success', false, 'message', 'Solde insuffisant');
  END IF;

  -- ==================== LOGIQUE BASÉE SUR FRAUD_SCORE ====================

  IF fraud_score > 70 THEN
    -- ============ BLOCK ============
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
    UPDATE profiles SET balance = balance - total_price WHERE id = buyer_id;

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
    -- ============ APPROVE ============
    UPDATE profiles SET balance = balance - total_price WHERE id = buyer_id;
    UPDATE products SET stock_quantity = stock_quantity - qty WHERE id = product_id;

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

COMMENT ON FUNCTION purchase_product IS 'Acheter un produit avec verrouillage atomique du stock et du solde';

GRANT EXECUTE ON FUNCTION purchase_product TO authenticated;
