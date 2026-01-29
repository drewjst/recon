// Package providers defines interfaces for external data providers.
package providers

import (
	"context"

	"github.com/drewjst/crux/apps/api/internal/domain/models"
)

// FundamentalsProvider provides fundamental company and financial data.
type FundamentalsProvider interface {
	GetCompany(ctx context.Context, ticker string) (*models.Company, error)
	GetFinancials(ctx context.Context, ticker string, periods int) ([]models.Financials, error)
	GetRatios(ctx context.Context, ticker string) (*models.Ratios, error)
	GetInstitutionalHolders(ctx context.Context, ticker string) ([]models.InstitutionalHolder, error)
	GetInstitutionalSummary(ctx context.Context, ticker string) (*models.InstitutionalSummary, error)
	GetInsiderTrades(ctx context.Context, ticker string, days int) ([]models.InsiderTrade, error)
	GetCongressTrades(ctx context.Context, ticker string, days int) ([]models.CongressTrade, error)
	GetDCF(ctx context.Context, ticker string) (*models.DCF, error)
	GetOwnerEarnings(ctx context.Context, ticker string) (*models.OwnerEarnings, error)
	GetIndustryAverages(ctx context.Context, industry string) (*models.IndustryAverages, error)
	GetTechnicalMetrics(ctx context.Context, ticker string) (*models.TechnicalMetrics, error)
	GetShortInterest(ctx context.Context, ticker string) (*models.ShortInterest, error)

	// Analyst estimates (FMP provides this, EODHD returns nil)
	GetAnalystEstimates(ctx context.Context, ticker string) (*models.AnalystEstimates, error)

	// Valuation deep dive methods
	GetStockPeers(ctx context.Context, ticker string) ([]string, error)
	GetQuarterlyRatios(ctx context.Context, ticker string, quarters int) ([]models.QuarterlyRatio, error)
	GetSectorPE(ctx context.Context, sector string, exchange string) (*models.SectorPE, error)
	GetIndustryPE(ctx context.Context, industry string, exchange string) (*models.IndustryPE, error)

	// ETF-specific methods
	IsETF(ctx context.Context, ticker string) (bool, error)
	GetETFData(ctx context.Context, ticker string) (*models.ETFData, error)

	// News
	GetNews(ctx context.Context, ticker string, limit int) ([]models.NewsArticle, error)
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
