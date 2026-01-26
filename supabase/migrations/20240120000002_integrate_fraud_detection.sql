-- Migration: Intégration détection fraude dans fonctions existantes
-- Date: 2026-01-20
-- Objectif: Modifier transfer_epicoin, purchase_product pour intégrer fraud detection

-- Note: La détection fraude sera appelée depuis l'Edge Function avant d'appeler ces fonctions SQL
-- Ces fonctions acceptent maintenant fraud_score et fraud_features

-- 1. Mettre à jour fonction transfer_epicoin avec support fraud detection
CREATE OR REPLACE FUNCTION transfer_epicoin(
  receiver_email TEXT,
  amount NUMERIC,
  fraud_score INTEGER DEFAULT 0,
  fraud_features JSONB DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  sender_id UUID;
  receiver_id UUID;
  sender_balance NUMERIC;
  sender_campus TEXT;
  receiver_campus TEXT;
  tx_id UUID;
  tx_scope TEXT;
  should_review BOOLEAN := FALSE;
BEGIN
  -- Get sender ID from auth context
  sender_id := auth.uid();
  
  -- Check if amount is positive
  IF amount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Amount must be positive');
  END IF;

  -- Get receiver ID and campus
  SELECT id, campus INTO receiver_id, receiver_campus FROM profiles WHERE email = receiver_email;
  
  IF receiver_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  IF receiver_id = sender_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot send money to yourself');
  END IF;

  -- Get sender balance and campus
  SELECT balance, campus INTO sender_balance, sender_campus FROM profiles WHERE id = sender_id;
  
  IF sender_balance < amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient funds');
  END IF;

  -- Determine scope
  IF sender_campus = receiver_campus THEN
    tx_scope := 'intra_campus';
  ELSE
    tx_scope := 'inter_campus';
  END IF;

  -- NOUVEAU: Logique basée sur fraud_score
  -- Score 0-30: Approve automatiquement
  -- Score 31-70: Pending review
  -- Score 71-100: Block
  
  IF fraud_score > 70 THEN
    -- BLOCK: Transaction bloquée automatiquement
    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, scope, fraud_score, fraud_features)
    VALUES (sender_id, receiver_id, amount, 'transfer', 'failed', 
            json_build_object('receiver_email', receiver_email, 'block_reason', 'High fraud risk'),
            tx_scope, fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    -- Créer alerte fraude
    PERFORM create_fraud_alert(
      tx_id,
      fraud_score,
      'Transaction automatiquement bloquée - Score de risque élevé',
      fraud_features
    );

    RETURN json_build_object(
      'success', false, 
      'message', 'Transaction bloquée pour des raisons de sécurité',
      'status', 'blocked',
      'fraud_score', fraud_score,
      'transaction_id', tx_id
    );
    
  ELSIF fraud_score > 30 THEN
    -- REVIEW: Transaction en attente de revue manuelle
    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, scope, fraud_score, fraud_features)
    VALUES (sender_id, receiver_id, amount, 'transfer', 'pending', 
            json_build_object('receiver_email', receiver_email, 'review_reason', 'Fraud detection triggered'),
            tx_scope, fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    -- Créer alerte fraude
    PERFORM create_fraud_alert(
      tx_id,
      fraud_score,
      'Transaction en attente de revue manuelle',
      fraud_features
    );

    RETURN json_build_object(
      'success', true,
      'message', 'Transaction mise en attente pour vérification de sécurité',
      'status', 'pending_review',
      'fraud_score', fraud_score,
      'transaction_id', tx_id
    );
    
  ELSE
    -- APPROVE: Transaction sûre, exécution normale
    -- Transférer fonds (atomic)
    UPDATE profiles SET balance = balance - amount WHERE id = sender_id;
    UPDATE profiles SET balance = balance + amount WHERE id = receiver_id;

    -- Enregistrer transaction
    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, scope, fraud_score, fraud_features)
    VALUES (sender_id, receiver_id, amount, 'transfer', 'completed', 
            json_build_object('receiver_email', receiver_email),
            tx_scope, fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Transfer successful',
      'transaction_id', tx_id,
      'scope', tx_scope,
      'fraud_score', fraud_score
    );
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION transfer_epicoin IS 'Transférer EpiCoins avec détection fraude intégrée';

-- 2. Mettre à jour fonction purchase_product avec support fraud detection
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

  -- NOUVEAU: Logique basée sur fraud_score
  IF fraud_score > 70 THEN
    -- BLOCK
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
    -- REVIEW
    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, fraud_score, fraud_features)
    VALUES (buyer_id, NULL, total_price, 'purchase', 'pending',
            json_build_object('product_id', product_id, 'product_name', product_name, 'quantity', qty, 'review_reason', 'Fraud detection'),
            fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    PERFORM create_fraud_alert(tx_id, fraud_score, 'Achat en attente de revue manuelle', fraud_features);

    RETURN json_build_object(
      'success', true,
      'message', 'Achat mis en attente pour vérification de sécurité',
      'status', 'pending_review',
      'fraud_score', fraud_score,
      'transaction_id', tx_id
    );
    
  ELSE
    -- APPROVE: Achat normal
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

COMMENT ON FUNCTION purchase_product IS 'Acheter un produit avec détection fraude intégrée';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION transfer_epicoin TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_product TO authenticated;

-- Note: Pour top-up (confirm-payment), l'intégration se fait dans l'Edge Function TypeScript
-- car c'est déjà une Edge Function, pas une fonction SQL

-- Fin migration

