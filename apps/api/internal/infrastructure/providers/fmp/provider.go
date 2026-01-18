package fmp

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/drewjst/recon/apps/api/internal/domain/models"
	"golang.org/x/sync/errgroup"
)

// Provider implements the provider interfaces using FMP API.
type Provider struct {
	client *Client
}

// NewProvider creates a new FMP provider.
func NewProvider(apiKey string) *Provider {
	return &Provider{
		client: NewClient(Config{APIKey: apiKey}),
	}
}

// NewProviderWithClient creates a provider with an existing client.
func NewProviderWithClient(client *Client) *Provider {
	return &Provider{client: client}
}

// GetCompany implements FundamentalsProvider.
func (p *Provider) GetCompany(ctx context.Context, ticker string) (*models.Company, error) {
	profile, err := p.client.GetCompanyProfile(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching company profile: %w", err)
	}
	if profile == nil {
		return nil, nil
	}
	return mapCompanyProfile(profile), nil
}

// GetFinancials implements FundamentalsProvider.
func (p *Provider) GetFinancials(ctx context.Context, ticker string, periods int) ([]models.Financials, error) {
	income, err := p.client.GetIncomeStatement(ctx, ticker, periods)
	if err != nil {
		return nil, fmt.Errorf("fetching income statements: %w", err)
	}

	balance, err := p.client.GetBalanceSheet(ctx, ticker, periods)
	if err != nil {
		return nil, fmt.Errorf("fetching balance sheets: %w", err)
	}

	cashFlow, err := p.client.GetCashFlowStatement(ctx, ticker, periods)
	if err != nil {
		return nil, fmt.Errorf("fetching cash flows: %w", err)
	}

	// Match up statements by period
	minLen := min(len(income), len(balance), len(cashFlow))
	result := make([]models.Financials, 0, minLen)

	for i := 0; i < minLen; i++ {
		f := mapFinancials(&income[i], &balance[i], &cashFlow[i])
		result = append(result, *f)
	}

	return result, nil
}

// GetRatios implements FundamentalsProvider.
func (p *Provider) GetRatios(ctx context.Context, ticker string) (*models.Ratios, error) {
	// Try TTM first for most current data
	ratiosTTM, err := p.client.GetRatiosTTM(ctx, ticker)
	if err == nil && len(ratiosTTM) > 0 {
		metricsTTM, _ := p.client.GetKeyMetricsTTM(ctx, ticker)
		var metrics *KeyMetricsTTM
		if len(metricsTTM) > 0 {
			metrics = &metricsTTM[0]
		}
		return mapRatiosTTM(&ratiosTTM[0], metrics), nil
	}

	// Fall back to annual ratios
	ratios, err := p.client.GetRatios(ctx, ticker, 1)
	if err != nil {
		return nil, fmt.Errorf("fetching ratios: %w", err)
	}
	if len(ratios) == 0 {
		return nil, nil
	}

	metrics, _ := p.client.GetKeyMetrics(ctx, ticker, 1)
	var keyMetrics *KeyMetrics
	if len(metrics) > 0 {
		keyMetrics = &metrics[0]
	}

	return mapRatios(&ratios[0], keyMetrics), nil
}

// GetInstitutionalHolders implements FundamentalsProvider.
func (p *Provider) GetInstitutionalHolders(ctx context.Context, ticker string) ([]models.InstitutionalHolder, error) {
	year, quarter := getMostRecentFilingQuarter()

	holders, err := p.client.GetInstitutionalHolders(ctx, ticker, year, quarter, 10)
	if err != nil {
		return nil, fmt.Errorf("fetching institutional holders: %w", err)
	}

	if len(holders) == 0 {
		// Try previous quarter
		prevYear, prevQuarter := year, quarter-1
		if prevQuarter == 0 {
			prevQuarter = 4
			prevYear--
		}
		holders, err = p.client.GetInstitutionalHolders(ctx, ticker, prevYear, prevQuarter, 10)
		if err != nil {
			return nil, fmt.Errorf("fetching institutional holders (prev quarter): %w", err)
		}
	}

	result := make([]models.InstitutionalHolder, 0, len(holders))
	for _, h := range holders {
		result = append(result, *mapInstitutionalHolder(&h))
	}

	return result, nil
}

