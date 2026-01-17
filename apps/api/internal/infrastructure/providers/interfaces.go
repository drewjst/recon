// Package providers defines interfaces for external data providers.
package providers

import (
	"context"

	"github.com/drewjst/recon/apps/api/internal/domain/models"
)

// FundamentalsProvider provides fundamental company and financial data.
type FundamentalsProvider interface {
	GetCompany(ctx context.Context, ticker string) (*models.Company, error)
	GetFinancials(ctx context.Context, ticker string, periods int) ([]models.Financials, error)
	GetRatios(ctx context.Context, ticker string) (*models.Ratios, error)
	GetInstitutionalHolders(ctx context.Context, ticker string) ([]models.InstitutionalHolder, error)
	GetInsiderTrades(ctx context.Context, ticker string, days int) ([]models.InsiderTrade, error)
	GetDCF(ctx context.Context, ticker string) (*models.DCF, error)
	GetIndustryAverages(ctx context.Context, industry string) (*models.IndustryAverages, error)
	GetTechnicalMetrics(ctx context.Context, ticker string) (*models.TechnicalMetrics, error)
	GetShortInterest(ctx context.Context, ticker string) (*models.ShortInterest, error)
}

// QuoteProvider provides real-time and historical price data.
type QuoteProvider interface {
	GetQuote(ctx context.Context, ticker string) (*models.Quote, error)
	GetHistoricalPrices(ctx context.Context, ticker string, days int) ([]models.PriceBar, error)
}

// SearchProvider provides ticker search functionality.
type SearchProvider interface {
	Search(ctx context.Context, query string, limit int) ([]models.SearchResult, error)
}
