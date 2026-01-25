package models

import (
	"fmt"
	"time"
)

// InsightSection represents the type of insight being requested.
type InsightSection string

// Insight section types.
const (
	InsightSectionValuationSummary  InsightSection = "valuation-summary"
	InsightSectionPositionSummary   InsightSection = "position-summary"
	// Future sections:
	// InsightSectionGrowthAnalysis   InsightSection = "growth-analysis"
	// InsightSectionSmartMoneySignals InsightSection = "smart-money-signals"
	// InsightSectionEarningsPreview  InsightSection = "earnings-preview"
)

// InsightResponse contains the generated insight and metadata.
type InsightResponse struct {
	Ticker      string         `json:"ticker"`
	Section     InsightSection `json:"section"`
	Insight     string         `json:"insight"`
	GeneratedAt time.Time      `json:"generatedAt"`
	ExpiresAt   time.Time      `json:"expiresAt"`
	Cached      bool           `json:"cached"`
}

// InsightRequest contains parameters for generating an insight.
type InsightRequest struct {
	Ticker  string
	Section InsightSection

	// Optional fields for future sections (e.g., earnings)
	Year    int
	Quarter int
}

// CacheKey returns the cache key for this insight request.
func (r InsightRequest) CacheKey() string {
	switch r.Section {
	// Future: earnings section includes year and quarter
	// case InsightSectionEarningsPreview:
	// 	return fmt.Sprintf("crux:insight:earnings:%s:%d:Q%d", r.Ticker, r.Year, r.Quarter)
	default:
		return fmt.Sprintf("crux:insight:%s:%s", r.Section, r.Ticker)
	}
}

// CacheTTL returns the cache duration for this insight section.
func (s InsightSection) CacheTTL() time.Duration {
	switch s {
	case InsightSectionValuationSummary:
		return 24 * time.Hour
	case InsightSectionPositionSummary:
		return 24 * time.Hour
	// Future sections can have different TTLs:
	// case InsightSectionEarningsPreview:
	// 	return 12 * time.Hour
	default:
		return 24 * time.Hour
	}
}

// IsValid checks if the insight section is a known valid type.
func (s InsightSection) IsValid() bool {
	switch s {
	case InsightSectionValuationSummary, InsightSectionPositionSummary:
		return true
	default:
		return false
	}
}
