-- =====================================================
-- SCRIPT DE MIGRATION MANUEL
-- À appliquer dans Supabase Dashboard > SQL Editor
-- =====================================================
-- Ce script contient toutes les modifications nécessaires
-- pour enrichir le système de détection de fraude
-- =====================================================

-- PARTIE 1: Enrichissement de la table transactions
-- =====================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'wallet',
  ADD COLUMN IF NOT EXISTS provider_tx_id TEXT,
  ADD COLUMN IF NOT EXISTS initiator_user_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS source_wallet_id UUID,
  ADD COLUMN IF NOT EXISTS destination_wallet_id UUID,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EPC',
  ADD COLUMN IF NOT EXISTS transaction_type TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT,
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS provider_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Mise à jour des contraintes
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('topup', 'purchase', 'transfer', 'intercampus'));

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_transaction_type_check 
  CHECK (transaction_type IS NULL OR transaction_type IN ('P2P', 'MERCHANT', 'CASHIN', 'CASHOUT', 'INTERCAMPUS'));

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_direction_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_direction_check 
  CHECK (direction IS NULL OR direction IN ('outgoing', 'incoming'));

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_currency_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_currency_check 
  CHECK (currency IN ('EPC', 'EUR'));

-- Création d'index
CREATE INDEX IF NOT EXISTS idx_transactions_initiator ON public.transactions(initiator_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_country ON public.transactions(country);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON public.transactions(provider);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_device_info ON public.transactions USING gin(device_info);

-- PARTIE 2: Création de la table wallets
-- =====================================================

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campus_id TEXT NOT NULL UNIQUE,
  campus_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallets_campus_id ON public.wallets(campus_id);
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON public.wallets(is_active);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view wallets" ON public.wallets;
CREATE POLICY "Only admins can view wallets"
  ON public.wallets FOR SELECT
  USING (auth.email() LIKE '%@epitech.digital');

DROP POLICY IF EXISTS "Only admins can manage wallets" ON public.wallets;
CREATE POLICY "Only admins can manage wallets"
  ON public.wallets FOR ALL
  USING (auth.email() LIKE '%@epitech.digital');

-- Ajouter foreign keys
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS fk_source_wallet;
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_source_wallet 
  FOREIGN KEY (source_wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS fk_destination_wallet;
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_destination_wallet 
  FOREIGN KEY (destination_wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;

-- PARTIE 3: Fonctions utilitaires
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- PARTIE 4: Fonctions intercampus
-- =====================================================

-- Voir le fichier 20240122000002_intercampus_functions.sql
-- pour les fonctions complètes intercampus_receive, intercampus_send, etc.

-- PARTIE 5: NETTOYAGE (Optionnel - décommenter si nécessaire)
-- =====================================================
-- ATTENTION: Ceci supprime TOUTES les transactions et alertes existantes

-- TRUNCATE TABLE public.fraud_alerts CASCADE;
-- TRUNCATE TABLE public.transactions CASCADE;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
-- Après l'application de ce script, vous devez:
-- 1. Redéployer les Edge Functions
-- 2. Tester les nouvelles transactions
-- =====================================================
