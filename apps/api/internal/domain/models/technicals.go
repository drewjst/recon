package models

// TechnicalMetrics contains technical analysis metrics from the data provider.
type TechnicalMetrics struct {
	Ticker   string
	Beta     float64
	MA50Day  float64
	MA200Day float64
}

// ShortInterest contains short selling data for a stock.
type ShortInterest struct {
	Ticker                string
	SharesShort           int64
	SharesShortPriorMonth int64
	ShortRatio            float64
	ShortPercentFloat     float64
	ShortPercentShares    float64
	DaysToCover           float64
	SettlementDate        string
}
