package db

import (
	"time"

	"gorm.io/datatypes"
)

// =============================================================================
// Financial Statements Models (long-term storage)
// =============================================================================

// FinancialPeriod represents core metadata linking all financial statements.
type FinancialPeriod struct {
	ID            int64      `gorm:"primaryKey;autoIncrement"`
	Ticker        string     `gorm:"size:10;not null;index"`
	PeriodType    string     `gorm:"size:10;not null;index"` // "annual" or "quarterly"
	PeriodEnd     time.Time  `gorm:"type:date;not null"`
	FiscalYear    int        `gorm:"not null"`
	FiscalQuarter *int       `gorm:"column:fiscal_quarter"` // NULL for annual
	FilingDate    *time.Time `gorm:"type:date"`
	AcceptedDate  *time.Time
	Source        string    `gorm:"size:20;not null;default:'fmp'"`
	FetchedAt     time.Time `gorm:"not null;default:now()"`
	CreatedAt     time.Time `gorm:"not null;default:now()"`
	UpdatedAt     time.Time `gorm:"not null;default:now()"`
}

func (FinancialPeriod) TableName() string {
	return "financial_periods"
}

// IncomeStatementModel represents income statement data in the database.
type IncomeStatementModel struct {
	ID       int64 `gorm:"primaryKey;autoIncrement"`
	PeriodID int64 `gorm:"not null;uniqueIndex"`

	// Revenue
	Revenue       *int64 `gorm:"column:revenue"`
	CostOfRevenue *int64 `gorm:"column:cost_of_revenue"`
	GrossProfit   *int64 `gorm:"column:gross_profit"`

	// Operating expenses
	ResearchAndDevelopment *int64 `gorm:"column:research_and_development"`
	SellingGeneralAdmin    *int64 `gorm:"column:selling_general_admin"`
	OperatingExpenses      *int64 `gorm:"column:operating_expenses"`
	OperatingIncome        *int64 `gorm:"column:operating_income"`

	// Non-operating
	InterestIncome   *int64 `gorm:"column:interest_income"`
	InterestExpense  *int64 `gorm:"column:interest_expense"`
	OtherIncomeExp   *int64 `gorm:"column:other_income_expense"`
	IncomeBeforeTax  *int64 `gorm:"column:income_before_tax"`
	IncomeTaxExpense *int64 `gorm:"column:income_tax_expense"`

	// Net income
	NetIncome         *int64 `gorm:"column:net_income"`
	NetIncomeToCommon *int64 `gorm:"column:net_income_to_common"`

	// Per share
	EPSBasic                 *float64 `gorm:"column:eps_basic;type:decimal(12,4)"`
	EPSDiluted               *float64 `gorm:"column:eps_diluted;type:decimal(12,4)"`
	WeightedAvgSharesBasic   *int64   `gorm:"column:weighted_avg_shares_basic"`
	WeightedAvgSharesDiluted *int64   `gorm:"column:weighted_avg_shares_diluted"`

	// Other
	EBITDA                   *int64 `gorm:"column:ebitda"`
	DepreciationAmortization *int64 `gorm:"column:depreciation_amortization"`

	RawData   datatypes.JSON `gorm:"type:jsonb"`
	CreatedAt time.Time      `gorm:"not null;default:now()"`
	UpdatedAt time.Time      `gorm:"not null;default:now()"`

	// Belongs to FinancialPeriod
	Period FinancialPeriod `gorm:"foreignKey:PeriodID;references:ID"`
}

func (IncomeStatementModel) TableName() string {
	return "income_statements"
}

