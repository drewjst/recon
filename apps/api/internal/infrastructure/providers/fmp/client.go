// Package fmp provides a client for the Financial Modeling Prep API.
package fmp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const (
	baseURL        = "https://financialmodelingprep.com/stable"
	defaultTimeout = 30 * time.Second
)

// Client is the Financial Modeling Prep API client.
type Client struct {
	apiKey     string
	httpClient *http.Client
	baseURL    string
}

// Config holds FMP client configuration.
type Config struct {
	APIKey  string
	Timeout time.Duration
}

// NewClient creates a new FMP API client.
func NewClient(cfg Config) *Client {
	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = defaultTimeout
	}

	return &Client{
		apiKey: cfg.APIKey,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		baseURL: baseURL,
	}
}

// GetCompanyProfile retrieves company profile information.
func (c *Client) GetCompanyProfile(ctx context.Context, ticker string) (*CompanyProfile, error) {
	url := fmt.Sprintf("%s/profile?symbol=%s&apikey=%s", c.baseURL, ticker, c.apiKey)

	var profiles []CompanyProfile
	if err := c.get(ctx, url, &profiles); err != nil {
		return nil, fmt.Errorf("fetching company profile: %w", err)
	}

	if len(profiles) == 0 {
		return nil, nil
	}

	return &profiles[0], nil
}

// GetQuote retrieves real-time quote data.
func (c *Client) GetQuote(ctx context.Context, ticker string) (*Quote, error) {
	url := fmt.Sprintf("%s/quote?symbol=%s&apikey=%s", c.baseURL, ticker, c.apiKey)

	var quotes []Quote
	if err := c.get(ctx, url, &quotes); err != nil {
		return nil, fmt.Errorf("fetching quote: %w", err)
	}

	if len(quotes) == 0 {
		return nil, nil
	}

	return &quotes[0], nil
}

// GetIncomeStatement retrieves income statement data.
func (c *Client) GetIncomeStatement(ctx context.Context, ticker string, limit int) ([]IncomeStatement, error) {
	url := fmt.Sprintf("%s/income-statement?symbol=%s&period=annual&limit=%d&apikey=%s", c.baseURL, ticker, limit, c.apiKey)

	var statements []IncomeStatement
	if err := c.get(ctx, url, &statements); err != nil {
		return nil, fmt.Errorf("fetching income statement: %w", err)
	}

	return statements, nil
}

// GetBalanceSheet retrieves balance sheet data.
func (c *Client) GetBalanceSheet(ctx context.Context, ticker string, limit int) ([]BalanceSheet, error) {
	url := fmt.Sprintf("%s/balance-sheet-statement?symbol=%s&period=annual&limit=%d&apikey=%s", c.baseURL, ticker, limit, c.apiKey)

	var statements []BalanceSheet
	if err := c.get(ctx, url, &statements); err != nil {
		return nil, fmt.Errorf("fetching balance sheet: %w", err)
	}

	return statements, nil
}

// GetCashFlowStatement retrieves cash flow statement data.
func (c *Client) GetCashFlowStatement(ctx context.Context, ticker string, limit int) ([]CashFlowStatement, error) {
	url := fmt.Sprintf("%s/cash-flow-statement?symbol=%s&period=annual&limit=%d&apikey=%s", c.baseURL, ticker, limit, c.apiKey)

	var statements []CashFlowStatement
	if err := c.get(ctx, url, &statements); err != nil {
		return nil, fmt.Errorf("fetching cash flow statement: %w", err)
	}

	return statements, nil
}

// SearchTicker searches for tickers matching a query.
// Note: Search may return empty results on free tier.
func (c *Client) SearchTicker(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	url := fmt.Sprintf("%s/search?query=%s&limit=%d&apikey=%s", c.baseURL, query, limit, c.apiKey)

	var results []SearchResult
	if err := c.get(ctx, url, &results); err != nil {
		return nil, fmt.Errorf("searching tickers: %w", err)
	}

	return results, nil
}

// GetRatios retrieves financial ratios data.
func (c *Client) GetRatios(ctx context.Context, ticker string, limit int) ([]Ratios, error) {
	url := fmt.Sprintf("%s/ratios?symbol=%s&period=annual&limit=%d&apikey=%s", c.baseURL, ticker, limit, c.apiKey)

	var ratios []Ratios
	if err := c.get(ctx, url, &ratios); err != nil {
		return nil, fmt.Errorf("fetching ratios: %w", err)
	}

	return ratios, nil
}

