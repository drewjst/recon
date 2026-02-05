// Package fmp provides a client for the Financial Modeling Prep API.
package fmp

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// normalizeTicker converts ticker symbols to FMP format.
// FMP uses hyphens for share classes (BRK-A, BRK-B) while other providers use dots (BRK.A, BRK.B).
func normalizeTicker(ticker string) string {
	return strings.ReplaceAll(ticker, ".", "-")
}

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
	url := fmt.Sprintf("%s/profile?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

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
	url := fmt.Sprintf("%s/quote?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

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
	url := fmt.Sprintf("%s/income-statement?symbol=%s&period=annual&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var statements []IncomeStatement
	if err := c.get(ctx, url, &statements); err != nil {
		return nil, fmt.Errorf("fetching income statement: %w", err)
	}

	return statements, nil
}

// GetBalanceSheet retrieves balance sheet data.
func (c *Client) GetBalanceSheet(ctx context.Context, ticker string, limit int) ([]BalanceSheet, error) {
	url := fmt.Sprintf("%s/balance-sheet-statement?symbol=%s&period=annual&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var statements []BalanceSheet
	if err := c.get(ctx, url, &statements); err != nil {
		return nil, fmt.Errorf("fetching balance sheet: %w", err)
	}

	return statements, nil
}

// GetCashFlowStatement retrieves cash flow statement data.
func (c *Client) GetCashFlowStatement(ctx context.Context, ticker string, limit int) ([]CashFlowStatement, error) {
	url := fmt.Sprintf("%s/cash-flow-statement?symbol=%s&period=annual&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var statements []CashFlowStatement
	if err := c.get(ctx, url, &statements); err != nil {
		return nil, fmt.Errorf("fetching cash flow statement: %w", err)
	}

	return statements, nil
}

// GetQuarterlyIncomeStatement retrieves quarterly income statement data.
func (c *Client) GetQuarterlyIncomeStatement(ctx context.Context, ticker string, limit int) ([]IncomeStatement, error) {
	url := fmt.Sprintf("%s/income-statement?symbol=%s&period=quarter&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var statements []IncomeStatement
	if err := c.get(ctx, url, &statements); err != nil {
		return nil, fmt.Errorf("fetching quarterly income statement: %w", err)
	}

	return statements, nil
}

// GetQuarterlyBalanceSheet retrieves quarterly balance sheet data.
func (c *Client) GetQuarterlyBalanceSheet(ctx context.Context, ticker string, limit int) ([]BalanceSheet, error) {
	url := fmt.Sprintf("%s/balance-sheet-statement?symbol=%s&period=quarter&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var statements []BalanceSheet
	if err := c.get(ctx, url, &statements); err != nil {
		return nil, fmt.Errorf("fetching quarterly balance sheet: %w", err)
	}

	return statements, nil
}

// GetQuarterlyCashFlowStatement retrieves quarterly cash flow statement data.
func (c *Client) GetQuarterlyCashFlowStatement(ctx context.Context, ticker string, limit int) ([]CashFlowStatement, error) {
	url := fmt.Sprintf("%s/cash-flow-statement?symbol=%s&period=quarter&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var statements []CashFlowStatement
	if err := c.get(ctx, url, &statements); err != nil {
		return nil, fmt.Errorf("fetching quarterly cash flow statement: %w", err)
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
	url := fmt.Sprintf("%s/ratios?symbol=%s&period=annual&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var ratios []Ratios
	if err := c.get(ctx, url, &ratios); err != nil {
		return nil, fmt.Errorf("fetching ratios: %w", err)
	}

	return ratios, nil
}

// GetKeyMetrics retrieves key financial metrics data.
func (c *Client) GetKeyMetrics(ctx context.Context, ticker string, limit int) ([]KeyMetrics, error) {
	url := fmt.Sprintf("%s/key-metrics?symbol=%s&period=annual&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var metrics []KeyMetrics
	if err := c.get(ctx, url, &metrics); err != nil {
		return nil, fmt.Errorf("fetching key metrics: %w", err)
	}

	return metrics, nil
}

// GetHistoricalPrices retrieves historical EOD price data.
func (c *Client) GetHistoricalPrices(ctx context.Context, ticker string, fromDate string) ([]HistoricalPrice, error) {
	url := fmt.Sprintf("%s/historical-price-eod/full?symbol=%s&from=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), fromDate, c.apiKey)

	var prices []HistoricalPrice
	if err := c.get(ctx, url, &prices); err != nil {
		return nil, fmt.Errorf("fetching historical prices: %w", err)
	}

	return prices, nil
}

// GetInsiderTrades retrieves insider trading data using the search endpoint.
func (c *Client) GetInsiderTrades(ctx context.Context, ticker string, limit int) ([]InsiderTrade, error) {
	url := fmt.Sprintf("%s/insider-trading/search?symbol=%s&page=0&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var trades []InsiderTrade
	if err := c.get(ctx, url, &trades); err != nil {
		return nil, fmt.Errorf("fetching insider trades: %w", err)
	}

	return trades, nil
}

// GetInsiderStatistics retrieves aggregated insider trading statistics by quarter.
func (c *Client) GetInsiderStatistics(ctx context.Context, ticker string) ([]InsiderStatistics, error) {
	url := fmt.Sprintf("%s/insider-trading/statistics?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var stats []InsiderStatistics
	if err := c.get(ctx, url, &stats); err != nil {
		return nil, fmt.Errorf("fetching insider statistics: %w", err)
	}

	return stats, nil
}

// GetSenateTrades retrieves Senate member stock trades for a ticker.
func (c *Client) GetSenateTrades(ctx context.Context, ticker string) ([]SenateTrade, error) {
	url := fmt.Sprintf("%s/senate-trades?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var trades []SenateTrade
	if err := c.get(ctx, url, &trades); err != nil {
		return nil, fmt.Errorf("fetching senate trades: %w", err)
	}

	return trades, nil
}

// GetHouseTrades retrieves House member stock trades for a ticker.
func (c *Client) GetHouseTrades(ctx context.Context, ticker string) ([]HouseTrade, error) {
	url := fmt.Sprintf("%s/house-trades?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var trades []HouseTrade
	if err := c.get(ctx, url, &trades); err != nil {
		return nil, fmt.Errorf("fetching house trades: %w", err)
	}

	return trades, nil
}

// GetRatiosTTM retrieves trailing twelve month financial ratios.
func (c *Client) GetRatiosTTM(ctx context.Context, ticker string) ([]RatiosTTM, error) {
	url := fmt.Sprintf("%s/ratios-ttm?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var ratios []RatiosTTM
	if err := c.get(ctx, url, &ratios); err != nil {
		return nil, fmt.Errorf("fetching TTM ratios: %w", err)
	}

	return ratios, nil
}

// GetKeyMetricsTTM retrieves trailing twelve month key metrics.
func (c *Client) GetKeyMetricsTTM(ctx context.Context, ticker string) ([]KeyMetricsTTM, error) {
	url := fmt.Sprintf("%s/key-metrics-ttm?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var metrics []KeyMetricsTTM
	if err := c.get(ctx, url, &metrics); err != nil {
		return nil, fmt.Errorf("fetching TTM key metrics: %w", err)
	}

	return metrics, nil
}

// GetFinancialGrowth retrieves pre-calculated financial growth metrics.
// Returns YoY growth rates for revenue, EPS, FCF, etc.
func (c *Client) GetFinancialGrowth(ctx context.Context, ticker string, limit int) ([]FinancialGrowth, error) {
	url := fmt.Sprintf("%s/financial-growth?symbol=%s&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var growth []FinancialGrowth
	if err := c.get(ctx, url, &growth); err != nil {
		return nil, fmt.Errorf("fetching financial growth: %w", err)
	}

	return growth, nil
}

// GetDCF retrieves discounted cash flow valuation data.
func (c *Client) GetDCF(ctx context.Context, ticker string) (*DCF, error) {
	url := fmt.Sprintf("%s/discounted-cash-flow?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var dcfData []DCF
	if err := c.get(ctx, url, &dcfData); err != nil {
		slog.Debug("FMP DCF API error", "ticker", ticker, "error", err)
		return nil, fmt.Errorf("fetching DCF: %w", err)
	}

	if len(dcfData) == 0 {
		slog.Debug("FMP DCF API returned empty array", "ticker", ticker)
		return nil, nil
	}

	slog.Debug("FMP DCF API success", "ticker", ticker, "dcf", dcfData[0].DCF, "stockPrice", dcfData[0].StockPrice)
	return &dcfData[0], nil
}

// GetOwnerEarnings retrieves owner earnings data (Buffett-style earnings).
func (c *Client) GetOwnerEarnings(ctx context.Context, ticker string) (*OwnerEarnings, error) {
	url := fmt.Sprintf("%s/owner-earnings?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var data []OwnerEarnings
	if err := c.get(ctx, url, &data); err != nil {
		slog.Debug("FMP owner-earnings API error", "ticker", ticker, "error", err)
		return nil, fmt.Errorf("fetching owner earnings: %w", err)
	}

	if len(data) == 0 {
		slog.Debug("FMP owner-earnings API returned empty array", "ticker", ticker)
		return nil, nil
	}

	slog.Debug("FMP owner-earnings API success", "ticker", ticker, "ownersEarnings", data[0].OwnersEarnings)
	return &data[0], nil
}

// GetETFInfo retrieves ETF information (expense ratio, AUM, etc.).
func (c *Client) GetETFInfo(ctx context.Context, ticker string) (*ETFInfo, error) {
	url := fmt.Sprintf("%s/etf/info?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

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
// Note: This endpoint requires a premium FMP subscription tier.
func (c *Client) GetETFHoldings(ctx context.Context, ticker string) ([]ETFHolding, error) {
	url := fmt.Sprintf("%s/etf/holdings?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var holdings []ETFHolding
	if err := c.get(ctx, url, &holdings); err != nil {
		return nil, fmt.Errorf("fetching ETF holdings: %w", err)
	}

	return holdings, nil
}

// GetETFSectorWeightings retrieves sector breakdown of an ETF.
func (c *Client) GetETFSectorWeightings(ctx context.Context, ticker string) ([]ETFSectorWeighting, error) {
	url := fmt.Sprintf("%s/etf/sector-weightings?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var sectors []ETFSectorWeighting
	if err := c.get(ctx, url, &sectors); err != nil {
		return nil, fmt.Errorf("fetching ETF sector weightings: %w", err)
	}

	return sectors, nil
}

// GetETFCountryWeightings retrieves country/region breakdown of an ETF.
func (c *Client) GetETFCountryWeightings(ctx context.Context, ticker string) ([]ETFCountryWeighting, error) {
	url := fmt.Sprintf("%s/etf/country-weightings?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var countries []ETFCountryWeighting
	if err := c.get(ctx, url, &countries); err != nil {
		return nil, fmt.Errorf("fetching ETF country weightings: %w", err)
	}

	return countries, nil
}

// GetInstitutionalHolders retrieves top institutional holders for a stock.
// Uses the institutional-ownership extract-analytics/holder endpoint with most recent quarter.
func (c *Client) GetInstitutionalHolders(ctx context.Context, ticker string, year int, quarter int, limit int) ([]InstitutionalOwnershipHolder, error) {
	url := fmt.Sprintf("%s/institutional-ownership/extract-analytics/holder?symbol=%s&year=%d&quarter=%d&page=0&limit=%d&apikey=%s",
		c.baseURL, normalizeTicker(ticker), year, quarter, limit, c.apiKey)

	var holders []InstitutionalOwnershipHolder
	if err := c.get(ctx, url, &holders); err != nil {
		return nil, fmt.Errorf("fetching institutional holders: %w", err)
	}

	return holders, nil
}

// GetInstitutionalPositionsSummary retrieves aggregated institutional ownership data.
// Returns ownership percent, investor counts, and QoQ changes.
func (c *Client) GetInstitutionalPositionsSummary(ctx context.Context, ticker string, year int, quarter int) (*InstitutionalPositionsSummary, error) {
	url := fmt.Sprintf("%s/institutional-ownership/symbol-positions-summary?symbol=%s&year=%d&quarter=%d&apikey=%s",
		c.baseURL, normalizeTicker(ticker), year, quarter, c.apiKey)

	var summaries []InstitutionalPositionsSummary
	if err := c.get(ctx, url, &summaries); err != nil {
		return nil, fmt.Errorf("fetching institutional positions summary: %w", err)
	}

	if len(summaries) == 0 {
		return nil, nil
	}

	return &summaries[0], nil
}

// GetInstitutionalHolderBreakdown retrieves holder type breakdown (Investment Advisors, Hedge Funds, etc.)
func (c *Client) GetInstitutionalHolderBreakdown(ctx context.Context, ticker string, year int, quarter int) ([]InstitutionalHolderBreakdown, error) {
	url := fmt.Sprintf("%s/institutional-ownership/holder-industry-breakdown?symbol=%s&year=%d&quarter=%d&apikey=%s",
		c.baseURL, normalizeTicker(ticker), year, quarter, c.apiKey)

	var breakdown []InstitutionalHolderBreakdown
	if err := c.get(ctx, url, &breakdown); err != nil {
		return nil, fmt.Errorf("fetching holder industry breakdown: %w", err)
	}

	return breakdown, nil
}

// GetInstitutionalOwnershipHistory retrieves historical institutional ownership across multiple quarters.
// Fetches data for the specified number of quarters going back from the most recent.
func (c *Client) GetInstitutionalOwnershipHistory(ctx context.Context, ticker string, quarters int) ([]InstitutionalPositionsSummary, error) {
	var history []InstitutionalPositionsSummary

	// Get the most recent quarter with complete 13F data
	// Use conservative estimates - major institutions file close to the deadline
	now := time.Now()
	year := now.Year()
	month := int(now.Month())

	var quarter int
	switch {
	case month <= 2: // Jan-Feb: use Q3 of previous year
		year--
		quarter = 3
	case month <= 5: // Mar-May: use Q4 of previous year
		year--
		quarter = 4
	case month <= 8: // Jun-Aug: use Q1
		quarter = 1
	case month <= 11: // Sep-Nov: use Q2
		quarter = 2
	default: // December: use Q3
		quarter = 3
	}

	for i := 0; i < quarters; i++ {
		summary, err := c.GetInstitutionalPositionsSummary(ctx, ticker, year, quarter)
		if err != nil {
			// Log and continue - some quarters may not have data
			slog.Debug("failed to fetch institutional summary for quarter", "ticker", ticker, "year", year, "quarter", quarter, "error", err)
		} else if summary != nil && summary.OwnershipPercent > 0 {
			// Set year/quarter since the API doesn't return them
			summary.Year = year
			summary.Quarter = quarter
			history = append(history, *summary)
		}

		// Move to previous quarter
		quarter--
		if quarter < 1 {
			quarter = 4
			year--
		}
	}

	return history, nil
}

// GetGradesConsensus retrieves pre-aggregated analyst grades consensus.
func (c *Client) GetGradesConsensus(ctx context.Context, ticker string) (*GradesConsensus, error) {
	url := fmt.Sprintf("%s/grades-consensus?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var consensus []GradesConsensus
	if err := c.get(ctx, url, &consensus); err != nil {
		return nil, fmt.Errorf("fetching grades consensus: %w", err)
	}

	if len(consensus) == 0 {
		return nil, nil
	}

	return &consensus[0], nil
}

// GetPriceTargetConsensus retrieves analyst price target consensus.
func (c *Client) GetPriceTargetConsensus(ctx context.Context, ticker string) (*PriceTargetConsensus, error) {
	url := fmt.Sprintf("%s/price-target-consensus?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

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
		c.baseURL, normalizeTicker(ticker), period, limit, c.apiKey)

	var estimates []AnalystEstimate
	if err := c.get(ctx, url, &estimates); err != nil {
		return nil, fmt.Errorf("fetching analyst estimates: %w", err)
	}

	return estimates, nil
}

// GetStockPeers retrieves peer/competitor companies for a stock.
// Returns a list of peer ticker symbols.
func (c *Client) GetStockPeers(ctx context.Context, ticker string) ([]string, error) {
	url := fmt.Sprintf("%s/stock-peers?symbol=%s&apikey=%s", c.baseURL, normalizeTicker(ticker), c.apiKey)

	var peers []StockPeer
	if err := c.get(ctx, url, &peers); err != nil {
		return nil, fmt.Errorf("fetching stock peers for %s: %w", ticker, err)
	}

	if len(peers) == 0 {
		return nil, nil
	}

	// Extract just the ticker symbols
	tickers := make([]string, 0, len(peers))
	for _, p := range peers {
		if p.Symbol != "" {
			tickers = append(tickers, p.Symbol)
		}
	}

	return tickers, nil
}

// GetQuarterlyRatios retrieves quarterly financial ratios for historical analysis.
func (c *Client) GetQuarterlyRatios(ctx context.Context, ticker string, limit int) ([]Ratios, error) {
	url := fmt.Sprintf("%s/ratios?symbol=%s&period=quarter&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var ratios []Ratios
	if err := c.get(ctx, url, &ratios); err != nil {
		return nil, fmt.Errorf("fetching quarterly ratios: %w", err)
	}

	return ratios, nil
}

// SectorPE represents sector P/E data from FMP.
type SectorPE struct {
	Date     string  `json:"date"`
	Sector   string  `json:"sector"`
	Exchange string  `json:"exchange"`
	PE       float64 `json:"pe"`
}

// IndustryPE represents industry-level P/E data from FMP.
type IndustryPE struct {
	Date     string  `json:"date"`
	Industry string  `json:"industry"`
	Exchange string  `json:"exchange"`
	PE       float64 `json:"pe"`
}

// GetSectorPE retrieves sector P/E ratio for a given sector.
func (c *Client) GetSectorPE(ctx context.Context, sector string, exchange string) (*SectorPE, error) {
	// Use recent date for current sector P/E
	url := fmt.Sprintf("%s/sector-pe?exchange=%s&apikey=%s", c.baseURL, exchange, c.apiKey)

	var sectorPEs []SectorPE
	if err := c.get(ctx, url, &sectorPEs); err != nil {
		return nil, fmt.Errorf("fetching sector P/E: %w", err)
	}

	// Find matching sector
	for _, sp := range sectorPEs {
		if sp.Sector == sector {
			return &sp, nil
		}
	}

	return nil, nil
}

// GetIndustryPE retrieves industry P/E ratio (more granular than sector).
func (c *Client) GetIndustryPE(ctx context.Context, industry string, exchange string) (*IndustryPE, error) {
	url := fmt.Sprintf("%s/industry-pe?exchange=%s&apikey=%s", c.baseURL, exchange, c.apiKey)

	var industryPEs []IndustryPE
	if err := c.get(ctx, url, &industryPEs); err != nil {
		return nil, fmt.Errorf("fetching industry P/E: %w", err)
	}

	// Find matching industry
	for _, ip := range industryPEs {
		if ip.Industry == industry {
			return &ip, nil
		}
	}

	return nil, nil
}

// GetNews retrieves recent news articles for a ticker.
func (c *Client) GetNews(ctx context.Context, ticker string, limit int) ([]NewsArticle, error) {
	url := fmt.Sprintf("%s/news/stock?symbols=%s&limit=%d&apikey=%s", c.baseURL, normalizeTicker(ticker), limit, c.apiKey)

	var articles []NewsArticle
	if err := c.get(ctx, url, &articles); err != nil {
		return nil, fmt.Errorf("fetching news: %w", err)
	}

	return articles, nil
}

// GetStockScreener retrieves stocks matching the given sector from FMP's screener.
// Results are sorted by market cap descending and filtered to actively traded US stocks.
func (c *Client) GetStockScreener(ctx context.Context, sector string, limit int) ([]ScreenerResult, error) {
	url := fmt.Sprintf(
		"%s/company-screener?sector=%s&limit=%d&country=US&exchange=NYSE,NASDAQ&isActivelyTrading=true&apikey=%s",
		c.baseURL, sector, limit, c.apiKey,
	)

	var results []ScreenerResult
	if err := c.get(ctx, url, &results); err != nil {
		return nil, fmt.Errorf("fetching screener for sector %s: %w", sector, err)
	}

	return results, nil
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

	// Read body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reading response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	if err := json.Unmarshal(body, dest); err != nil {
		return fmt.Errorf("decoding response: %w (body: %.200s)", err, string(body))
	}

	return nil
}

