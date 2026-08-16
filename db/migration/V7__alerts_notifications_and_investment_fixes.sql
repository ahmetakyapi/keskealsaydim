-- V7: Close the gaps between the schema and the features the app actually ships.
--   * price_alerts gained a display name so the alert list does not need a join.
--   * investments needed the sell/close columns to be reachable and indexed.
--   * notifications needed a composite index for the unread-count query.
--   * comparison_scenarios needed a favourite index for the saved-scenario tab.

BEGIN;

-- ── Price alerts ───────────────────────────────────────────────────────────

ALTER TABLE price_alerts
    ADD COLUMN IF NOT EXISTS symbol_name VARCHAR(100);

UPDATE price_alerts SET symbol_name = symbol WHERE symbol_name IS NULL;

ALTER TABLE price_alerts
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- The alert list reads "my active alerts" on every screen load.
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_status
    ON price_alerts(user_id, status);

-- ── Notifications ──────────────────────────────────────────────────────────

-- The unread badge runs COUNT(*) FILTER (WHERE is_read = FALSE) per user.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read, created_at DESC);

-- ── Investments ────────────────────────────────────────────────────────────

-- Portfolio reads are always scoped to one user's open positions.
CREATE INDEX IF NOT EXISTS idx_investments_user_status
    ON investments(user_id, status);

-- A closed position must record what it was closed at.
ALTER TABLE investments
    ADD CONSTRAINT investments_closed_needs_sell_data
    CHECK (
        status <> 'CLOSED'
        OR (sell_price IS NOT NULL AND sell_date IS NOT NULL)
    )
    NOT VALID;

ALTER TABLE investments
    ADD CONSTRAINT investments_quantity_positive CHECK (quantity > 0) NOT VALID;

ALTER TABLE investments
    ADD CONSTRAINT investments_buy_price_positive CHECK (buy_price > 0) NOT VALID;

-- ── Comparison scenarios ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_comparison_scenarios_user_favorite
    ON comparison_scenarios(user_id, is_favorite, created_at DESC);

-- ── Sessions ───────────────────────────────────────────────────────────────

-- Refresh rotation looks up live sessions; expired rows are pruned by date.
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
    ON user_sessions(expires_at)
    WHERE revoked_at IS NULL;

COMMIT;
