package fmp

import (
	"context"
	"fmt"
	"time"

	"github.com/drewjst/recon/apps/api/internal/domain/models"
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
