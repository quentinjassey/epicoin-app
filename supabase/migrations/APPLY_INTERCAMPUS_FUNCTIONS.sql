-- =====================================================
-- SCRIPT DE MIGRATION MANUEL - Fonctions Intercampus
-- À appliquer APRÈS APPLY_MANUALLY_FIXED.sql
-- =====================================================

-- 1. Fonction pour enregistrer une transaction intercampus (incoming - réception)
CREATE OR REPLACE FUNCTION intercampus_receive(
  p_source_wallet_id UUID,
  p_destination_wallet_id UUID,
  p_amount NUMERIC,
  p_initiator_user_id UUID,
  p_provider_tx_id TEXT,
  p_fraud_score INTEGER DEFAULT 0,
  p_fraud_features JSONB DEFAULT '{}',
  p_enriched_data JSONB DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  v_tx_id UUID;
  v_destination_wallet public.wallets;
  v_recipient_id UUID;
BEGIN
  -- Vérifier que le wallet de destination existe et est actif
  SELECT * INTO v_destination_wallet
  FROM public.wallets
  WHERE id = p_destination_wallet_id AND is_active = true;
  
  IF v_destination_wallet.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Wallet de destination introuvable ou inactif',
      'status', 'failed'
    );
  END IF;
  
  -- Vérifier le montant
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Le montant doit être positif',
      'status', 'failed'
    );
  END IF;
  
  -- Logique de détection de fraude
  IF p_fraud_score > 70 THEN
    -- Transaction bloquée
    INSERT INTO public.transactions (
      sender_id, receiver_id, amount, type, status,
      provider, provider_tx_id, initiator_user_id,
      source_wallet_id, destination_wallet_id,
      currency, transaction_type, direction,
      fraud_score, fraud_features,
      country, city, description, device_info,
      metadata, executed_at
    ) VALUES (
      p_initiator_user_id, NULL, p_amount, 'intercampus', 'failed',
      'intercampus', p_provider_tx_id, p_initiator_user_id,
      p_source_wallet_id, p_destination_wallet_id,
      COALESCE((p_enriched_data->>'currency')::TEXT, 'EPC'),
      'INTERCAMPUS', 'incoming',
      p_fraud_score, p_fraud_features,
      (p_enriched_data->>'country')::TEXT,
      (p_enriched_data->>'city')::TEXT,
      (p_enriched_data->>'description')::TEXT,
      (p_enriched_data->'device_info')::JSONB,
      json_build_object('block_reason', 'High fraud risk', 'source_campus', v_destination_wallet.campus_name),
      NOW()
    ) RETURNING id INTO v_tx_id;
    
    -- Créer alerte fraude
    PERFORM create_fraud_alert(
      v_tx_id,
      p_fraud_score,
      'Transaction intercampus bloquée - Score de risque élevé',
      p_fraud_features
    );
    
    RETURN json_build_object(
      'success', false,
      'status', 'blocked',
      'message', 'Transaction bloquée pour suspicion de fraude',
      'transaction_id', v_tx_id,
      'fraud_score', p_fraud_score
    );
    
  ELSIF p_fraud_score > 30 THEN
    -- Transaction en attente de revue
    INSERT INTO public.transactions (
      sender_id, receiver_id, amount, type, status,
      provider, provider_tx_id, initiator_user_id,
      source_wallet_id, destination_wallet_id,
      currency, transaction_type, direction,
      fraud_score, fraud_features,
      country, city, description, device_info,
      metadata, executed_at
    ) VALUES (
      p_initiator_user_id, NULL, p_amount, 'intercampus', 'pending',
      'intercampus', p_provider_tx_id, p_initiator_user_id,
      p_source_wallet_id, p_destination_wallet_id,
      COALESCE((p_enriched_data->>'currency')::TEXT, 'EPC'),
      'INTERCAMPUS', 'incoming',
      p_fraud_score, p_fraud_features,
      (p_enriched_data->>'country')::TEXT,
      (p_enriched_data->>'city')::TEXT,
      (p_enriched_data->>'description')::TEXT,
      (p_enriched_data->'device_info')::JSONB,
      json_build_object('review_reason', 'Fraud detection', 'source_campus', v_destination_wallet.campus_name),
      NOW()
    ) RETURNING id INTO v_tx_id;
    
    PERFORM create_fraud_alert(
      v_tx_id,
      p_fraud_score,
      'Transaction intercampus en attente de revue',
      p_fraud_features
    );
    
    RETURN json_build_object(
      'success', true,
      'status', 'pending_review',
      'message', 'Transaction en attente de vérification de sécurité',
      'transaction_id', v_tx_id,
      'fraud_score', p_fraud_score
    );
    
  ELSE
    -- Transaction approuvée - créditer le wallet
    UPDATE public.wallets
    SET balance = balance + p_amount
    WHERE id = p_destination_wallet_id;
    
    -- Enregistrer la transaction
    INSERT INTO public.transactions (
      sender_id, receiver_id, amount, type, status,
      provider, provider_tx_id, initiator_user_id,
      source_wallet_id, destination_wallet_id,
      currency, transaction_type, direction,
      fraud_score, fraud_features,
      country, city, description, device_info,
      metadata, executed_at
    ) VALUES (
      p_initiator_user_id, NULL, p_amount, 'intercampus', 'completed',
      'intercampus', p_provider_tx_id, p_initiator_user_id,
      p_source_wallet_id, p_destination_wallet_id,
      COALESCE((p_enriched_data->>'currency')::TEXT, 'EPC'),
      'INTERCAMPUS', 'incoming',
      p_fraud_score, p_fraud_features,
      (p_enriched_data->>'country')::TEXT,
      (p_enriched_data->>'city')::TEXT,
      (p_enriched_data->>'description')::TEXT,
      (p_enriched_data->'device_info')::JSONB,
      json_build_object('source_campus', v_destination_wallet.campus_name),
      NOW()
    ) RETURNING id INTO v_tx_id;
    
    RETURN json_build_object(
      'success', true,
      'status', 'completed',
      'message', 'Transaction intercampus réussie',
      'transaction_id', v_tx_id,
      'new_balance', (SELECT balance FROM public.wallets WHERE id = p_destination_wallet_id),
      'fraud_score', p_fraud_score
    );
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'status', 'error',
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION intercampus_receive IS 'Recevoir un paiement d''un autre wallet/campus';

