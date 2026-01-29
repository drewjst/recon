package eodhd

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/drewjst/crux/apps/api/internal/domain/models"
)

// Provider implements the provider interfaces using EODHD API.
type Provider struct {
	client *Client

	// Cache for fundamentals data to avoid repeated API calls
	// EODHD returns all fundamentals in one call, so we cache it
	cache    map[string]*cachedFundamentals
	cacheMu  sync.RWMutex
	cacheTTL time.Duration
}

type cachedFundamentals struct {
	data      *FundamentalsResponse
	fetchedAt time.Time
}

const defaultCacheTTL = 5 * time.Minute

// NewProvider creates a new EODHD provider.
func NewProvider(apiKey string) *Provider {
	return &Provider{
		client:   NewClient(Config{APIKey: apiKey}),
		cache:    make(map[string]*cachedFundamentals),
		cacheTTL: defaultCacheTTL,
	}
}

// NewProviderWithClient creates a provider with an existing client.
func NewProviderWithClient(client *Client) *Provider {
	return &Provider{
		client:   client,
		cache:    make(map[string]*cachedFundamentals),
		cacheTTL: defaultCacheTTL,
	}
}

// getFundamentals returns cached fundamentals or fetches fresh data.
func (p *Provider) getFundamentals(ctx context.Context, ticker string) (*FundamentalsResponse, error) {
	p.cacheMu.RLock()
	cached, exists := p.cache[ticker]
	p.cacheMu.RUnlock()

	if exists && time.Since(cached.fetchedAt) < p.cacheTTL {
		return cached.data, nil
	}

	// Fetch fresh data
	data, err := p.client.GetFundamentals(ctx, ticker)
	if err != nil {
		return nil, err
	}

	// Cache it
	p.cacheMu.Lock()
	p.cache[ticker] = &cachedFundamentals{
		data:      data,
		fetchedAt: time.Now(),
	}
	p.cacheMu.Unlock()

	return data, nil
}

// GetCompany implements FundamentalsProvider.
func (p *Provider) GetCompany(ctx context.Context, ticker string) (*models.Company, error) {
	fundamentals, err := p.getFundamentals(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching company data: %w", err)
	}
	if fundamentals == nil || fundamentals.General.Code == "" {
		return nil, nil
	}
	return mapCompany(fundamentals), nil
}

// GetFinancials implements FundamentalsProvider.
func (p *Provider) GetFinancials(ctx context.Context, ticker string, periods int) ([]models.Financials, error) {
	fundamentals, err := p.getFundamentals(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching financials: %w", err)
	}
	if fundamentals == nil {
		return nil, nil
	}
	return mapFinancials(fundamentals, periods), nil
}

// GetRatios implements FundamentalsProvider.
func (p *Provider) GetRatios(ctx context.Context, ticker string) (*models.Ratios, error) {
	fundamentals, err := p.getFundamentals(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching ratios: %w", err)
	}
	if fundamentals == nil {
		return nil, nil
	}
	return mapRatios(fundamentals), nil
}

// GetInstitutionalHolders implements FundamentalsProvider.
func (p *Provider) GetInstitutionalHolders(ctx context.Context, ticker string) ([]models.InstitutionalHolder, error) {
	fundamentals, err := p.getFundamentals(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching institutional holders: %w", err)
	}
	if fundamentals == nil {
		return nil, nil
	}
	return mapInstitutionalHolders(fundamentals), nil
}

// GetInstitutionalSummary implements FundamentalsProvider.
// Note: EODHD doesn't provide aggregated institutional summary data.
func (p *Provider) GetInstitutionalSummary(ctx context.Context, ticker string) (*models.InstitutionalSummary, error) {
	// EODHD doesn't have this data
	return nil, nil
}

// GetInsiderTrades implements FundamentalsProvider.
func (p *Provider) GetInsiderTrades(ctx context.Context, ticker string, days int) ([]models.InsiderTrade, error) {
	// Try the dedicated insider transactions endpoint for more detailed data
	trades, err := p.client.GetInsiderTransactions(ctx, ticker, 100)
	if err == nil && len(trades) > 0 {
		return mapInsiderTradesFromResponse(trades, days), nil
	}

	// Fall back to fundamentals data
	fundamentals, err := p.getFundamentals(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching insider trades: %w", err)
	}
	if fundamentals == nil {
		return nil, nil
	}
	return mapInsiderTrades(fundamentals.InsiderTransactions, days), nil
}

// GetCongressTrades implements FundamentalsProvider.
// EODHD doesn't provide Congress trading data.
func (p *Provider) GetCongressTrades(ctx context.Context, ticker string, days int) ([]models.CongressTrade, error) {
	return nil, nil
}

// GetDCF implements FundamentalsProvider.
// Note: EODHD doesn't have a dedicated DCF endpoint.
// This could be calculated from financials if needed.
func (p *Provider) GetDCF(ctx context.Context, ticker string) (*models.DCF, error) {
	// EODHD doesn't provide a DCF endpoint.
	// Return nil to indicate data is not available.
	return nil, nil
}

