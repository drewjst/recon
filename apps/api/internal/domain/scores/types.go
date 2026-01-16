// Package scores contains financial score calculation logic.
package scores

// FinancialData contains raw financial statement data used for score calculations.
type FinancialData struct {
	// Income Statement
	Revenue         float64
	GrossProfit     float64
	OperatingIncome float64
	NetIncome       float64
	EBIT            float64
	EPS             float64 // Earnings per share (diluted)

	// Balance Sheet
	TotalAssets        float64
	TotalLiabilities   float64
	CurrentAssets      float64
	CurrentLiabilities float64
	LongTermDebt       float64
	ShareholdersEquity float64
	RetainedEarnings   float64
	SharesOutstanding  int64

	// Cash Flow
	OperatingCashFlow float64
	FreeCashFlow      float64

	// Market Data
	MarketCap  float64
	StockPrice float64

	// Period Info
	FiscalYear    int
	FiscalQuarter int
}

// PiotroskiBreakdown contains the individual test results for the F-Score.
type PiotroskiBreakdown struct {
	// Profitability (4 points)
	PositiveNetIncome            bool `json:"positiveNetIncome"`
	PositiveROA                  bool `json:"positiveROA"`
	PositiveOperatingCashFlow    bool `json:"positiveOperatingCashFlow"`
	CashFlowGreaterThanNetIncome bool `json:"cashFlowGreaterThanNetIncome"`

	// Leverage & Liquidity (3 points)
	LowerLongTermDebt  bool `json:"lowerLongTermDebt"`
	HigherCurrentRatio bool `json:"higherCurrentRatio"`
	NoNewShares        bool `json:"noNewShares"`

	// Operating Efficiency (2 points)
	HigherGrossMargin   bool `json:"higherGrossMargin"`
	HigherAssetTurnover bool `json:"higherAssetTurnover"`
}

// PiotroskiResult contains the complete Piotroski F-Score result.
type PiotroskiResult struct {
	Score     int                `json:"score"`
	Breakdown PiotroskiBreakdown `json:"breakdown"`
}

// RuleOf40Result contains the Rule of 40 calculation result.
type RuleOf40Result struct {
	Score                float64 `json:"score"`
	RevenueGrowthPercent float64 `json:"revenueGrowthPercent"`
	ProfitMarginPercent  float64 `json:"profitMarginPercent"`
	Passed               bool    `json:"passed"`
}

// AltmanZComponents contains the individual components of the Z-Score formula.
type AltmanZComponents struct {
	WorkingCapitalToAssets   float64 `json:"workingCapitalToAssets"`
	RetainedEarningsToAssets float64 `json:"retainedEarningsToAssets"`
	EBITToAssets             float64 `json:"ebitToAssets"`
	MarketCapToLiabilities   float64 `json:"marketCapToLiabilities"`
	SalesToAssets            float64 `json:"salesToAssets"`
}

// AltmanZResult contains the complete Altman Z-Score result.
type AltmanZResult struct {
	Score      float64           `json:"score"`
	Zone       string            `json:"zone"` // "distress", "gray", or "safe"
	Components AltmanZComponents `json:"components"`
}
