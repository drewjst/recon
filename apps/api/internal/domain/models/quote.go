package models

import "time"

// Quote represents real-time price and market data.
type Quote struct {
	Ticker        string
	Price         float64
	Change        float64
	ChangePercent float64
	Open          float64
	High          float64
	Low           float64
	PrevClose     float64
	Volume        int64
	MarketCap     int64
	AsOf          time.Time
}