// BalanceSheetModel represents balance sheet data in the database.
type BalanceSheetModel struct {
	ID       int64 `gorm:"primaryKey;autoIncrement"`
	PeriodID int64 `gorm:"not null;uniqueIndex"`

	// Current Assets
	CashAndEquivalents   *int64 `gorm:"column:cash_and_equivalents"`
	ShortTermInvestments *int64 `gorm:"column:short_term_investments"`
	CashAndShortTerm     *int64 `gorm:"column:cash_and_short_term"`
	AccountsReceivable   *int64 `gorm:"column:accounts_receivable"`
	Inventory            *int64 `gorm:"column:inventory"`
	OtherCurrentAssets   *int64 `gorm:"column:other_current_assets"`
	TotalCurrentAssets   *int64 `gorm:"column:total_current_assets"`

	// Non-current Assets
	PropertyPlantEquipmentNet *int64 `gorm:"column:property_plant_equipment_net"`
	Goodwill                  *int64 `gorm:"column:goodwill"`
	IntangibleAssets          *int64 `gorm:"column:intangible_assets"`
	LongTermInvestments       *int64 `gorm:"column:long_term_investments"`
	OtherNonCurrentAssets     *int64 `gorm:"column:other_non_current_assets"`
	TotalNonCurrentAssets     *int64 `gorm:"column:total_non_current_assets"`
	TotalAssets               *int64 `gorm:"column:total_assets"`

	// Current Liabilities
	AccountsPayable            *int64 `gorm:"column:accounts_payable"`
	ShortTermDebt              *int64 `gorm:"column:short_term_debt"`
	CurrentPortionLongTermDebt *int64 `gorm:"column:current_portion_long_term_debt"`
	DeferredRevenue            *int64 `gorm:"column:deferred_revenue"`
	OtherCurrentLiabilities    *int64 `gorm:"column:other_current_liabilities"`
	TotalCurrentLiabilities    *int64 `gorm:"column:total_current_liabilities"`

	// Non-current Liabilities
	LongTermDebt            *int64 `gorm:"column:long_term_debt"`
	DeferredTaxLiabilities  *int64 `gorm:"column:deferred_tax_liabilities"`
	OtherNonCurrentLiab     *int64 `gorm:"column:other_non_current_liabilities"`
	TotalNonCurrentLiab     *int64 `gorm:"column:total_non_current_liabilities"`
	TotalLiabilities        *int64 `gorm:"column:total_liabilities"`

	// Equity
	CommonStock                   *int64 `gorm:"column:common_stock"`
	RetainedEarnings              *int64 `gorm:"column:retained_earnings"`
	AccumulatedOtherComprehensive *int64 `gorm:"column:accumulated_other_comprehensive"`
	TreasuryStock                 *int64 `gorm:"column:treasury_stock"`
	TotalStockholdersEquity       *int64 `gorm:"column:total_stockholders_equity"`
	MinorityInterest              *int64 `gorm:"column:minority_interest"`
	TotalEquity                   *int64 `gorm:"column:total_equity"`

	// Computed/Derived
	TotalDebt *int64 `gorm:"column:total_debt"`
	NetDebt   *int64 `gorm:"column:net_debt"`

	RawData   datatypes.JSON `gorm:"type:jsonb"`
	CreatedAt time.Time      `gorm:"not null;default:now()"`
	UpdatedAt time.Time      `gorm:"not null;default:now()"`

	Period FinancialPeriod `gorm:"foreignKey:PeriodID;references:ID"`
}

func (BalanceSheetModel) TableName() string {
	return "balance_sheets"
}

// CashFlowStatementModel represents cash flow statement data in the database.
type CashFlowStatementModel struct {
	ID       int64 `gorm:"primaryKey;autoIncrement"`
	PeriodID int64 `gorm:"not null;uniqueIndex"`

	// Operating Activities
	NetIncome                *int64 `gorm:"column:net_income"`
	DepreciationAmortization *int64 `gorm:"column:depreciation_amortization"`
	DeferredIncomeTax        *int64 `gorm:"column:deferred_income_tax"`
	StockBasedCompensation   *int64 `gorm:"column:stock_based_compensation"`
	ChangeInWorkingCapital   *int64 `gorm:"column:change_in_working_capital"`
	ChangeInReceivables      *int64 `gorm:"column:change_in_receivables"`
	ChangeInInventory        *int64 `gorm:"column:change_in_inventory"`
	ChangeInPayables         *int64 `gorm:"column:change_in_payables"`
	OtherOperatingActivities *int64 `gorm:"column:other_operating_activities"`
	OperatingCashFlow        *int64 `gorm:"column:operating_cash_flow"`

	// Investing Activities
	CapitalExpenditures      *int64 `gorm:"column:capital_expenditures"`
	Acquisitions             *int64 `gorm:"column:acquisitions"`
	PurchasesOfInvestments   *int64 `gorm:"column:purchases_of_investments"`
	SalesOfInvestments       *int64 `gorm:"column:sales_of_investments"`
	OtherInvestingActivities *int64 `gorm:"column:other_investing_activities"`
	InvestingCashFlow        *int64 `gorm:"column:investing_cash_flow"`

	// Financing Activities
	DebtRepayment            *int64 `gorm:"column:debt_repayment"`
	DebtIssuance             *int64 `gorm:"column:debt_issuance"`
	CommonStockRepurchased   *int64 `gorm:"column:common_stock_repurchased"`
	CommonStockIssued        *int64 `gorm:"column:common_stock_issued"`
	DividendsPaid            *int64 `gorm:"column:dividends_paid"`
	OtherFinancingActivities *int64 `gorm:"column:other_financing_activities"`
	FinancingCashFlow        *int64 `gorm:"column:financing_cash_flow"`

	// Net Change
	EffectOfForex   *int64 `gorm:"column:effect_of_forex"`
	NetChangeInCash *int64 `gorm:"column:net_change_in_cash"`
	CashAtBeginning *int64 `gorm:"column:cash_at_beginning"`
	CashAtEnd       *int64 `gorm:"column:cash_at_end"`

	// Computed (stored in DB as GENERATED column, but we also track it here)
	FreeCashFlow *int64 `gorm:"column:free_cash_flow;->"` // read-only, computed by DB

	RawData   datatypes.JSON `gorm:"type:jsonb"`
	CreatedAt time.Time      `gorm:"not null;default:now()"`
	UpdatedAt time.Time      `gorm:"not null;default:now()"`

	Period FinancialPeriod `gorm:"foreignKey:PeriodID;references:ID"`
}

