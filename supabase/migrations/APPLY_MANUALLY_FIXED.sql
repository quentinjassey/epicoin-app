-- =====================================================
-- SCRIPT DE MIGRATION MANUEL - VERSION CORRIGÉE
-- À appliquer dans Supabase Dashboard > SQL Editor
-- =====================================================
-- Version corrigée pour gérer les contraintes existantes
-- =====================================================

-- PARTIE 0: Préparation - Supprimer temporairement les contraintes
-- =====================================================

-- Supprimer la contrainte de type existante AVANT d'ajouter les nouvelles colonnes
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

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

-- Remplir initiator_user_id pour les transactions existantes
UPDATE public.transactions
SET initiator_user_id = sender_id
WHERE initiator_user_id IS NULL AND sender_id IS NOT NULL;

-- Remplir provider pour les transactions existantes selon le type
UPDATE public.transactions
SET provider = CASE 
  WHEN type = 'topup' THEN 'stripe'
  ELSE 'wallet'
END
WHERE provider = 'wallet'; -- Valeur par défaut

-- Remplir currency pour toutes les transactions existantes
UPDATE public.transactions
SET currency = 'EPC'
WHERE currency IS NULL;

-- Remplir transaction_type basé sur le type existant
UPDATE public.transactions
SET transaction_type = CASE 
  WHEN type = 'topup' THEN 'CASHIN'
  WHEN type = 'transfer' THEN 'P2P'
  WHEN type = 'purchase' THEN 'MERCHANT'
  WHEN type = 'intercampus' THEN 'INTERCAMPUS'
  ELSE 'P2P'
END
WHERE transaction_type IS NULL;

-- Remplir direction basé sur le type
UPDATE public.transactions
SET direction = CASE 
  WHEN type = 'topup' THEN 'incoming'
  WHEN type IN ('transfer', 'purchase', 'intercampus') THEN 'outgoing'
  ELSE 'outgoing'
END
WHERE direction IS NULL;

-- PARTIE 2: Recréer la contrainte de type (MAINTENANT que tout est à jour)
-- =====================================================

-- Ajouter la nouvelle contrainte de type
ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('topup', 'purchase', 'transfer', 'intercampus'));

-- PARTIE 3: Ajouter les autres contraintes
-- =====================================================

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

-- PARTIE 4: Créer des index pour améliorer les performances
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_initiator ON public.transactions(initiator_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_country ON public.transactions(country);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON public.transactions(provider);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_device_info ON public.transactions USING gin(device_info);

-- PARTIE 5: Créer la table wallets pour le multi-campus
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

-- PARTIE 6: Ajouter foreign keys
-- =====================================================

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS fk_source_wallet;
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_source_wallet 
  FOREIGN KEY (source_wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS fk_destination_wallet;
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_destination_wallet 
  FOREIGN KEY (destination_wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;

-- PARTIE 7: Fonctions utilitaires
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

-- PARTIE 8: Commentaires pour documentation
-- =====================================================

COMMENT ON COLUMN public.transactions.provider IS 'Fournisseur de paiement (stripe, wallet, intercampus)';
COMMENT ON COLUMN public.transactions.provider_tx_id IS 'ID de transaction dans le système du fournisseur externe';
COMMENT ON COLUMN public.transactions.initiator_user_id IS 'Utilisateur à l''origine de l''action';
COMMENT ON COLUMN public.transactions.source_wallet_id IS 'Wallet source pour transactions intercampus';
COMMENT ON COLUMN public.transactions.destination_wallet_id IS 'Wallet destination pour transactions intercampus';
COMMENT ON COLUMN public.transactions.currency IS 'Devise ISO 4217 (EPC, EUR)';
COMMENT ON COLUMN public.transactions.transaction_type IS 'Type normalisé: P2P, MERCHANT, CASHIN, CASHOUT, INTERCAMPUS';
COMMENT ON COLUMN public.transactions.direction IS 'Sens de la transaction: outgoing, incoming';
COMMENT ON COLUMN public.transactions.reason_code IS 'Code d''erreur normalisé en cas d''échec';
COMMENT ON COLUMN public.transactions.provider_created_at IS 'Timestamp du fournisseur de paiement';
COMMENT ON COLUMN public.transactions.executed_at IS 'Timestamp réel d''exécution du transfert';
COMMENT ON COLUMN public.transactions.country IS 'Code pays ISO associé à la transaction';
COMMENT ON COLUMN public.transactions.city IS 'Ville associée à la transaction';
COMMENT ON COLUMN public.transactions.description IS 'Libellé libre décrivant le contexte';
COMMENT ON COLUMN public.transactions.device_info IS 'Métadonnées techniques (IP, user agent, device ID) - RGPD';

COMMENT ON TABLE public.wallets IS 'Wallets pour transactions intercampus (1 wallet = 1 campus)';

-- PARTIE 9: NETTOYAGE (Optionnel - décommenté si souhaité)
-- =====================================================
-- ATTENTION: Ceci supprime TOUTES les transactions et alertes existantes
-- Décommenter UNIQUEMENT si vous voulez repartir de zéro

-- TRUNCATE TABLE public.fraud_alerts CASCADE;
-- TRUNCATE TABLE public.transactions CASCADE;

-- =====================================================
-- FIN DU SCRIPT - VERSION CORRIGÉE
-- =====================================================

-- Vérification finale
SELECT 'Migration completed successfully!' as status;

-- Afficher un résumé
SELECT 
  'Transactions table' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT provider) as unique_providers,
  COUNT(DISTINCT country) as unique_countries
FROM public.transactions
UNION ALL
SELECT 
  'Wallets table' as table_name,
  COUNT(*) as row_count,
  0 as unique_providers,
  0 as unique_countries
FROM public.wallets;
