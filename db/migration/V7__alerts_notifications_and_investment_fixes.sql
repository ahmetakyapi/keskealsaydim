-- V7: Reconcile the schema with what the application actually reads.
--
-- The deployed database was not built from V1–V6; it is missing several
-- tables, columns and enums those files declare (price_alerts,
-- investment_transactions, the investments sell/commission columns, the
-- user_settings display columns). This migration therefore brings the schema
-- to the target state from EITHER starting point, and is safe to re-run:
-- every statement is guarded.
--
-- Deliberately not converting notifications.type from varchar to an enum:
-- the column already holds the right literals, the Go handlers read and write
-- it as text, and an in-place type rewrite on live rows buys nothing. A CHECK
-- constraint gives the same guarantee without the rewrite.

BEGIN;

-- ── Enums ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_direction') THEN
        CREATE TYPE alert_direction AS ENUM ('ABOVE', 'BELOW', 'CROSS');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_status') THEN
        CREATE TYPE alert_status AS ENUM ('ACTIVE', 'TRIGGERED', 'CANCELLED', 'EXPIRED');
    END IF;
END $$;

-- ── Price alerts ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    target_price DECIMAL(18, 4) NOT NULL,
    direction alert_direction NOT NULL,
    status alert_status DEFAULT 'ACTIVE',
    message TEXT,
    notify_email BOOLEAN DEFAULT TRUE,
    notify_push BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMP WITH TIME ZONE,
    triggered_price DECIMAL(18, 4),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- The alert list renders a name without joining anything.
ALTER TABLE price_alerts ADD COLUMN IF NOT EXISTS symbol_name VARCHAR(100);
ALTER TABLE price_alerts
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

UPDATE price_alerts SET symbol_name = symbol WHERE symbol_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
-- Every screen load reads "my active alerts".
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_status ON price_alerts(user_id, status);

-- ── Investment transactions ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS investment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL,
    quantity DECIMAL(18, 8) NOT NULL,
    price DECIMAL(18, 4) NOT NULL,
    commission DECIMAL(18, 4) DEFAULT 0,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investment_transactions_investment_id
    ON investment_transactions(investment_id);

-- ── Investments: the sell/close and commission columns the app writes ───────

ALTER TABLE investments ADD COLUMN IF NOT EXISTS buy_commission DECIMAL(18, 4) DEFAULT 0;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS sell_price DECIMAL(18, 4);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS sell_date DATE;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS sell_commission DECIMAL(18, 4);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS tags VARCHAR(255)[];

UPDATE investments SET buy_commission = 0 WHERE buy_commission IS NULL;

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_symbol ON investments(symbol);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_buy_date ON investments(buy_date);
-- Portfolio reads are always scoped to one user's open positions.
CREATE INDEX IF NOT EXISTS idx_investments_user_status ON investments(user_id, status);

-- NOT VALID: the constraints apply to new writes without forcing a scan of
-- existing rows, which may predate the rule.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'investments_closed_needs_sell_data'
    ) THEN
        ALTER TABLE investments
            ADD CONSTRAINT investments_closed_needs_sell_data
            CHECK (
                status <> 'CLOSED'
                OR (sell_price IS NOT NULL AND sell_date IS NOT NULL)
            ) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'investments_quantity_positive'
    ) THEN
        ALTER TABLE investments
            ADD CONSTRAINT investments_quantity_positive CHECK (quantity > 0) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'investments_buy_price_positive'
    ) THEN
        ALTER TABLE investments
            ADD CONSTRAINT investments_buy_price_positive CHECK (buy_price > 0) NOT VALID;
    END IF;
END $$;

-- ── User settings: the display columns the settings screen exposes ──────────

ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS default_chart_period VARCHAR(10) DEFAULT '1M';
ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS default_chart_type VARCHAR(20) DEFAULT 'line';
ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS show_portfolio_value BOOLEAN DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'tr';
ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Istanbul';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD.MM.YYYY';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS number_format VARCHAR(20) DEFAULT 'tr-TR';

UPDATE user_settings SET default_chart_period = '1M' WHERE default_chart_period IS NULL;
UPDATE user_settings SET show_portfolio_value = TRUE WHERE show_portfolio_value IS NULL;

-- Every account needs a settings row; back-fill the ones created before the
-- trigger below existed.
INSERT INTO user_settings (user_id)
SELECT u.id FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_settings s WHERE s.user_id = u.id);

-- ── Notifications ──────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_valid') THEN
        ALTER TABLE notifications
            ADD CONSTRAINT notifications_type_valid
            CHECK (type IN ('PRICE_ALERT', 'PORTFOLIO_UPDATE', 'NEWS', 'SYSTEM', 'COMPARISON_RESULT'))
            NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
-- The unread badge runs COUNT(*) FILTER (WHERE is_read = FALSE) per user.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read, created_at DESC);

-- ── Comparison scenarios ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_comparison_scenarios_user_id ON comparison_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_comparison_scenarios_created_at
    ON comparison_scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comparison_scenarios_share_token
    ON comparison_scenarios(share_token);
CREATE INDEX IF NOT EXISTS idx_comparison_scenarios_user_favorite
    ON comparison_scenarios(user_id, is_favorite, created_at DESC);

-- ── Watchlist & sessions ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);

CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
-- Refresh rotation looks up live sessions; expired rows are pruned by date.
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
    ON user_sessions(expires_at) WHERE revoked_at IS NULL;

-- ── Triggers ───────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_price_alerts_updated_at ON price_alerts;
CREATE TRIGGER update_price_alerts_updated_at
    BEFORE UPDATE ON price_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- New accounts get their settings row without the API having to ask for one.
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_user_settings_trigger ON users;
CREATE TRIGGER create_user_settings_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();

COMMIT;
