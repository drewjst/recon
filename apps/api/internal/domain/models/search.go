package models

// SearchResult represents a ticker search result.
type SearchResult struct {
	Ticker   string
	Name     string
	Exchange string
	Type     string // "stock", "etf"
}
