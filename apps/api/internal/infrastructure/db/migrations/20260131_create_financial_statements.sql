-- Migration: Create financial statements tables
-- Date: 2026-01-31
-- Description: Long-term storage for quarterly and annual financial statements

-- ============================================================================
-- 1. FINANCIAL PERIODS - Core metadata linking all statements
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_periods (
    id              BIGSERIAL PRIMARY KEY,
    ticker          VARCHAR(10) NOT NULL,
    period_type     VARCHAR(10) NOT NULL CHECK (period_type IN ('annual', 'quarterly')),
    period_end      DATE NOT NULL,
    fiscal_year     INTEGER NOT NULL,
    fiscal_quarter  INTEGER CHECK (fiscal_quarter BETWEEN 1 AND 4),
    filing_date     DATE,
    accepted_date   TIMESTAMP,
    source          VARCHAR(20) NOT NULL DEFAULT 'fmp',
    fetched_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_financial_periods_ticker_period
        UNIQUE (ticker, period_type, period_end)
);

CREATE INDEX idx_financial_periods_ticker ON financial_periods(ticker);
CREATE INDEX idx_financial_periods_ticker_period_end ON financial_periods(ticker, period_end DESC);
CREATE INDEX idx_financial_periods_period_type ON financial_periods(period_type);

COMMENT ON TABLE financial_periods IS 'Core metadata for financial reporting periods';
COMMENT ON COLUMN financial_periods.period_type IS 'annual or quarterly';
COMMENT ON COLUMN financial_periods.fiscal_quarter IS 'NULL for annual periods, 1-4 for quarterly';

-- ============================================================================
-- 2. INCOME STATEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS income_statements (
    id                          BIGSERIAL PRIMARY KEY,
    period_id                   BIGINT NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,

    -- Revenue
    revenue                     BIGINT,
    cost_of_revenue             BIGINT,
    gross_profit                BIGINT,

    -- Operating expenses
    research_and_development    BIGINT,
    selling_general_admin       BIGINT,
    operating_expenses          BIGINT,
    operating_income            BIGINT,

    -- Non-operating
    interest_income             BIGINT,
    interest_expense            BIGINT,
    other_income_expense        BIGINT,
    income_before_tax           BIGINT,
    income_tax_expense          BIGINT,

    -- Net income
    net_income                  BIGINT,
    net_income_to_common        BIGINT,

    -- Per share
    eps_basic                   DECIMAL(12,4),
    eps_diluted                 DECIMAL(12,4),
    weighted_avg_shares_basic   BIGINT,
    weighted_avg_shares_diluted BIGINT,

    -- Other
    ebitda                      BIGINT,
    depreciation_amortization   BIGINT,

    -- Store any fields we don't explicitly model
    raw_data                    JSONB,

    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_income_statements_period UNIQUE (period_id)
);

CREATE INDEX idx_income_statements_period_id ON income_statements(period_id);

COMMENT ON TABLE income_statements IS 'Income statement data linked to financial periods';
COMMENT ON COLUMN income_statements.raw_data IS 'Original provider response for unmapped fields';

-- ============================================================================
-- 3. BALANCE SHEETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS balance_sheets (
    id                              BIGSERIAL PRIMARY KEY,
    period_id                       BIGINT NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,

    -- Current Assets
    cash_and_equivalents            BIGINT,
    short_term_investments          BIGINT,
    cash_and_short_term             BIGINT,
    accounts_receivable             BIGINT,
    inventory                       BIGINT,
    other_current_assets            BIGINT,
    total_current_assets            BIGINT,

    -- Non-current Assets
    property_plant_equipment_net    BIGINT,
    goodwill                        BIGINT,
    intangible_assets               BIGINT,
    long_term_investments           BIGINT,
    other_non_current_assets        BIGINT,
    total_non_current_assets        BIGINT,
    total_assets                    BIGINT,

    -- Current Liabilities
    accounts_payable                BIGINT,
    short_term_debt                 BIGINT,
    current_portion_long_term_debt  BIGINT,
    deferred_revenue                BIGINT,
    other_current_liabilities       BIGINT,
    total_current_liabilities       BIGINT,

    -- Non-current Liabilities
    long_term_debt                  BIGINT,
    deferred_tax_liabilities        BIGINT,
    other_non_current_liabilities   BIGINT,
    total_non_current_liabilities   BIGINT,
    total_liabilities               BIGINT,

    -- Equity
    common_stock                    BIGINT,
    retained_earnings               BIGINT,
    accumulated_other_comprehensive BIGINT,
    treasury_stock                  BIGINT,
    total_stockholders_equity       BIGINT,
    minority_interest               BIGINT,
    total_equity                    BIGINT,

    -- Computed/Derived
    total_debt                      BIGINT,
    net_debt                        BIGINT,

    -- Store any fields we don't explicitly model
    raw_data                        JSONB,

    created_at                      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_balance_sheets_period UNIQUE (period_id)
);