// GetInsiderTrades implements FundamentalsProvider.
func (p *Provider) GetInsiderTrades(ctx context.Context, ticker string, days int) ([]models.InsiderTrade, error) {
	trades, err := p.client.GetInsiderTrades(ctx, ticker, 50)
	if err != nil {
		return nil, fmt.Errorf("fetching insider trades: %w", err)
	}

	cutoff := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	result := make([]models.InsiderTrade, 0)

	for _, t := range trades {
		if t.TransactionDate < cutoff {
			continue
		}
		if t.SecuritiesTransacted == 0 {
			continue
		}
		result = append(result, *mapInsiderTrade(&t))
	}

	return result, nil
}

// GetQuote implements QuoteProvider.
func (p *Provider) GetQuote(ctx context.Context, ticker string) (*models.Quote, error) {
	quote, err := p.client.GetQuote(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching quote: %w", err)
	}
	if quote == nil {
		return nil, nil
	}
	return mapQuote(quote), nil
}

// GetHistoricalPrices implements QuoteProvider.
func (p *Provider) GetHistoricalPrices(ctx context.Context, ticker string, days int) ([]models.PriceBar, error) {
	fromDate := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	prices, err := p.client.GetHistoricalPrices(ctx, ticker, fromDate)
	if err != nil {
		return nil, fmt.Errorf("fetching historical prices: %w", err)
	}

	result := make([]models.PriceBar, 0, len(prices))
	for _, p := range prices {
		result = append(result, *mapHistoricalPrice(&p))
	}

	return result, nil
}

// GetDCF implements FundamentalsProvider.
func (p *Provider) GetDCF(ctx context.Context, ticker string) (*models.DCF, error) {
	dcf, err := p.client.GetDCF(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching DCF: %w", err)
	}
	if dcf == nil {
		return nil, nil
	}
	return &models.DCF{
		Ticker:     dcf.Symbol,
		DCFValue:   dcf.DCF,
		StockPrice: dcf.StockPrice,
	}, nil
}

// Search implements SearchProvider.
func (p *Provider) Search(ctx context.Context, query string, limit int) ([]models.SearchResult, error) {
	results, err := p.client.SearchTicker(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("searching tickers: %w", err)
	}

	mapped := make([]models.SearchResult, 0, len(results))
	for _, r := range results {
		mapped = append(mapped, *mapSearchResult(&r))
	}

	return mapped, nil
}

// GetIndustryAverages implements FundamentalsProvider.
// Note: FMP has limited industry average data. This implementation returns nil
// when data is not available. Future enhancement: compute from sector peers.
func (p *Provider) GetIndustryAverages(ctx context.Context, industry string) (*models.IndustryAverages, error) {
	// FMP doesn't have a direct industry averages endpoint.
	// Future implementation options:
	// 1. Use FMP's sector PE ratio endpoint for basic valuation data
	// 2. Fetch peer companies and compute averages manually
	// 3. Integrate with a different data source that provides industry benchmarks
	return nil, nil
}

// GetTechnicalMetrics implements FundamentalsProvider.
// Extracts technical metrics from Quote (MA50, MA200) and CompanyProfile (Beta).
func (p *Provider) GetTechnicalMetrics(ctx context.Context, ticker string) (*models.TechnicalMetrics, error) {
	// Get quote for moving averages
	quote, err := p.client.GetQuote(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching quote for technical metrics: %w", err)
	}
	if quote == nil {
		return nil, nil
	}

	// Get company profile for beta
	profile, err := p.client.GetCompanyProfile(ctx, ticker)
	if err != nil {
		slog.Warn("failed to fetch profile for beta", "ticker", ticker, "error", err)
	}

	beta := 0.0
	if profile != nil {
		beta = profile.Beta
	}

	return &models.TechnicalMetrics{
		Ticker:   ticker,
		Beta:     beta,
		MA50Day:  quote.PriceAvg50,
		MA200Day: quote.PriceAvg200,
	}, nil
}