// GetKeyMetrics retrieves key financial metrics data.
func (c *Client) GetKeyMetrics(ctx context.Context, ticker string, limit int) ([]KeyMetrics, error) {
	url := fmt.Sprintf("%s/key-metrics?symbol=%s&period=annual&limit=%d&apikey=%s", c.baseURL, ticker, limit, c.apiKey)

	var metrics []KeyMetrics
	if err := c.get(ctx, url, &metrics); err != nil {
		return nil, fmt.Errorf("fetching key metrics: %w", err)
	}

	return metrics, nil
}

// GetHistoricalPrices retrieves historical EOD price data.
func (c *Client) GetHistoricalPrices(ctx context.Context, ticker string, fromDate string) ([]HistoricalPrice, error) {
	url := fmt.Sprintf("%s/historical-price-eod/full?symbol=%s&from=%s&apikey=%s", c.baseURL, ticker, fromDate, c.apiKey)

	var prices []HistoricalPrice
	if err := c.get(ctx, url, &prices); err != nil {
		return nil, fmt.Errorf("fetching historical prices: %w", err)
	}

	return prices, nil
}

// GetInsiderTrades retrieves insider trading data using the search endpoint.
func (c *Client) GetInsiderTrades(ctx context.Context, ticker string, limit int) ([]InsiderTrade, error) {
	url := fmt.Sprintf("%s/insider-trading/search?symbol=%s&page=0&limit=%d&apikey=%s", c.baseURL, ticker, limit, c.apiKey)

	var trades []InsiderTrade
	if err := c.get(ctx, url, &trades); err != nil {
		return nil, fmt.Errorf("fetching insider trades: %w", err)
	}

	return trades, nil
}

// GetInsiderStatistics retrieves aggregated insider trading statistics by quarter.
func (c *Client) GetInsiderStatistics(ctx context.Context, ticker string) ([]InsiderStatistics, error) {
	url := fmt.Sprintf("%s/insider-trading/statistics?symbol=%s&apikey=%s", c.baseURL, ticker, c.apiKey)

	var stats []InsiderStatistics
	if err := c.get(ctx, url, &stats); err != nil {
		return nil, fmt.Errorf("fetching insider statistics: %w", err)
	}

	return stats, nil
}

// GetRatiosTTM retrieves trailing twelve month financial ratios.
func (c *Client) GetRatiosTTM(ctx context.Context, ticker string) ([]RatiosTTM, error) {
	url := fmt.Sprintf("%s/ratios-ttm?symbol=%s&apikey=%s", c.baseURL, ticker, c.apiKey)

	var ratios []RatiosTTM
	if err := c.get(ctx, url, &ratios); err != nil {
		return nil, fmt.Errorf("fetching TTM ratios: %w", err)
	}

	return ratios, nil
}

// GetKeyMetricsTTM retrieves trailing twelve month key metrics.
func (c *Client) GetKeyMetricsTTM(ctx context.Context, ticker string) ([]KeyMetricsTTM, error) {
	url := fmt.Sprintf("%s/key-metrics-ttm?symbol=%s&apikey=%s", c.baseURL, ticker, c.apiKey)

	var metrics []KeyMetricsTTM
	if err := c.get(ctx, url, &metrics); err != nil {
		return nil, fmt.Errorf("fetching TTM key metrics: %w", err)
	}

	return metrics, nil
}

// GetDCF retrieves discounted cash flow valuation data.
func (c *Client) GetDCF(ctx context.Context, ticker string) (*DCF, error) {
	url := fmt.Sprintf("%s/discounted-cash-flow?symbol=%s&apikey=%s", c.baseURL, ticker, c.apiKey)

	var dcfData []DCF
	if err := c.get(ctx, url, &dcfData); err != nil {
		return nil, fmt.Errorf("fetching DCF: %w", err)
	}

	if len(dcfData) == 0 {
		return nil, nil
	}

	return &dcfData[0], nil
}

