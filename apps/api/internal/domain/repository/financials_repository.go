// Package repository defines interfaces for data access.
package repository

import (
	"context"
	"time"
)

// PeriodType represents the type of financial period.
type PeriodType string

const (
	PeriodTypeAnnual    PeriodType = "annual"
	PeriodTypeQuarterly PeriodType = "quarterly"
	PeriodTypeTTM       PeriodType = "ttm"
)

// IncomeStatement represents income statement data for a reporting period.
type IncomeStatement struct {
	Ticker      string
	PeriodEnd   time.Time
	PeriodType  PeriodType
	FiscalYear  int
	FiscalQuarter *int // nil for annual periods
	FilingDate  *time.Time

	// Revenue
	Revenue        int64
	CostOfRevenue  int64
	GrossProfit    int64

	// Operating
	ResearchAndDevelopment int64
	SellingGeneralAdmin    int64
	OperatingExpenses      int64
	OperatingIncome        int64

	// Non-operating
	InterestIncome   int64
	InterestExpense  int64
	OtherIncomeExp   int64
	IncomeBeforeTax  int64
	IncomeTaxExpense int64

	// Net income
	NetIncome         int64
	NetIncomeToCommon int64

	// Per share
	EPSBasic                  float64
	EPSDiluted                float64
	WeightedAvgSharesBasic    int64
	WeightedAvgSharesDiluted  int64

	// Other
	EBITDA                   int64
	DepreciationAmortization int64

	FetchedAt time.Time
}

// BalanceSheet represents balance sheet data for a reporting period.
type BalanceSheet struct {
	Ticker      string
	PeriodEnd   time.Time
	PeriodType  PeriodType
	FiscalYear  int
	FiscalQuarter *int
	FilingDate  *time.Time

	// Current Assets
	CashAndEquivalents   int64
	ShortTermInvestments int64
	CashAndShortTerm     int64
	AccountsReceivable   int64
	Inventory            int64
	OtherCurrentAssets   int64
	TotalCurrentAssets   int64

	// Non-current Assets
	PropertyPlantEquipmentNet int64
	Goodwill                  int64
	IntangibleAssets          int64
	LongTermInvestments       int64
	OtherNonCurrentAssets     int64
	TotalNonCurrentAssets     int64
	TotalAssets               int64

	// Current Liabilities
	AccountsPayable             int64
	ShortTermDebt               int64
	CurrentPortionLongTermDebt  int64
	DeferredRevenue             int64
	OtherCurrentLiabilities     int64
	TotalCurrentLiabilities     int64

	// Non-current Liabilities
	LongTermDebt              int64
	DeferredTaxLiabilities    int64
	OtherNonCurrentLiab       int64
	TotalNonCurrentLiab       int64
	TotalLiabilities          int64

	// Equity
	CommonStock                   int64
	RetainedEarnings              int64
	AccumulatedOtherComprehensive int64
	TreasuryStock                 int64
	TotalStockholdersEquity       int64
	MinorityInterest              int64
	TotalEquity                   int64

	// Computed/Derived
	TotalDebt int64
	NetDebt   int64

	FetchedAt time.Time
}

// CashFlowStatement represents cash flow statement data for a reporting period.
type CashFlowStatement struct {
	Ticker      string
	PeriodEnd   time.Time
	PeriodType  PeriodType
	FiscalYear  int
	FiscalQuarter *int
	FilingDate  *time.Time

	// Operating Activities
	NetIncome                int64
	DepreciationAmortization int64
	DeferredIncomeTax        int64
	StockBasedCompensation   int64
	ChangeInWorkingCapital   int64
	ChangeInReceivables      int64
	ChangeInInventory        int64
	ChangeInPayables         int64
	OtherOperatingActivities int64
	OperatingCashFlow        int64

	// Investing Activities
	CapitalExpenditures      int64
	Acquisitions             int64
	PurchasesOfInvestments   int64
	SalesOfInvestments       int64
	OtherInvestingActivities int64
	InvestingCashFlow        int64

	// Financing Activities
	DebtRepayment            int64
	DebtIssuance             int64
	CommonStockRepurchased   int64
	CommonStockIssued        int64
	DividendsPaid            int64
	OtherFinancingActivities int64
	FinancingCashFlow        int64

	// Net Change
	EffectOfForex    int64
	NetChangeInCash  int64
	CashAtBeginning  int64
	CashAtEnd        int64

	// Computed
	FreeCashFlow int64

	FetchedAt time.Time
}

// RevenueSegment represents a revenue breakdown by product or geography.
type RevenueSegment struct {
	Ticker      string
	PeriodEnd   time.Time
	SegmentType string // "product", "geography", "other"
	SegmentName string
	Revenue     int64
	Percentage  float64 // percentage of total revenue
}

// FinancialsRepository defines the interface for financial statement data access.
// Implementations should check the database first and fall back to FMP if data
// is missing or stale.
type FinancialsRepository interface {
	// GetIncomeStatements retrieves income statements for a ticker.
	// Returns up to `limit` periods, most recent first.
	GetIncomeStatements(ctx context.Context, ticker string, periodType PeriodType, limit int) ([]IncomeStatement, error)

	// GetBalanceSheets retrieves balance sheets for a ticker.
	// Returns up to `limit` periods, most recent first.
	GetBalanceSheets(ctx context.Context, ticker string, periodType PeriodType, limit int) ([]BalanceSheet, error)

	// GetCashFlowStatements retrieves cash flow statements for a ticker.
	// Returns up to `limit` periods, most recent first.
	GetCashFlowStatements(ctx context.Context, ticker string, periodType PeriodType, limit int) ([]CashFlowStatement, error)

	// GetRevenueSegments retrieves revenue segment breakdowns for a ticker.
	// Returns segments for up to `limit` periods, most recent first.
	GetRevenueSegments(ctx context.Context, ticker string, periodType PeriodType, limit int) ([]RevenueSegment, error)
}