func (CashFlowStatementModel) TableName() string {
	return "cash_flow_statements"
}

// RevenueSegmentModel represents revenue segment data in the database.
type RevenueSegmentModel struct {
	ID          int64   `gorm:"primaryKey;autoIncrement"`
	PeriodID    int64   `gorm:"not null;index"`
	SegmentType string  `gorm:"size:20;not null"` // "product", "geography", "other"
	SegmentName string  `gorm:"size:100;not null"`
	Revenue     int64   `gorm:"not null"`
	Percentage  *float64 `gorm:"type:decimal(5,2)"`
	CreatedAt   time.Time `gorm:"not null;default:now()"`

	Period FinancialPeriod `gorm:"foreignKey:PeriodID;references:ID"`
}

func (RevenueSegmentModel) TableName() string {
	return "revenue_segments"
}

// StockCache stores cached stock data from external providers.
type StockCache struct {
	Ticker       string         `gorm:"primaryKey;size:10"`
	Name         string         `gorm:"size:255"`
	Sector       string         `gorm:"size:100;index"`
	Industry     string         `gorm:"size:100"`
	MarketCap    int64          `gorm:"index"`
	RawData      datatypes.JSON `gorm:"type:jsonb"` // Original provider response
	Fundamentals datatypes.JSON `gorm:"type:jsonb"` // Normalized StockDetailResponse
	Provider     string         `gorm:"size:20"`    // "fmp"
	UpdatedAt    time.Time      `gorm:"index"`
	CreatedAt    time.Time
}

// QuoteCache stores cached real-time quote data.
type QuoteCache struct {
	Ticker    string  `gorm:"primaryKey;size:10"`
	Price     float64 `gorm:"type:decimal(12,4)"`
	Change    float64 `gorm:"type:decimal(12,4)"`
	ChangePct float64 `gorm:"type:decimal(8,4)"`
	Volume    int64
	Provider  string    `gorm:"size:20"`
	UpdatedAt time.Time `gorm:"index"`
}

// TableName returns the table name for StockCache.
func (StockCache) TableName() string {
	return "stock_cache"
}

// TableName returns the table name for QuoteCache.
func (QuoteCache) TableName() string {
	return "quote_cache"
}

// ProviderCache stores cached responses from data providers.
// This enables granular caching of individual API responses.
type ProviderCache struct {
	// Composite key: data_type + key (e.g., "company:AAPL", "ratios:AAPL")
	DataType  string         `gorm:"primaryKey;size:50"`
	Key       string         `gorm:"primaryKey;size:100"`
	Data      datatypes.JSON `gorm:"type:jsonb"`
	Provider  string         `gorm:"size:20"`
	UpdatedAt time.Time      `gorm:"index"`
	ExpiresAt time.Time      `gorm:"index"`
}

// TableName returns the table name for ProviderCache.
func (ProviderCache) TableName() string {
	return "provider_cache"
}