// GetOwnerEarnings implements FundamentalsProvider.
// EODHD doesn't have an owner earnings endpoint.
func (p *Provider) GetOwnerEarnings(ctx context.Context, ticker string) (*models.OwnerEarnings, error) {
	return nil, nil
}

// GetIndustryAverages implements FundamentalsProvider.
// Note: EODHD doesn't provide industry average data directly.
func (p *Provider) GetIndustryAverages(ctx context.Context, industry string) (*models.IndustryAverages, error) {
	// EODHD doesn't have a direct industry averages endpoint.
	// Future implementation: could aggregate from multiple company fundamentals.
	return nil, nil
}

// GetQuote implements QuoteProvider.
func (p *Provider) GetQuote(ctx context.Context, ticker string) (*models.Quote, error) {
	// Get real-time quote
	quote, err := p.client.GetRealTimeQuote(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching quote: %w", err)
	}
	if quote == nil {
		return nil, nil
	}

	// Get market cap from fundamentals (cached)
	var marketCap int64
	fundamentals, _ := p.getFundamentals(ctx, ticker)
	if fundamentals != nil {
		marketCap = int64(fundamentals.Highlights.MarketCapitalization)
	}

	return mapQuote(quote, ticker, marketCap), nil
}

// GetHistoricalPrices implements QuoteProvider.
func (p *Provider) GetHistoricalPrices(ctx context.Context, ticker string, days int) ([]models.PriceBar, error) {
	fromDate := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	prices, err := p.client.GetHistoricalPrices(ctx, ticker, fromDate)
	if err != nil {
		return nil, fmt.Errorf("fetching historical prices: %w", err)
	}
	return mapHistoricalPrices(prices), nil
}

// Search implements SearchProvider.
func (p *Provider) Search(ctx context.Context, query string, limit int) ([]models.SearchResult, error) {
	results, err := p.client.SearchTicker(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("searching tickers: %w", err)
	}
	return mapSearchResults(results), nil
}

// GetTechnicalMetrics returns technical analysis metrics for a ticker.
func (p *Provider) GetTechnicalMetrics(ctx context.Context, ticker string) (*models.TechnicalMetrics, error) {
	fundamentals, err := p.getFundamentals(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching technical metrics: %w", err)
	}
	if fundamentals == nil {
		return nil, nil
	}
	return mapTechnicalMetrics(fundamentals), nil
}

// GetShortInterest returns short interest data for a ticker.
func (p *Provider) GetShortInterest(ctx context.Context, ticker string) (*models.ShortInterest, error) {
	fundamentals, err := p.getFundamentals(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching short interest: %w", err)
	}
	if fundamentals == nil {
		return nil, nil
	}
	return mapShortInterest(fundamentals), nil
}

// IsETF checks if a ticker is an ETF based on the presence of ETF_Data in fundamentals.
func (p *Provider) IsETF(ctx context.Context, ticker string) (bool, error) {
	fundamentals, err := p.getFundamentals(ctx, ticker)
	if err != nil {
		return false, fmt.Errorf("checking if ETF: %w", err)
	}
	if fundamentals == nil {
		return false, nil
	}
	return fundamentals.ETFData != nil, nil
}

// GetETFData returns ETF-specific data for a ticker.
// Returns nil if the ticker is not an ETF.
func (p *Provider) GetETFData(ctx context.Context, ticker string) (*models.ETFData, error) {
	fundamentals, err := p.getFundamentals(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching ETF data: %w", err)
	}
	if fundamentals == nil || fundamentals.ETFData == nil {
		return nil, nil
	}
	return mapETFData(fundamentals.ETFData), nil
}

// GetAnalystEstimates returns analyst estimates and ratings.
// EODHD has limited analyst data, so this returns nil.
// Use FMP provider for analyst estimates.
func (p *Provider) GetAnalystEstimates(ctx context.Context, ticker string) (*models.AnalystEstimates, error) {
	return nil, nil
}

// GetStockPeers returns peer/competitor companies.
// EODHD doesn't provide peer data, so this returns nil.
// Use FMP provider for peer data.
func (p *Provider) GetStockPeers(ctx context.Context, ticker string) ([]string, error) {
	return nil, nil
}

// GetQuarterlyRatios returns historical quarterly P/E ratios.
// EODHD doesn't provide quarterly ratio history, so this returns nil.
// Use FMP provider for historical ratios.
func (p *Provider) GetQuarterlyRatios(ctx context.Context, ticker string, quarters int) ([]models.QuarterlyRatio, error) {
	return nil, nil
}

// GetSectorPE returns sector P/E data.
// EODHD doesn't provide sector P/E data, so this returns nil.
func (p *Provider) GetSectorPE(ctx context.Context, sector string, exchange string) (*models.SectorPE, error) {
	return nil, nil
}

// GetIndustryPE returns industry P/E data.
// EODHD doesn't provide industry P/E data, so this returns nil.
func (p *Provider) GetIndustryPE(ctx context.Context, industry string, exchange string) (*models.IndustryPE, error) {
	return nil, nil
}

// GetNews returns news articles for a ticker.
// EODHD doesn't provide stock news, so this returns nil.
func (p *Provider) GetNews(ctx context.Context, ticker string, limit int) ([]models.NewsArticle, error) {
	return nil, nil
}
