package model

import "time"

// SignalType represents the type of trading signal.
type SignalType string

const (
	SignalBullish SignalType = "bullish"
	SignalBearish SignalType = "bearish"
	SignalNeutral SignalType = "neutral"
)

// Signal represents a computed trading signal.
type Signal struct {
	Name        string     `json:"name"`
	Type        SignalType `json:"type"`
	Score       float64    `json:"score"`
	Description string     `json:"description"`
}

// SignalResult contains all computed signals for a stock.
type SignalResult struct {
	Ticker          string    `json:"ticker"`
	Signals         []Signal  `json:"signals"`
	PiotroskiScore  int       `json:"piotroskiScore"`
	OverallSentiment SignalType `json:"overallSentiment"`
	ComputedAt      time.Time `json:"computedAt"`
}
