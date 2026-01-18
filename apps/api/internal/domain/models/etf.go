// Package models defines canonical domain models that all providers map to.
package models

// ETFData represents ETF-specific information not applicable to individual stocks.
type ETFData struct {
	ExpenseRatio       float64
	AUM                int64
	NAV                float64
	AvgVolume          int64
	Beta               float64
	HoldingsCount      int
	Domicile           string
	InceptionDate      string
	Holdings           []ETFHolding
	SectorWeights      []ETFSectorWeight
	Regions            []ETFRegionWeight
	MarketCapBreakdown *ETFMarketCap
	Valuations         *ETFValuations
	Performance        *ETFPerformance
}

// ETFHolding represents a single holding within an ETF portfolio.
type ETFHolding struct {
	Ticker        string
	Name          string
	Sector        string
	WeightPercent float64
}

// ETFSectorWeight represents sector allocation within an ETF.
type ETFSectorWeight struct {
	Sector        string
	WeightPercent float64
}

// ETFRegionWeight represents geographic allocation within an ETF.
type ETFRegionWeight struct {
	Region        string
	WeightPercent float64
}

// ETFMarketCap represents market cap distribution of ETF holdings.
type ETFMarketCap struct {
	Mega   float64
	Big    float64
	Medium float64
	Small  float64
	Micro  float64
}

// ETFValuations represents aggregate valuation metrics for ETF holdings.
type ETFValuations struct {
	PE            float64
	PB            float64
	PS            float64
	PCF           float64
	DividendYield float64
}

// ETFPerformance represents historical performance of an ETF.
type ETFPerformance struct {
	YTD float64
	Y1  float64
	Y3  float64
	Y5  float64
	Y10 float64
}