-- 2. Fonction pour enregistrer une transaction intercampus (outgoing - envoi)
CREATE OR REPLACE FUNCTION intercampus_send(
  p_sender_id UUID,
  p_source_wallet_id UUID,
  p_destination_wallet_id UUID,
  p_amount NUMERIC,
  p_provider_tx_id TEXT,
  p_fraud_score INTEGER DEFAULT 0,
  p_fraud_features JSONB DEFAULT '{}',
  p_enriched_data JSONB DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  v_tx_id UUID;
  v_source_wallet public.wallets;
  v_sender_balance NUMERIC;
BEGIN
  -- Vérifier que le wallet source existe et est actif
  SELECT * INTO v_source_wallet
  FROM public.wallets
  WHERE id = p_source_wallet_id AND is_active = true;
  
  IF v_source_wallet.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Wallet source introuvable ou inactif',
      'status', 'failed'
    );
  END IF;
  
  -- Vérifier le montant
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Le montant doit être positif',
      'status', 'failed'
    );
  END IF;
  
  -- Vérifier le solde du wallet
  IF v_source_wallet.balance < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Solde du wallet insuffisant',
      'status', 'failed'
    );
  END IF;
  
  -- Logique de détection de fraude (similaire à intercampus_receive)
  IF p_fraud_score > 70 THEN
    -- Transaction bloquée
    INSERT INTO public.transactions (
      sender_id, receiver_id, amount, type, status,
      provider, provider_tx_id, initiator_user_id,
      source_wallet_id, destination_wallet_id,
      currency, transaction_type, direction,
      fraud_score, fraud_features,
      country, city, description, device_info,
      metadata, executed_at
    ) VALUES (
      p_sender_id, NULL, p_amount, 'intercampus', 'failed',
      'intercampus', p_provider_tx_id, p_sender_id,
      p_source_wallet_id, p_destination_wallet_id,
      COALESCE((p_enriched_data->>'currency')::TEXT, 'EPC'),
      'INTERCAMPUS', 'outgoing',
      p_fraud_score, p_fraud_features,
      (p_enriched_data->>'country')::TEXT,
      (p_enriched_data->>'city')::TEXT,
      (p_enriched_data->>'description')::TEXT,
      (p_enriched_data->'device_info')::JSONB,
      json_build_object('block_reason', 'High fraud risk'),
      NOW()
    ) RETURNING id INTO v_tx_id;
    
    PERFORM create_fraud_alert(
      v_tx_id,
      p_fraud_score,
      'Transaction intercampus sortante bloquée',
      p_fraud_features
    );
    
    RETURN json_build_object(
      'success', false,
      'status', 'blocked',
      'message', 'Transaction bloquée pour suspicion de fraude',
      'transaction_id', v_tx_id,
      'fraud_score', p_fraud_score
    );
    
  ELSIF p_fraud_score > 30 THEN
    -- Transaction en attente
    INSERT INTO public.transactions (
      sender_id, receiver_id, amount, type, status,
      provider, provider_tx_id, initiator_user_id,
      source_wallet_id, destination_wallet_id,
      currency, transaction_type, direction,
      fraud_score, fraud_features,
      country, city, description, device_info,
      metadata, executed_at
    ) VALUES (
      p_sender_id, NULL, p_amount, 'intercampus', 'pending',
      'intercampus', p_provider_tx_id, p_sender_id,
      p_source_wallet_id, p_destination_wallet_id,
      COALESCE((p_enriched_data->>'currency')::TEXT, 'EPC'),
      'INTERCAMPUS', 'outgoing',
      p_fraud_score, p_fraud_features,
      (p_enriched_data->>'country')::TEXT,
      (p_enriched_data->>'city')::TEXT,
      (p_enriched_data->>'description')::TEXT,
      (p_enriched_data->'device_info')::JSONB,
      json_build_object('review_reason', 'Fraud detection'),
      NOW()
    ) RETURNING id INTO v_tx_id;
    
    PERFORM create_fraud_alert(
      v_tx_id,
      p_fraud_score,
      'Transaction intercampus sortante en attente',
      p_fraud_features
    );
    
    RETURN json_build_object(
      'success', true,
      'status', 'pending_review',
      'message', 'Transaction en attente de vérification',
      'transaction_id', v_tx_id,
      'fraud_score', p_fraud_score
    );
    
  ELSE
    -- Transaction approuvée - débiter le wallet
    UPDATE public.wallets
    SET balance = balance - p_amount
    WHERE id = p_source_wallet_id;
    
    -- Enregistrer la transaction
    INSERT INTO public.transactions (
      sender_id, receiver_id, amount, type, status,
      provider, provider_tx_id, initiator_user_id,
      source_wallet_id, destination_wallet_id,
      currency, transaction_type, direction,
      fraud_score, fraud_features,
      country, city, description, device_info,
      metadata, executed_at
    ) VALUES (
      p_sender_id, NULL, p_amount, 'intercampus', 'completed',
      'intercampus', p_provider_tx_id, p_sender_id,
      p_source_wallet_id, p_destination_wallet_id,
      COALESCE((p_enriched_data->>'currency')::TEXT, 'EPC'),
      'INTERCAMPUS', 'outgoing',
      p_fraud_score, p_fraud_features,
      (p_enriched_data->>'country')::TEXT,
      (p_enriched_data->>'city')::TEXT,
      (p_enriched_data->>'description')::TEXT,
      (p_enriched_data->'device_info')::JSONB,
      json_build_object('destination_campus', 
        (SELECT campus_name FROM public.wallets WHERE id = p_destination_wallet_id)),
      NOW()
    ) RETURNING id INTO v_tx_id;
    
    RETURN json_build_object(
      'success', true,
      'status', 'completed',
      'message', 'Transaction intercampus envoyée avec succès',
      'transaction_id', v_tx_id,
      'new_balance', (SELECT balance FROM public.wallets WHERE id = p_source_wallet_id),
      'fraud_score', p_fraud_score
    );
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'status', 'error',
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION intercampus_send IS 'Envoyer un paiement vers un autre wallet/campus';

