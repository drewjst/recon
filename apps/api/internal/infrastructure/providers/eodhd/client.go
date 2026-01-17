// Package eodhd provides a client for the EODHD (eodhistoricaldata.com) API.
package eodhd

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

const (
	baseURL        = "https://eodhd.com/api"
	defaultTimeout = 30 * time.Second
	// EODHD rate limit: varies by plan, default to conservative limit
	defaultRateLimit = 5 // requests per second
)

// Client is the EODHD API client.
type Client struct {
	apiKey      string
	httpClient  *http.Client
	baseURL     string
	rateLimiter *rateLimiter
}

// Config holds EODHD client configuration.
type Config struct {
	APIKey    string
	Timeout   time.Duration
	RateLimit int // requests per second, 0 uses default
}

// rateLimiter implements a simple token bucket rate limiter.
type rateLimiter struct {
	mu        sync.Mutex
	tokens    int
	maxTokens int
	interval  time.Duration
	lastTick  time.Time
}

func newRateLimiter(rps int) *rateLimiter {
	return &rateLimiter{
		tokens:    rps,
		maxTokens: rps,
		interval:  time.Second,
		lastTick:  time.Now(),
	}
}

func (r *rateLimiter) wait(ctx context.Context) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(r.lastTick)

	// Refill tokens based on elapsed time
	if elapsed >= r.interval {
		r.tokens = r.maxTokens
		r.lastTick = now
	}

	if r.tokens > 0 {
		r.tokens--
		return nil
	}

	// Wait until next refill
	waitTime := r.interval - elapsed
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(waitTime):
		r.tokens = r.maxTokens - 1
		r.lastTick = time.Now()
		return nil
	}
}

// NewClient creates a new EODHD API client.
func NewClient(cfg Config) *Client {
	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = defaultTimeout
	}

	rateLimit := cfg.RateLimit
	if rateLimit == 0 {
		rateLimit = defaultRateLimit
	}

	return &Client{
		apiKey: cfg.APIKey,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		baseURL:     baseURL,
		rateLimiter: newRateLimiter(rateLimit),
	}
}

// GetFundamentals retrieves all fundamental data for a ticker.
// This is the primary EODHD endpoint that returns company profile, financials,
// ratios, holders, and insider transactions in a single response.
func (c *Client) GetFundamentals(ctx context.Context, ticker string) (*FundamentalsResponse, error) {
	url := fmt.Sprintf("%s/fundamentals/%s.US?api_token=%s&fmt=json", c.baseURL, ticker, c.apiKey)

	var result FundamentalsResponse
	if err := c.get(ctx, url, &result); err != nil {
		return nil, fmt.Errorf("fetching fundamentals: %w", err)
	}

	return &result, nil
}

// GetRealTimeQuote retrieves real-time quote data for a ticker.
func (c *Client) GetRealTimeQuote(ctx context.Context, ticker string) (*QuoteResponse, error) {
	url := fmt.Sprintf("%s/real-time/%s.US?api_token=%s&fmt=json", c.baseURL, ticker, c.apiKey)

	var result QuoteResponse
	if err := c.get(ctx, url, &result); err != nil {
		return nil, fmt.Errorf("fetching quote: %w", err)
	}

	return &result, nil
}

// GetHistoricalPrices retrieves historical EOD price data.
func (c *Client) GetHistoricalPrices(ctx context.Context, ticker string, fromDate string) ([]HistoricalPrice, error) {
	url := fmt.Sprintf("%s/eod/%s.US?api_token=%s&fmt=json&from=%s", c.baseURL, ticker, c.apiKey, fromDate)

	var result []HistoricalPrice
	if err := c.get(ctx, url, &result); err != nil {
		return nil, fmt.Errorf("fetching historical prices: %w", err)
	}

	return result, nil
}

// GetInsiderTransactions retrieves insider trading transactions.
func (c *Client) GetInsiderTransactions(ctx context.Context, ticker string, limit int) ([]InsiderTransactionResponse, error) {
	url := fmt.Sprintf("%s/insider-transactions?api_token=%s&code=%s.US&limit=%d&fmt=json",
		c.baseURL, c.apiKey, ticker, limit)

	var result []InsiderTransactionResponse
	if err := c.get(ctx, url, &result); err != nil {
		return nil, fmt.Errorf("fetching insider transactions: %w", err)
	}

	return result, nil
}

// SearchTicker searches for tickers matching a query.
func (c *Client) SearchTicker(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	url := fmt.Sprintf("%s/search/%s?api_token=%s&limit=%d&fmt=json", c.baseURL, query, c.apiKey, limit)

	var result []SearchResult
	if err := c.get(ctx, url, &result); err != nil {
		return nil, fmt.Errorf("searching tickers: %w", err)
	}

	return result, nil
}

// get makes an HTTP GET request with rate limiting and unmarshals the response.
func (c *Client) get(ctx context.Context, url string, dest any) error {
	if err := c.rateLimiter.wait(ctx); err != nil {
		return fmt.Errorf("rate limiter: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	if err := json.NewDecoder(resp.Body).Decode(dest); err != nil {
		return fmt.Errorf("decoding response: %w", err)
	}

	return nil
}
