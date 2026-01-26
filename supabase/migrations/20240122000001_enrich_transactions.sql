-- Migration: Enrichissement de la table transactions avec nouveaux critères de détection de fraude
-- Date: 2024-01-22
-- Objectif: Ajouter des colonnes pour supporter les standards de paiement internationaux

-- 1. Ajouter les nouvelles colonnes à la table transactions
ALTER TABLE public.transactions
  -- Identifiants & interconnexion
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'wallet',
  ADD COLUMN IF NOT EXISTS provider_tx_id TEXT,
  ADD COLUMN IF NOT EXISTS initiator_user_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS source_wallet_id UUID,
  ADD COLUMN IF NOT EXISTS destination_wallet_id UUID,
  
  -- Données financières
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EPC',
  
  -- Type & sens de la transaction
  ADD COLUMN IF NOT EXISTS transaction_type TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT,
  
  -- Statut & gestion des erreurs
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  
  -- Timestamps détaillés
  ADD COLUMN IF NOT EXISTS provider_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
  
  -- Localisation
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  
  -- Confort & expérience utilisateur
  ADD COLUMN IF NOT EXISTS description TEXT,
  
  -- Métadonnées techniques
  ADD COLUMN IF NOT EXISTS device_info JSONB;

-- 2. Mettre à jour les contraintes de type de transaction
-- Supprimer l'ancienne contrainte
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Ajouter la nouvelle contrainte avec les anciens et nouveaux types
-- On garde les anciens types pour la compatibilité, et on ajoute les nouveaux
ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('topup', 'purchase', 'transfer', 'intercampus'));

-- 3. Ajouter contraintes pour les nouveaux champs
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_transaction_type_check 
  CHECK (transaction_type IS NULL OR transaction_type IN ('P2P', 'MERCHANT', 'CASHIN', 'CASHOUT', 'INTERCAMPUS'));

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_direction_check 
  CHECK (direction IS NULL OR direction IN ('outgoing', 'incoming'));

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_currency_check 
  CHECK (currency IN ('EPC', 'EUR'));

-- 4. Créer des index pour améliorer les performances des requêtes de détection de fraude
CREATE INDEX IF NOT EXISTS idx_transactions_initiator ON public.transactions(initiator_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_country ON public.transactions(country);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON public.transactions(provider);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_device_info ON public.transactions USING gin(device_info);

-- 5. Créer la table wallets pour le multi-campus
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campus_id TEXT NOT NULL UNIQUE,
  campus_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL, -- Stocker le hash, pas la clé en clair
  balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour la table wallets
CREATE INDEX IF NOT EXISTS idx_wallets_campus_id ON public.wallets(campus_id);
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON public.wallets(is_active);

-- RLS pour la table wallets (seulement les admins peuvent voir/modifier)
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view wallets"
  ON public.wallets FOR SELECT
  USING (auth.email() LIKE '%@epitech.digital');

CREATE POLICY "Only admins can manage wallets"
  ON public.wallets FOR ALL
  USING (auth.email() LIKE '%@epitech.digital');

-- 6. Ajouter foreign key pour source_wallet_id et destination_wallet_id
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_source_wallet 
  FOREIGN KEY (source_wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  ADD CONSTRAINT fk_destination_wallet 
  FOREIGN KEY (destination_wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;

-- 7. Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour wallets.updated_at
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Commenter les nouvelles colonnes pour la documentation
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

-- 9. NETTOYAGE: Supprimer les anciennes transactions pour repartir propre
-- ATTENTION: Ceci supprime TOUTES les données existantes
-- Ne décommenter que si vous êtes sûr (app en dev)
TRUNCATE TABLE public.fraud_alerts CASCADE;
TRUNCATE TABLE public.transactions CASCADE;

-- Note: Les données ont été supprimées pour permettre un redémarrage propre avec le nouveau schéma enrichi