-- 3. Fonction utilitaire pour générer et hasher une API key
CREATE OR REPLACE FUNCTION generate_wallet_api_key()
RETURNS TEXT AS $$
DECLARE
  v_api_key TEXT;
BEGIN
  -- Générer une clé aléatoire (32 caractères)
  v_api_key := encode(gen_random_bytes(24), 'base64');
  v_api_key := replace(v_api_key, '/', '_');
  v_api_key := replace(v_api_key, '+', '-');
  
  RETURN 'epw_' || v_api_key;
END;
$$ LANGUAGE plpgsql;

-- 4. Fonction pour vérifier une API key wallet
CREATE OR REPLACE FUNCTION verify_wallet_api_key(
  p_campus_id TEXT,
  p_api_key TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_api_key_hash TEXT;
  v_stored_hash TEXT;
BEGIN
  -- Hasher la clé fournie
  v_api_key_hash := encode(digest(p_api_key, 'sha256'), 'hex');
  
  -- Récupérer le hash stocké
  SELECT api_key_hash INTO v_stored_hash
  FROM public.wallets
  WHERE campus_id = p_campus_id AND is_active = true;
  
  IF v_stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN v_api_key_hash = v_stored_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION intercampus_receive TO authenticated;
GRANT EXECUTE ON FUNCTION intercampus_send TO authenticated;
GRANT EXECUTE ON FUNCTION generate_wallet_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION verify_wallet_api_key TO authenticated;

-- Vérification finale
SELECT 'Intercampus functions created successfully!' as status;
