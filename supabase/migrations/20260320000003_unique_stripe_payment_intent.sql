-- =====================================================================================
-- Migration: Unique constraint on stripe_payment_intent_id
-- Date: 2026-03-20
-- Description: Empêcher les doublons de transactions Stripe via un index unique
-- =====================================================================================

-- Index unique partiel sur le payment_intent_id dans metadata (seulement pour les topups Stripe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_stripe_payment_intent
  ON transactions ((metadata->>'stripe_payment_intent_id'))
  WHERE metadata->>'stripe_payment_intent_id' IS NOT NULL;
