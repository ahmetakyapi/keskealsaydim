-- V4: Create comparison scenarios table
-- Keşke Alsaydım - Comparison Scenarios schema

-- Comparison scenarios table (Ana özellik)
CREATE TABLE comparison_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- What user actually bought
    symbol_a VARCHAR(20) NOT NULL,
    symbol_a_name VARCHAR(100),

    -- What user could have bought
    symbol_b VARCHAR(20) NOT NULL,
    symbol_b_name VARCHAR(100),

    -- Scenario parameters
    start_date DATE NOT NULL,
    end_date DATE, -- NULL means "until today"
    amount DECIMAL(18, 4) NOT NULL, -- Investment amount in TRY
    amount_type VARCHAR(10) DEFAULT 'MONEY', -- 'MONEY' or 'QUANTITY'

    -- Results (cached)
    result_json JSONB NOT NULL,
    /*
    result_json structure:
    {
        "symbolA": {
            "startPrice": 100.50,
            "endPrice": 150.75,
            "changePercent": 50.0,
            "quantity": 10,
            "startValue": 1005.00,
            "endValue": 1507.50,
            "profit": 502.50,
            "profitPercent": 50.0
        },
        "symbolB": {
            "startPrice": 50.25,
            "endPrice": 120.50,
            "changePercent": 139.8,
            "quantity": 20,
            "startValue": 1005.00,
            "endValue": 2410.00,
            "profit": 1405.00,
            "profitPercent": 139.8
        },
        "difference": {
            "absoluteTL": 902.50,
            "percentagePoints": 89.8,
            "winnerSymbol": "B",
            "missedOpportunity": true
        },
        "metrics": {
            "symbolAVolatility": 25.5,
            "symbolBVolatility": 35.2,
            "correlation": 0.65
        }
    }
    */

    -- Metadata
    title VARCHAR(255), -- User-defined title
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(50) UNIQUE, -- For sharing scenarios
    view_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_comparison_scenarios_user_id ON comparison_scenarios(user_id);
CREATE INDEX idx_comparison_scenarios_symbols ON comparison_scenarios(symbol_a, symbol_b);
CREATE INDEX idx_comparison_scenarios_created_at ON comparison_scenarios(created_at DESC);
CREATE INDEX idx_comparison_scenarios_share_token ON comparison_scenarios(share_token);

-- Trigger to update updated_at
CREATE TRIGGER update_comparison_scenarios_updated_at
    BEFORE UPDATE ON comparison_scenarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
