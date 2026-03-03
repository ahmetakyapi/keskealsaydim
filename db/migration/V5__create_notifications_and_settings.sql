-- V5: Create notifications and user settings tables
-- Keşke Alsaydım - Notifications & Settings schema

-- Notification type enum
CREATE TYPE notification_type AS ENUM (
    'PRICE_ALERT',
    'PORTFOLIO_UPDATE',
    'NEWS',
    'SYSTEM',
    'COMPARISON_RESULT'
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data (symbol, price, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- User settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Notification preferences
    notify_price_alerts BOOLEAN DEFAULT TRUE,
    notify_daily_summary BOOLEAN DEFAULT TRUE,
    notify_weekly_report BOOLEAN DEFAULT FALSE,
    notify_news BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,

    -- Display preferences
    default_chart_period VARCHAR(10) DEFAULT '1M', -- 1D, 1W, 1M, 3M, 1Y, ALL
    default_chart_type VARCHAR(20) DEFAULT 'line', -- line, candle, area
    show_portfolio_value BOOLEAN DEFAULT TRUE,
    compact_mode BOOLEAN DEFAULT FALSE,

    -- Regional preferences
    language VARCHAR(5) DEFAULT 'tr',
    timezone VARCHAR(50) DEFAULT 'Europe/Istanbul',
    date_format VARCHAR(20) DEFAULT 'DD.MM.YYYY',
    number_format VARCHAR(20) DEFAULT 'tr-TR',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update updated_at
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create default settings when user is created
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_user_settings_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();
