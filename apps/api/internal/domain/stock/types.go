// Package stock contains the core domain types and business logic for stock analysis.
package stock

import "time"

// Company represents basic company identification and classification.
type Company struct {
	Ticker      string `json:"ticker" db:"ticker"`
	Name        string `json:"name" db:"name"`
	Exchange    string `json:"exchange" db:"exchange"`
	Sector      string `json:"sector" db:"sector"`
	Industry    string `json:"industry" db:"industry"`
	Description string `json:"description,omitempty" db:"description"`
}

// Quote represents real-time market quote data.
type Quote struct {
	Price            float64   `json:"price" db:"price"`
	Change           float64   `json:"change" db:"change"`
	ChangePercent    float64   `json:"changePercent" db:"change_percent"`
	Volume           int64     `json:"volume" db:"volume"`
	MarketCap        int64     `json:"marketCap" db:"market_cap"`
	FiftyTwoWeekHigh float64   `json:"fiftyTwoWeekHigh" db:"fifty_two_week_high"`
	FiftyTwoWeekLow  float64   `json:"fiftyTwoWeekLow" db:"fifty_two_week_low"`
	AsOf             time.Time `json:"asOf" db:"as_of"`
}

// ValuationMetric represents a valuation metric with sector context.
type ValuationMetric struct {
	Value        *float64 `json:"value"`
	SectorMedian *float64 `json:"sectorMedian"`
	Percentile   *int     `json:"percentile,omitempty"`
}

// Valuation contains all valuation metrics with sector comparisons.
type Valuation struct {
	PE          ValuationMetric `json:"pe"`
	ForwardPE   ValuationMetric `json:"forwardPe"`
	PEG         ValuationMetric `json:"peg"`
	EVToEBITDA  ValuationMetric `json:"evToEbitda"`
	PriceToFCF  ValuationMetric `json:"priceToFcf"`
	PriceToBook ValuationMetric `json:"priceToBook"`
}

// InstitutionalHolder represents a single institutional holder's position.
type InstitutionalHolder struct {
	FundName         string  `json:"fundName" db:"fund_name"`
	FundCIK          string  `json:"fundCik" db:"fund_cik"`
	Shares           int64   `json:"shares" db:"shares"`
	Value            int64   `json:"value" db:"value"`
	PortfolioPercent float64 `json:"portfolioPercent" db:"portfolio_percent"`
	ChangeShares     int64   `json:"changeShares" db:"change_shares"`
	ChangePercent    float64 `json:"changePercent" db:"change_percent"`
	QuarterDate      string  `json:"quarterDate" db:"quarter_date"`
}

// Holdings contains aggregated institutional holdings data.
type Holdings struct {
	TopInstitutional        []InstitutionalHolder `json:"topInstitutional"`
	TotalInstitutionalOwner float64               `json:"totalInstitutionalOwnership" db:"total_institutional_ownership"`
	NetChangeShares         int64                 `json:"netChangeShares" db:"net_change_shares"`
	NetChangeQuarters       int                   `json:"netChangeQuarters" db:"net_change_quarters"`
}

// InsiderTrade represents a single insider transaction.
type InsiderTrade struct {
	InsiderName string  `json:"insiderName" db:"insider_name"`
	Title       string  `json:"title" db:"title"`
	TradeType   string  `json:"tradeType" db:"trade_type"` // "buy" or "sell"
	Shares      int64   `json:"shares" db:"shares"`
	Price       float64 `json:"price" db:"price"`
	Value       int64   `json:"value" db:"value"`
	TradeDate   string  `json:"tradeDate" db:"trade_date"`
}

// SectorMetric represents a metric with sector context for comparison.
type SectorMetric struct {
	Value        float64 `json:"value"`
	SectorMin    float64 `json:"sectorMin"`
	SectorMedian float64 `json:"sectorMedian"`
	SectorMax    float64 `json:"sectorMax"`
	Percentile   int     `json:"percentile"` // 0-100, where stock ranks in sector
}

// Profitability contains profitability metrics with sector comparisons.
type Profitability struct {
	ROIC            SectorMetric `json:"roic"`
	ROE             SectorMetric `json:"roe"`
	OperatingMargin SectorMetric `json:"operatingMargin"`
}

// FinancialHealth contains financial health metrics with sector comparisons.
type FinancialHealth struct {
	DebtToEquity  SectorMetric `json:"debtToEquity"`
	CurrentRatio  SectorMetric `json:"currentRatio"`
	AssetTurnover SectorMetric `json:"assetTurnover"`
}

