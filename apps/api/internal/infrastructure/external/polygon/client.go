// Package polygon provides a client for the Polygon.io API.
package polygon

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

const baseURL = "https://api.massive.com"

// Client is a Polygon.io API client.
type Client struct {
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a new Polygon API client.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// TickerSearchResult represents a single ticker from Polygon search.
type TickerSearchResult struct {
	Ticker          string `json:"ticker"`
	Name            string `json:"name"`
	Market          string `json:"market"`
	Locale          string `json:"locale"`
	PrimaryExchange string `json:"primary_exchange"`
	Type            string `json:"type"`
	Active          bool   `json:"active"`
	CurrencyName    string `json:"currency_name"`
}

// tickersResponse is the API response structure.
type tickersResponse struct {
	Results   []TickerSearchResult `json:"results"`
	Status    string               `json:"status"`
	RequestID string               `json:"request_id"`
	Count     int                  `json:"count"`
	NextURL   string               `json:"next_url"`
}

// ShortInterestResult represents short interest data from Polygon Massive API.
type ShortInterestResult struct {
	Ticker         string  `json:"ticker"`
	ShortInterest  int64   `json:"short_interest"`
	AvgDailyVolume int64   `json:"avg_daily_volume"`
	DaysToCover    float64 `json:"days_to_cover"`
	SettlementDate string  `json:"settlement_date"`
}

// shortInterestResponse is the Massive API response structure.
type shortInterestResponse struct {
	Results []ShortInterestResult `json:"results"`
	Status  string                `json:"status"`
}

// isSearchableType returns true for ticker types we want to include in search results.
// Includes common stocks (CS), ETFs, and ADRs (ADRC = ADR Class C).
func isSearchableType(tickerType string) bool {
	switch tickerType {
	case "CS", "ETF", "ADRC":
		return true
	default:
		return false
	}
}

// SearchTickers searches for tickers matching the query.
// Performs both exact ticker lookup and fuzzy name search for best results.
// Filters to common stocks, ETFs, and ADRs on major US exchanges.
func (c *Client) SearchTickers(ctx context.Context, query string, limit int) ([]TickerSearchResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	upperQuery := strings.ToUpper(strings.TrimSpace(query))
	if upperQuery == "" {
		return nil, nil
	}

	// Run ticker prefix search and name search in parallel
	type searchResult struct {
		results []TickerSearchResult
		err     error
	}

	tickerCh := make(chan searchResult, 1)
	nameCh := make(chan searchResult, 1)

	// Search 1: Exact/prefix ticker match (e.g., "WM" finds "WM", "WMT", "WMS")
	go func() {
		results, err := c.searchByTicker(ctx, upperQuery, limit)
		tickerCh <- searchResult{results: results, err: err}
	}()

	// Search 2: Fuzzy name search (e.g., "waste" finds "Waste Management")
	go func() {
		results, err := c.searchByName(ctx, query, limit)
		nameCh <- searchResult{results: results, err: err}
	}()

	// Collect results
	tickerRes := <-tickerCh
	nameRes := <-nameCh

	// Log any errors but don't fail - use whatever results we got
	if tickerRes.err != nil {
		slog.Debug("ticker search failed", "query", query, "error", tickerRes.err)
	}
	if nameRes.err != nil {
		slog.Debug("name search failed", "query", query, "error", nameRes.err)
	}

	// Merge and deduplicate results
	seen := make(map[string]bool)
	merged := make([]TickerSearchResult, 0, limit)

	// Add ticker matches first (higher priority)
	for _, r := range tickerRes.results {
		if !seen[r.Ticker] && isSearchableType(r.Type) {
			seen[r.Ticker] = true
			merged = append(merged, r)
		}
	}

	// Add name matches second
	for _, r := range nameRes.results {
		if !seen[r.Ticker] && isSearchableType(r.Type) {
			seen[r.Ticker] = true
			merged = append(merged, r)
		}
	}

	// Sort merged results by relevance
	sort.Slice(merged, func(i, j int) bool {
		ti, tj := merged[i].Ticker, merged[j].Ticker

		// Exact match gets highest priority
		exactI := ti == upperQuery
		exactJ := tj == upperQuery
		if exactI != exactJ {
			return exactI
		}

		// Prefix match gets second priority
		prefixI := strings.HasPrefix(ti, upperQuery)
		prefixJ := strings.HasPrefix(tj, upperQuery)
		if prefixI != prefixJ {
			return prefixI
		}

		// Shorter tickers tend to be more well-known
		if len(ti) != len(tj) {
			return len(ti) < len(tj)
		}

		// Alphabetical as final tiebreaker
		return ti < tj
	})

	// Return top N results
	if len(merged) > limit {
		merged = merged[:limit]
	}

	return merged, nil
}

// searchByTicker searches for tickers that start with or match the query.
func (c *Client) searchByTicker(ctx context.Context, upperQuery string, limit int) ([]TickerSearchResult, error) {
	params := url.Values{}
	params.Set("ticker.gte", upperQuery)
	// Use ZZZZ suffix as upper bound to capture all tickers starting with query
	// (e.g., WM -> WMZZZZ captures WM, WMB, WMT, etc.)
	params.Set("ticker.lte", upperQuery+"ZZZZ")
	params.Set("active", "true")
	params.Set("market", "stocks")
	params.Set("sort", "ticker")
	params.Set("order", "asc")
	params.Set("limit", fmt.Sprintf("%d", limit))
	params.Set("apiKey", c.apiKey)

	return c.fetchTickers(ctx, params)
}

// searchByName searches for tickers by company name.
func (c *Client) searchByName(ctx context.Context, query string, limit int) ([]TickerSearchResult, error) {
	params := url.Values{}
	params.Set("search", query)
	params.Set("active", "true")
	params.Set("market", "stocks")
	params.Set("sort", "ticker")
	params.Set("order", "asc")
	params.Set("limit", fmt.Sprintf("%d", limit*2)) // Request more since we'll filter
	params.Set("apiKey", c.apiKey)

	return c.fetchTickers(ctx, params)
}

// fetchTickers makes the actual API request to Polygon.
func (c *Client) fetchTickers(ctx context.Context, params url.Values) ([]TickerSearchResult, error) {
	reqURL := fmt.Sprintf("%s/v3/reference/tickers?%s", baseURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result tickersResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return result.Results, nil
}

// GetShortInterest fetches short interest data from Polygon Massive API.
// Returns nil, nil if no data is available for the ticker.
func (c *Client) GetShortInterest(ctx context.Context, ticker string) (*ShortInterestResult, error) {
	params := url.Values{}
	params.Set("ticker", strings.ToUpper(ticker))
	params.Set("apiKey", c.apiKey)

	reqURL := fmt.Sprintf("%s/stocks/v1/short-interest?%s", baseURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	// 404 or no data is not an error - just no short interest data available
	if resp.StatusCode == http.StatusNotFound {
		slog.Debug("no short interest data available", "ticker", ticker)
		return nil, nil
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result shortInterestResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	// Return the most recent short interest data
	if len(result.Results) == 0 {
		slog.Debug("empty short interest results", "ticker", ticker)
		return nil, nil
	}

	return &result.Results[0], nil
}
