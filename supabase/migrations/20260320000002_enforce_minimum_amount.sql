-- =====================================================================================
-- Migration: Enforce minimum amount and 2-decimal precision
-- Date: 2026-03-20
-- Description: Imposer un montant minimum de 0.01 EPC et arrondir à 2 décimales
-- =====================================================================================

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

  -- Round amount to 2 decimal places
  amount := ROUND(amount, 2);

  -- Check minimum amount (0.01 EPC)
  IF amount < 0.01 THEN
    RETURN json_build_object('success', false, 'message', 'Le montant minimum est de 0.01 EPC');
  END IF;

  -- Get receiver ID and campus
  SELECT id, campus INTO receiver_id, receiver_campus FROM profiles WHERE email = receiver_email;

  IF receiver_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  IF receiver_id = sender_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot send money to yourself');
  END IF;

  -- Lock sender row and check balance atomically (prevents race condition)
  SELECT balance, campus INTO sender_balance, sender_campus
    FROM profiles WHERE id = sender_id FOR UPDATE;

  IF sender_balance < amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient funds');
  END IF;

  -- Determine scope
  IF sender_campus = receiver_campus THEN
    tx_scope := 'intra_campus';
  ELSE
    tx_scope := 'inter_campus';
  END IF;

  -- ==================== LOGIQUE BASÉE SUR FRAUD_SCORE ====================

  IF fraud_score > 70 THEN
    -- ============ BLOCK ============
    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, scope, fraud_score, fraud_features)
    VALUES (sender_id, receiver_id, amount, 'transfer', 'failed',
            json_build_object('receiver_email', receiver_email, 'block_reason', 'High fraud risk'),
            tx_scope, fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    PERFORM create_fraud_alert(
      tx_id,
      fraud_score,
      'Transfert automatiquement bloqué - Score de risque élevé',
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
    -- ============ REVIEW - DÉBITER IMMÉDIATEMENT ============
    UPDATE profiles SET balance = balance - amount WHERE id = sender_id;

    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, scope, fraud_score, fraud_features)
    VALUES (sender_id, receiver_id, amount, 'transfer', 'pending',
            json_build_object(
              'receiver_email', receiver_email,
              'review_reason', 'Fraud detection triggered',
              'balance_debited', true
            ),
            tx_scope, fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    PERFORM create_fraud_alert(
      tx_id,
      fraud_score,
      'Transfert en attente de revue manuelle - Fonds réservés',
      fraud_features
    );

    RETURN json_build_object(
      'success', true,
      'message', 'Transaction mise en attente pour vérification de sécurité. Vos fonds ont été réservés.',
      'status', 'pending_review',
      'fraud_score', fraud_score,
      'transaction_id', tx_id
    );

  ELSE
    -- ============ APPROVE ============
    PERFORM 1 FROM profiles WHERE id = receiver_id FOR UPDATE;

    UPDATE profiles SET balance = balance - amount WHERE id = sender_id;
    UPDATE profiles SET balance = balance + amount WHERE id = receiver_id;

    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, scope, fraud_score, fraud_features)
    VALUES (sender_id, receiver_id, amount, 'transfer', 'completed',
            json_build_object('receiver_email', receiver_email),
            tx_scope, fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Transfer successful',
      'transaction_id', tx_id,
      'fraud_score', fraud_score
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION transfer_epicoin(TEXT, NUMERIC, INTEGER, JSONB) IS 'Transférer des EpiCoins avec validation montant, verrouillage atomique et détection fraude';

GRANT EXECUTE ON FUNCTION transfer_epicoin(TEXT, NUMERIC, INTEGER, JSONB) TO authenticated;