// Growth contains growth metrics with sector comparisons.
type Growth struct {
	RevenueGrowthYoY SectorMetric `json:"revenueGrowthYoY"`
	EPSGrowthYoY     SectorMetric `json:"epsGrowthYoY"`
}

// EarningsQuality contains earnings quality metrics with sector comparisons.
type EarningsQuality struct {
	AccrualRatio  SectorMetric `json:"accrualRatio"`
	BuybackYield  SectorMetric `json:"buybackYield"`
}

// Financials contains key financial metrics.
type Financials struct {
	RevenueGrowthYoY float64  `json:"revenueGrowthYoY" db:"revenue_growth_yoy"`
	GrossMargin      float64  `json:"grossMargin" db:"gross_margin"`
	OperatingMargin  float64  `json:"operatingMargin" db:"operating_margin"`
	NetMargin        float64  `json:"netMargin" db:"net_margin"`
	FCFMargin        float64  `json:"fcfMargin" db:"fcf_margin"`
	ROE              float64  `json:"roe" db:"roe"`
	ROIC             float64  `json:"roic" db:"roic"`
	DebtToEquity     float64  `json:"debtToEquity" db:"debt_to_equity"`
	CurrentRatio     float64  `json:"currentRatio" db:"current_ratio"`
	InterestCoverage *float64 `json:"interestCoverage" db:"interest_coverage"`
}

// Performance contains price performance metrics over various time periods.
type Performance struct {
	Day1Change      float64 `json:"day1Change"`
	Week1Change     float64 `json:"week1Change"`
	Month1Change    float64 `json:"month1Change"`
	YTDChange       float64 `json:"ytdChange"`
	Year1Change     float64 `json:"year1Change"`
	PercentOf52High float64 `json:"percentOf52WeekHigh"`
}

// InsiderActivity contains aggregated insider trading data.
type InsiderActivity struct {
	Trades       []InsiderTrade `json:"trades"`
	BuyCount90d  int            `json:"buyCount90d"`
	SellCount90d int            `json:"sellCount90d"`
	NetValue90d  float64        `json:"netValue90d"`
}

// DataMeta contains data freshness timestamps.
type DataMeta struct {
	FundamentalsAsOf string    `json:"fundamentalsAsOf"`
	HoldingsAsOf     string    `json:"holdingsAsOf"`
	PriceAsOf        string    `json:"priceAsOf"`
	GeneratedAt      time.Time `json:"generatedAt"`
}

// SearchResult represents a single ticker search result.
type SearchResult struct {
	Ticker   string `json:"ticker" db:"ticker"`
	Name     string `json:"name" db:"name"`
	Exchange string `json:"exchange" db:"exchange"`
	Sector   string `json:"sector,omitempty" db:"sector"`
}

// DCFValuation represents discounted cash flow valuation analysis.
type DCFValuation struct {
	IntrinsicValue    float64 `json:"intrinsicValue"`
	CurrentPrice      float64 `json:"currentPrice"`
	DifferencePercent float64 `json:"differencePercent"`
	Assessment        string  `json:"assessment"` // "Undervalued", "Fairly Valued", "Overvalued"
}

// AssetType distinguishes between stocks and ETFs.
type AssetType string

const (
	AssetTypeStock AssetType = "stock"
	AssetTypeETF   AssetType = "etf"
)

// ETFHolding represents a single holding within an ETF portfolio.
type ETFHolding struct {
	Ticker        string  `json:"ticker"`
	Name          string  `json:"name"`
	Shares        float64 `json:"shares"`
	WeightPercent float64 `json:"weightPercent"`
	MarketValue   int64   `json:"marketValue"`
}

// ETFSectorWeight represents a sector allocation within an ETF.
type ETFSectorWeight struct {
	Sector        string  `json:"sector"`
	WeightPercent float64 `json:"weightPercent"`
}

// ETFData contains ETF-specific information not applicable to individual stocks.
type ETFData struct {
	ExpenseRatio  float64           `json:"expenseRatio"`
	AUM           int64             `json:"aum"`
	InceptionDate string            `json:"inceptionDate"`
	Holdings      []ETFHolding      `json:"holdings"`
	SectorWeights []ETFSectorWeight `json:"sectorWeights"`
}
