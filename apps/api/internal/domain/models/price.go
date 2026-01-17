package models

import "time"

// PriceBar represents a single day's price data.
type PriceBar struct {
	Date   time.Time
	Open   float64
	High   float64
	Low    float64
	Close  float64
	Volume int64
}
