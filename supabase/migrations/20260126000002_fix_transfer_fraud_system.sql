-- =====================================================================================
-- Migration: Fix Transfer Fraud Detection System
-- Date: 2026-01-26
-- Description: Corriger transfer_epicoin pour débiter immédiatement lors de transferts suspects
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

  -- ==================== LOGIQUE BASÉE SUR FRAUD_SCORE ====================
  
  IF fraud_score > 70 THEN
    -- ============ BLOCK ============
    -- Ne PAS débiter, transaction bloquée
    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, scope, fraud_score, fraud_features)
    VALUES (sender_id, receiver_id, amount, 'transfer', 'failed', 
            json_build_object('receiver_email', receiver_email, 'block_reason', 'High fraud risk'),
            tx_scope, fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    -- Créer alerte fraude
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
    -- NOUVEAU: Débiter le sender immédiatement pour réserver les fonds
    UPDATE profiles SET balance = balance - amount WHERE id = sender_id;
    
    -- NE PAS créditer le receiver (il sera crédité lors de l'approbation)
    
    -- Créer transaction en pending
    INSERT INTO transactions (sender_id, receiver_id, amount, type, status, metadata, scope, fraud_score, fraud_features)
    VALUES (sender_id, receiver_id, amount, 'transfer', 'pending', 
            json_build_object(
              'receiver_email', receiver_email, 
              'review_reason', 'Fraud detection triggered',
              'balance_debited', true
            ),
            tx_scope, fraud_score, fraud_features)
    RETURNING id INTO tx_id;

    -- Créer alerte fraude
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
    -- ============ APPROVE - Transaction sûre, exécution normale ============
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
      'fraud_score', fraud_score
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION transfer_epicoin(TEXT, NUMERIC, INTEGER, JSONB) IS 'Transférer des EpiCoins avec détection fraude intégrée - Débite immédiatement pour les transferts suspects';

-- =====================================================================================
-- Grant permissions
-- =====================================================================================

GRANT EXECUTE ON FUNCTION transfer_epicoin(TEXT, NUMERIC, INTEGER, JSONB) TO authenticated;

-- =====================================================================================
-- Migration completed successfully
-- =====================================================================================