// GetETFInfo retrieves ETF information (expense ratio, AUM, etc.).
func (c *Client) GetETFInfo(ctx context.Context, ticker string) (*ETFInfo, error) {
	url := fmt.Sprintf("%s/etf/info?symbol=%s&apikey=%s", c.baseURL, ticker, c.apiKey)

	var info []ETFInfo
	if err := c.get(ctx, url, &info); err != nil {
		return nil, fmt.Errorf("fetching ETF info: %w", err)
	}

	if len(info) == 0 {
		return nil, nil
	}

	return &info[0], nil
}

// GetETFHoldings retrieves top holdings of an ETF.
func (c *Client) GetETFHoldings(ctx context.Context, ticker string) ([]ETFHolding, error) {
	url := fmt.Sprintf("%s/etf/holder?symbol=%s&apikey=%s", c.baseURL, ticker, c.apiKey)

	var holdings []ETFHolding
	if err := c.get(ctx, url, &holdings); err != nil {
		return nil, fmt.Errorf("fetching ETF holdings: %w", err)
	}

	return holdings, nil
}

// GetETFSectorWeightings retrieves sector breakdown of an ETF.
func (c *Client) GetETFSectorWeightings(ctx context.Context, ticker string) ([]ETFSectorWeighting, error) {
	url := fmt.Sprintf("%s/etf/sector-weightings?symbol=%s&apikey=%s", c.baseURL, ticker, c.apiKey)

	var sectors []ETFSectorWeighting
	if err := c.get(ctx, url, &sectors); err != nil {
		return nil, fmt.Errorf("fetching ETF sector weightings: %w", err)
	}

	return sectors, nil
}

// GetInstitutionalHolders retrieves top institutional holders for a stock.
// Uses the institutional-ownership extract-analytics/holder endpoint with most recent quarter.
func (c *Client) GetInstitutionalHolders(ctx context.Context, ticker string, year int, quarter int, limit int) ([]InstitutionalOwnershipHolder, error) {
	url := fmt.Sprintf("%s/institutional-ownership/extract-analytics/holder?symbol=%s&year=%d&quarter=%d&page=0&limit=%d&apikey=%s",
		c.baseURL, ticker, year, quarter, limit, c.apiKey)

	var holders []InstitutionalOwnershipHolder
	if err := c.get(ctx, url, &holders); err != nil {
		return nil, fmt.Errorf("fetching institutional holders: %w", err)
	}

	return holders, nil
}

// GetAnalystRecommendations retrieves analyst buy/hold/sell ratings.
func (c *Client) GetAnalystRecommendations(ctx context.Context, ticker string) ([]AnalystRecommendation, error) {
	url := fmt.Sprintf("%s/analyst-stock-recommendations?symbol=%s&apikey=%s", c.baseURL, ticker, c.apiKey)

	var recommendations []AnalystRecommendation
	if err := c.get(ctx, url, &recommendations); err != nil {
		return nil, fmt.Errorf("fetching analyst recommendations: %w", err)
	}

	return recommendations, nil
}

// GetPriceTargetConsensus retrieves analyst price target consensus.
func (c *Client) GetPriceTargetConsensus(ctx context.Context, ticker string) (*PriceTargetConsensus, error) {
	url := fmt.Sprintf("%s/price-target-consensus?symbol=%s&apikey=%s", c.baseURL, ticker, c.apiKey)

	var targets []PriceTargetConsensus
	if err := c.get(ctx, url, &targets); err != nil {
		return nil, fmt.Errorf("fetching price target consensus: %w", err)
	}

	if len(targets) == 0 {
		return nil, nil
	}

	return &targets[0], nil
}

// GetAnalystEstimates retrieves EPS and revenue estimates.
func (c *Client) GetAnalystEstimates(ctx context.Context, ticker string, period string, limit int) ([]AnalystEstimate, error) {
	url := fmt.Sprintf("%s/analyst-estimates?symbol=%s&period=%s&limit=%d&apikey=%s",
		c.baseURL, ticker, period, limit, c.apiKey)

	var estimates []AnalystEstimate
	if err := c.get(ctx, url, &estimates); err != nil {
		return nil, fmt.Errorf("fetching analyst estimates: %w", err)
	}

	return estimates, nil
}

// get makes an HTTP GET request and unmarshals the response.
func (c *Client) get(ctx context.Context, url string, dest any) error {
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