CREATE INDEX idx_balance_sheets_period_id ON balance_sheets(period_id);

COMMENT ON TABLE balance_sheets IS 'Balance sheet data linked to financial periods';

-- ============================================================================
-- 4. CASH FLOW STATEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cash_flow_statements (
    id                              BIGSERIAL PRIMARY KEY,
    period_id                       BIGINT NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,

    -- Operating Activities
    net_income                      BIGINT,
    depreciation_amortization       BIGINT,
    deferred_income_tax             BIGINT,
    stock_based_compensation        BIGINT,
    change_in_working_capital       BIGINT,
    change_in_receivables           BIGINT,
    change_in_inventory             BIGINT,
    change_in_payables              BIGINT,
    other_operating_activities      BIGINT,
    operating_cash_flow             BIGINT,

    -- Investing Activities
    capital_expenditures            BIGINT,
    acquisitions                    BIGINT,
    purchases_of_investments        BIGINT,
    sales_of_investments            BIGINT,
    other_investing_activities      BIGINT,
    investing_cash_flow             BIGINT,

    -- Financing Activities
    debt_repayment                  BIGINT,
    debt_issuance                   BIGINT,
    common_stock_repurchased        BIGINT,
    common_stock_issued             BIGINT,
    dividends_paid                  BIGINT,
    other_financing_activities      BIGINT,
    financing_cash_flow             BIGINT,

    -- Net Change
    effect_of_forex                 BIGINT,
    net_change_in_cash              BIGINT,
    cash_at_beginning               BIGINT,
    cash_at_end                     BIGINT,

    -- Computed: Free Cash Flow = Operating Cash Flow + CapEx (capex is negative)
    free_cash_flow                  BIGINT GENERATED ALWAYS AS (
        COALESCE(operating_cash_flow, 0) + COALESCE(capital_expenditures, 0)
    ) STORED,

    -- Store any fields we don't explicitly model
    raw_data                        JSONB,

    created_at                      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_cash_flow_statements_period UNIQUE (period_id)
);

CREATE INDEX idx_cash_flow_statements_period_id ON cash_flow_statements(period_id);

COMMENT ON TABLE cash_flow_statements IS 'Cash flow statement data linked to financial periods';
COMMENT ON COLUMN cash_flow_statements.capital_expenditures IS 'Typically negative (cash outflow)';
COMMENT ON COLUMN cash_flow_statements.free_cash_flow IS 'Computed: operating_cash_flow + capital_expenditures';

-- ============================================================================
-- 5. REVENUE SEGMENTS - Multiple rows per period
-- ============================================================================

CREATE TABLE IF NOT EXISTS revenue_segments (
    id              BIGSERIAL PRIMARY KEY,
    period_id       BIGINT NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,
    segment_type    VARCHAR(20) NOT NULL CHECK (segment_type IN ('product', 'geography', 'other')),
    segment_name    VARCHAR(100) NOT NULL,
    revenue         BIGINT NOT NULL,
    percentage      DECIMAL(5,2),

    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_revenue_segments_period_type_name
        UNIQUE (period_id, segment_type, segment_name)
);

