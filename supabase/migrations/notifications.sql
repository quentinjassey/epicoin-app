-- ============================================
-- NOTIFICATIONS SYSTEM FOR EPIPAY
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Table notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('transfer_received', 'transfer_sent', 'purchase', 'topup', 'fraud_alert', 'fraud_resolved', 'welcome', 'system')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role can insert notifications (from triggers/functions)
CREATE POLICY "Service can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- 2. Table push_tokens
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT DEFAULT 'ios' CHECK (platform IN ('ios', 'android', 'web')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens"
    ON push_tokens FOR ALL
    USING (auth.uid() = user_id);

-- 3. Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    notif_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (p_user_id, p_type, p_title, p_body, p_data)
    RETURNING id INTO notif_id;

    RETURN notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM notifications WHERE user_id = p_user_id AND read = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger: notify on transfer received
CREATE OR REPLACE FUNCTION notify_on_transaction() RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    receiver_name TEXT;
    product_name TEXT;
BEGIN
    -- Get names
    SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
    SELECT full_name INTO receiver_name FROM profiles WHERE id = NEW.receiver_id;

    IF NEW.type = 'transfer' AND NEW.status = 'completed' THEN
        -- Notify receiver
        IF NEW.receiver_id IS NOT NULL THEN
            PERFORM create_notification(
                NEW.receiver_id,
                'transfer_received',
                'Transfert recu',
                format('Vous avez recu %s EPC de %s', NEW.amount, COALESCE(sender_name, 'un utilisateur')),
                jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount, 'sender_name', sender_name)
            );
        END IF;
        -- Notify sender
        IF NEW.sender_id IS NOT NULL THEN
            PERFORM create_notification(
                NEW.sender_id,
                'transfer_sent',
                'Transfert envoye',
                format('%s EPC envoyes a %s', NEW.amount, COALESCE(receiver_name, 'un utilisateur')),
                jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount, 'receiver_name', receiver_name)
            );
        END IF;
    END IF;

    IF (NEW.type = 'purchase' OR NEW.type = 'payment') AND NEW.status = 'completed' THEN
        product_name := NEW.metadata->>'product_name';
        PERFORM create_notification(
            NEW.sender_id,
            'purchase',
            'Achat confirme',
            format('Achat de %s pour %s EPC', COALESCE(product_name, 'un produit'), NEW.amount),
            jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount, 'product_name', product_name)
        );
    END IF;

    IF (NEW.type = 'topup' OR NEW.type = 'top_up') AND NEW.status = 'completed' THEN
        PERFORM create_notification(
            NEW.receiver_id,
            'topup',
            'Rechargement effectue',
            format('%s EPC ajoutes a votre compte', NEW.amount),
            jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount)
        );
    END IF;

    -- Fraud alert notification
    IF NEW.status = 'pending_review' THEN
        PERFORM create_notification(
            COALESCE(NEW.sender_id, NEW.receiver_id),
            'fraud_alert',
            'Verification de securite',
            'Une de vos transactions est en cours de verification par notre equipe.',
            jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_on_transaction ON transactions;
CREATE TRIGGER trigger_notify_on_transaction
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_transaction();

-- 6. Welcome notification on user creation
CREATE OR REPLACE FUNCTION notify_on_user_created() RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_notification(
        NEW.id,
        'welcome',
        'Bienvenue sur EpiPay',
        'Votre compte a ete cree avec succes. Rechargez votre portefeuille pour commencer.',
        jsonb_build_object('user_id', NEW.id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_user_created ON profiles;
CREATE TRIGGER trigger_notify_on_user_created
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_user_created();

-- 7. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
