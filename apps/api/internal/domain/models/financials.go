package models

import "time"

// Financials represents financial statement data for a reporting period.
type Financials struct {
	Ticker       string
	FiscalYear   int
	FiscalPeriod string // "Q1", "Q2", "Q3", "Q4", "FY"

	// Income Statement
	Revenue         int64
	GrossProfit     int64
	OperatingIncome int64
	NetIncome       int64
	EPS             float64

	// Balance Sheet
	TotalAssets      int64
	TotalLiabilities int64
	TotalEquity      int64
	Cash             int64
	Debt             int64

	// Cash Flow
	OperatingCashFlow int64
	CapEx             int64
	FreeCashFlow      int64

	ReportDate time.Time
}
