// Package search provides ticker search functionality.
package search

import (
	_ "embed"
	"encoding/json"
	"strings"
)

//go:embed tickers.json
var tickersJSON []byte

// Ticker represents a stock or ETF ticker with metadata.
type Ticker struct {
	Symbol   string `json:"ticker"`
	Name     string `json:"name"`
	Exchange string `json:"exchange,omitempty"`
	Type     string `json:"type,omitempty"` // "stock" or "etf"
}

// Result is returned by the search endpoint.
type Result struct {
	Ticker   string `json:"ticker"`
	Name     string `json:"name"`
	Exchange string `json:"exchange"`
	Type     string `json:"type,omitempty"`
}

// Index holds the searchable ticker data.
type Index struct {
	tickers []tickerEntry
}

type tickerEntry struct {
	Ticker      string
	TickerLower string // pre-computed lowercase ticker for matching
	Name        string
	Exchange    string
	Type        string
	SearchKey   string // lowercase ticker + name for matching
}

// NewIndex creates a new search index from embedded ticker data.
func NewIndex() (*Index, error) {
	var tickers []Ticker
	if err := json.Unmarshal(tickersJSON, &tickers); err != nil {
		return nil, err
	}

	entries := make([]tickerEntry, len(tickers))
	for i, t := range tickers {
		exchange := t.Exchange
		if exchange == "" {
			exchange = "US"
		}
		tickerType := t.Type
		if tickerType == "" {
			tickerType = "stock"
		}
		tickerLower := strings.ToLower(t.Symbol)
		entries[i] = tickerEntry{
			Ticker:      t.Symbol,
			TickerLower: tickerLower,
			Name:        t.Name,
			Exchange:    exchange,
			Type:        tickerType,
			SearchKey:   tickerLower + " " + strings.ToLower(t.Name),
		}
	}

	return &Index{tickers: entries}, nil
}

// Search finds tickers matching the query.
// Uses a single pass with a map for O(n) complexity instead of O(n²).
func (idx *Index) Search(query string, limit int) []Result {
	if query == "" {
		return []Result{}
	}

	query = strings.ToLower(strings.TrimSpace(query))
	if limit <= 0 {
		limit = 10
	}

	// Use a map to track seen tickers - O(1) lookup instead of O(n)
	seen := make(map[string]bool)

	// Collect results in priority buckets
	var exactMatches []Result
	var prefixMatches []Result
	var containsMatches []Result

	// Single pass through all tickers
	for _, t := range idx.tickers {
		// Check exact match (highest priority)
		if t.TickerLower == query {
			if !seen[t.Ticker] {
				seen[t.Ticker] = true
				exactMatches = append(exactMatches, Result{
					Ticker:   t.Ticker,
					Name:     t.Name,
					Exchange: t.Exchange,
					Type:     t.Type,
				})
			}
			continue
		}

		// Check prefix match (medium priority)
		if strings.HasPrefix(t.TickerLower, query) {
			if !seen[t.Ticker] {
				seen[t.Ticker] = true
				prefixMatches = append(prefixMatches, Result{
					Ticker:   t.Ticker,
					Name:     t.Name,
					Exchange: t.Exchange,
					Type:     t.Type,
				})
			}
			continue
		}

		// Check contains match in search key (lowest priority)
		if strings.Contains(t.SearchKey, query) {
			if !seen[t.Ticker] {
				seen[t.Ticker] = true
				containsMatches = append(containsMatches, Result{
					Ticker:   t.Ticker,
					Name:     t.Name,
					Exchange: t.Exchange,
					Type:     t.Type,
				})
			}
		}
	}

	// Combine results in priority order up to limit
	results := make([]Result, 0, limit)

	for _, r := range exactMatches {
		if len(results) >= limit {
			return results
		}
		results = append(results, r)
	}

	for _, r := range prefixMatches {
		if len(results) >= limit {
			return results
		}
		results = append(results, r)
	}

	for _, r := range containsMatches {
		if len(results) >= limit {
			return results
		}
		results = append(results, r)
	}

	return results
}
