package models

import "time"

// Ratios represents calculated financial ratios and metrics.
type Ratios struct {
	Ticker string

	// Valuation
	PE         float64
	ForwardPE  float64
	PEG        float64
	PB         float64
	PS         float64
	EVToEBITDA float64
	PriceToFCF float64

	// Profitability
	GrossMargin     float64
	OperatingMargin float64
	NetMargin       float64
	FCFMargin       float64
	ROE             float64
	ROIC            float64
	ROA             float64

	// Efficiency
	AssetTurnover     float64
	InventoryTurnover float64

	// Solvency
	DebtToEquity     float64
	CurrentRatio     float64
	QuickRatio       float64
	InterestCoverage float64

	// Growth (from estimates)
	EPSEstimateCurrent float64
	EPSEstimateNext    float64
	RevenueGrowthYoY   float64
	EPSGrowthYoY       float64

	// Cash Flow
	FreeCashFlowTTM   float64
	CashFlowGrowthYoY float64

	// Operating Metrics
	RevenueTTM         float64
	NetIncomeTTM       float64
	FullTimeEmployees  int
	RevenuePerEmployee float64
	IncomePerEmployee  float64

	AsOf time.Time
}
