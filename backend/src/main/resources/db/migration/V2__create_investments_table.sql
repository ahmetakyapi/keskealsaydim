-- V2: Create investments (portfolio) table
-- Keşke Alsaydım - Investments schema

-- Investment status enum
CREATE TYPE investment_status AS ENUM ('OPEN', 'CLOSED', 'PARTIAL');

-- Investments table
CREATE TABLE investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    symbol_name VARCHAR(100),
    exchange VARCHAR(20) DEFAULT 'BIST',
    quantity DECIMAL(18, 8) NOT NULL,
    buy_price DECIMAL(18, 4) NOT NULL,
    buy_date DATE NOT NULL,
    buy_commission DECIMAL(18, 4) DEFAULT 0,
    sell_price DECIMAL(18, 4),
    sell_date DATE,
    sell_commission DECIMAL(18, 4),
    status investment_status DEFAULT 'OPEN',
    currency VARCHAR(3) DEFAULT 'TRY',
    notes TEXT,
    tags VARCHAR(255)[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_investments_symbol ON investments(symbol);
CREATE INDEX idx_investments_status ON investments(status);
CREATE INDEX idx_investments_buy_date ON investments(buy_date);

-- Investment transactions (for partial sells, averaging, etc.)
CREATE TABLE investment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- 'BUY', 'SELL', 'DIVIDEND'
    quantity DECIMAL(18, 8) NOT NULL,
    price DECIMAL(18, 4) NOT NULL,
    commission DECIMAL(18, 4) DEFAULT 0,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_investment_transactions_investment_id ON investment_transactions(investment_id);

-- Trigger to update updated_at
CREATE TRIGGER update_investments_updated_at
    BEFORE UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
