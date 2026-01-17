package models

import "time"

// InstitutionalHolder represents an institutional investor's position.
type InstitutionalHolder struct {
	Name          string
	Shares        int64
	Value         int64
	PercentOwned  float64
	ChangeShares  int64   // vs last quarter
	ChangePercent float64
	DateReported  time.Time
}

// InsiderTrade represents an insider buy or sell transaction.
type InsiderTrade struct {
	Name        string
	Title       string
	TradeType   string // "buy", "sell"
	Shares      int64
	Price       float64
	Value       int64
	SharesOwned int64
	TradeDate   time.Time
	FilingDate  time.Time
}
