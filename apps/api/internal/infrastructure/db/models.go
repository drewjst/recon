package db

import (
	"time"

	"gorm.io/datatypes"
)

// StockCache stores cached stock data from external providers.
type StockCache struct {
	Ticker       string         `gorm:"primaryKey;size:10"`
	Name         string         `gorm:"size:255"`
	Sector       string         `gorm:"size:100;index"`
	Industry     string         `gorm:"size:100"`
	MarketCap    int64          `gorm:"index"`
	RawData      datatypes.JSON `gorm:"type:jsonb"` // Original provider response
	Fundamentals datatypes.JSON `gorm:"type:jsonb"` // Normalized StockDetailResponse
	Provider     string         `gorm:"size:20"`    // "fmp", "eodhd"
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