// GetShortInterest implements FundamentalsProvider.
// Note: FMP doesn't provide short interest data. Returns nil.
func (p *Provider) GetShortInterest(ctx context.Context, ticker string) (*models.ShortInterest, error) {
	// FMP doesn't have short interest data in the free tier.
	return nil, nil
}

// IsETF implements FundamentalsProvider.
// Checks if the ticker is an ETF by attempting to fetch ETF info.
func (p *Provider) IsETF(ctx context.Context, ticker string) (bool, error) {
	info, err := p.client.GetETFInfo(ctx, ticker)
	if err != nil {
		// Not an error - just means it's likely not an ETF or API issue
		slog.Debug("ETF info check failed", "ticker", ticker, "error", err)
		return false, nil
	}
	return info != nil && info.Symbol != "", nil
}

// GetETFData implements FundamentalsProvider.
// Fetches ETF info, holdings, sector weightings, and profile (for beta) from FMP.
func (p *Provider) GetETFData(ctx context.Context, ticker string) (*models.ETFData, error) {
	var info *ETFInfo
	var holdings []ETFHolding
	var sectors []ETFSectorWeighting
	var profile *CompanyProfile

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		info, err = p.client.GetETFInfo(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch ETF info", "ticker", ticker, "error", err)
		}
		return nil // Don't fail the group on individual errors
	})

	g.Go(func() error {
		var err error
		holdings, err = p.client.GetETFHoldings(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch ETF holdings", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		sectors, err = p.client.GetETFSectorWeightings(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch ETF sector weightings", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		profile, err = p.client.GetCompanyProfile(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch ETF profile for beta", "ticker", ticker, "error", err)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("fetching ETF data: %w", err)
	}

	// If no ETF info, this isn't an ETF
	if info == nil {
		return nil, nil
	}

	return mapETFData(info, holdings, sectors, profile), nil
}

// GetAnalystEstimates implements FundamentalsProvider.
// Fetches analyst ratings, price targets, and EPS/revenue estimates from FMP.
func (p *Provider) GetAnalystEstimates(ctx context.Context, ticker string) (*models.AnalystEstimates, error) {
	var recs []AnalystRecommendation
	var targets *PriceTargetConsensus
	var estimates []AnalystEstimate

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		recs, err = p.client.GetAnalystRecommendations(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch analyst recommendations", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		targets, err = p.client.GetPriceTargetConsensus(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch price targets", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		estimates, err = p.client.GetAnalystEstimates(gctx, ticker, "annual", 4)
		if err != nil {
			slog.Debug("failed to fetch analyst estimates", "ticker", ticker, "error", err)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("fetching analyst estimates: %w", err)
	}

	// If no data at all, return nil
	if len(recs) == 0 && targets == nil && len(estimates) == 0 {
		return nil, nil
	}

	return mapAnalystEstimates(ticker, recs, targets, estimates), nil
}

// getMostRecentFilingQuarter returns the most recent quarter with complete 13F filings.
func getMostRecentFilingQuarter() (year int, quarter int) {
	now := time.Now()
	filingDeadline := now.AddDate(0, 0, -45)

	year = filingDeadline.Year()
	month := int(filingDeadline.Month())

	switch {
	case month >= 10:
		quarter = 3
	case month >= 7:
		quarter = 2
	case month >= 4:
		quarter = 1
	default:
		quarter = 4
		year--
	}

	return year, quarter
}

func min(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}