CREATE INDEX idx_revenue_segments_period_id ON revenue_segments(period_id);
CREATE INDEX idx_revenue_segments_segment_type ON revenue_segments(segment_type);

COMMENT ON TABLE revenue_segments IS 'Revenue breakdown by product line or geography';
COMMENT ON COLUMN revenue_segments.segment_type IS 'product, geography, or other';
COMMENT ON COLUMN revenue_segments.percentage IS 'Percentage of total revenue';

-- ============================================================================
-- 6. CONSOLIDATED VIEW - Join all tables with computed margins
-- ============================================================================

CREATE OR REPLACE VIEW v_financials AS
SELECT
    fp.id AS period_id,
    fp.ticker,
    fp.period_type,
    fp.period_end,
    fp.fiscal_year,
    fp.fiscal_quarter,
    fp.filing_date,

    -- Income Statement
    i.revenue,
    i.gross_profit,
    i.operating_income,
    i.net_income,
    i.eps_diluted,
    i.ebitda,

    -- Computed Margins (as percentages)
    CASE WHEN i.revenue > 0 THEN
        ROUND((i.gross_profit::DECIMAL / i.revenue) * 100, 2)
    END AS gross_margin,
    CASE WHEN i.revenue > 0 THEN
        ROUND((i.operating_income::DECIMAL / i.revenue) * 100, 2)
    END AS operating_margin,
    CASE WHEN i.revenue > 0 THEN
        ROUND((i.net_income::DECIMAL / i.revenue) * 100, 2)
    END AS net_margin,
    CASE WHEN i.revenue > 0 THEN
        ROUND((i.ebitda::DECIMAL / i.revenue) * 100, 2)
    END AS ebitda_margin,

    -- Balance Sheet
    bs.total_assets,
    bs.total_liabilities,
    bs.total_stockholders_equity,
    bs.cash_and_equivalents,
    bs.total_debt,
    bs.net_debt,

    -- Computed Ratios
    CASE WHEN bs.total_stockholders_equity > 0 THEN
        ROUND(bs.total_debt::DECIMAL / bs.total_stockholders_equity, 2)
    END AS debt_to_equity,
    CASE WHEN bs.total_assets > 0 THEN
        ROUND(bs.total_current_assets::DECIMAL / NULLIF(bs.total_current_liabilities, 0), 2)
    END AS current_ratio,

    -- Cash Flow
    cf.operating_cash_flow,
    cf.capital_expenditures,
    cf.free_cash_flow,
    cf.dividends_paid,
    cf.common_stock_repurchased AS buybacks,

    -- Computed FCF Margin
    CASE WHEN i.revenue > 0 THEN
        ROUND((cf.free_cash_flow::DECIMAL / i.revenue) * 100, 2)
    END AS fcf_margin,

    -- Return Ratios
    CASE WHEN bs.total_assets > 0 THEN
        ROUND((i.net_income::DECIMAL / bs.total_assets) * 100, 2)
    END AS roa,
    CASE WHEN bs.total_stockholders_equity > 0 THEN
        ROUND((i.net_income::DECIMAL / bs.total_stockholders_equity) * 100, 2)
    END AS roe,

    fp.fetched_at,
    fp.source

FROM financial_periods fp
LEFT JOIN income_statements i ON i.period_id = fp.id
LEFT JOIN balance_sheets bs ON bs.period_id = fp.id
LEFT JOIN cash_flow_statements cf ON cf.period_id = fp.id;

COMMENT ON VIEW v_financials IS 'Consolidated financial data with computed margins and ratios';

-- ============================================================================
-- 7. HELPER FUNCTION - Get latest period for a ticker
-- ============================================================================

CREATE OR REPLACE FUNCTION get_latest_financials(
    p_ticker VARCHAR(10),
    p_period_type VARCHAR(10) DEFAULT 'quarterly'
)
RETURNS SETOF v_financials AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM v_financials
    WHERE ticker = p_ticker
      AND period_type = p_period_type
    ORDER BY period_end DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_latest_financials IS 'Returns the most recent financial data for a ticker';
