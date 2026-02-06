// Package providers defines interfaces and implementations for external data providers.
package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/drewjst/crux/apps/api/internal/domain/models"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/db"
	"gorm.io/datatypes"
)

// Cache data types for provider cache keys.
const (
	cacheCompany             = "company"
	cacheFinancials          = "financials"
	cacheRatios              = "ratios"
	cacheQuarterlyRatios     = "quarterly_ratios"
	cacheInstitutionalHolder = "institutional_holders"
	cacheInstitutionalSum    = "institutional_summary"
	cacheInsiderTrades       = "insider_trades"
	cacheCongressTrades      = "congress_trades"
	cacheDCF                 = "dcf"
	cacheOwnerEarnings       = "owner_earnings"
	cacheIndustryAverages    = "industry_averages"
	cacheTechnicalMetrics    = "technical_metrics"
	cacheShortInterest       = "short_interest"
	cacheAnalystEstimates    = "analyst_estimates"
	cacheStockPeers          = "stock_peers"
	cacheSectorPE            = "sector_pe"
	cacheIndustryPE          = "industry_pe"
	cacheETFData             = "etf_data"
	cacheIsETF               = "is_etf"
	cacheNews                = "news"
)

// Cache TTLs.
const (
	ttlDefault = 24 * time.Hour
	ttlInsider = 12 * time.Hour
)

// CacheRepository defines the interface for cache storage.
type CacheRepository interface {
	GetProviderCache(dataType, key string) (*db.ProviderCache, error)
	SetProviderCache(cache *db.ProviderCache) error
}

// CachedFundamentalsProvider wraps a FundamentalsProvider with caching.
type CachedFundamentalsProvider struct {
	underlying FundamentalsProvider
	cache      CacheRepository
	provider   string
}

// NewCachedFundamentalsProvider creates a new cached provider wrapper.
func NewCachedFundamentalsProvider(underlying FundamentalsProvider, cache CacheRepository, providerName string) *CachedFundamentalsProvider {
	return &CachedFundamentalsProvider{underlying: underlying, cache: cache, provider: providerName}
}

// cached is a generic helper that handles cache get/set logic for pointer types.
func cached[T any](p *CachedFundamentalsProvider, cacheType, key string, ttl time.Duration, fetch func() (*T, error)) (*T, error) {
	if p.cache != nil {
		entry, err := p.cache.GetProviderCache(cacheType, key)
		if err != nil {
			slog.Warn("cache get failed", "type", cacheType, "key", key, "error", err)
		} else if entry != nil && time.Now().Before(entry.ExpiresAt) {
			var result T
			if err := json.Unmarshal(entry.Data, &result); err != nil {
				slog.Warn("cache unmarshal failed", "type", cacheType, "key", key, "error", err)
			} else {
				slog.Debug("cache hit", "type", cacheType, "key", key)
				return &result, nil
			}
		}
	}

	result, err := fetch()
	if err != nil {
		return nil, err
	}
	if result != nil && p.cache != nil {
		data, err := json.Marshal(result)
		if err != nil {
			slog.Warn("cache marshal failed", "type", cacheType, "key", key, "error", err)
		} else {
			go func() {
				if err := p.cache.SetProviderCache(&db.ProviderCache{
					DataType: cacheType, Key: key, Data: datatypes.JSON(data),
					Provider: p.provider, ExpiresAt: time.Now().Add(ttl),
				}); err != nil {
					slog.Warn("cache set failed", "type", cacheType, "key", key, "error", err)
				}
			}()
		}
	}
	return result, nil
}

// cachedSlice is a generic helper for slice types.
func cachedSlice[T any](p *CachedFundamentalsProvider, cacheType, key string, ttl time.Duration, fetch func() ([]T, error)) ([]T, error) {
	if p.cache != nil {
		entry, err := p.cache.GetProviderCache(cacheType, key)
		if err != nil {
			slog.Warn("cache get failed", "type", cacheType, "key", key, "error", err)
		} else if entry != nil && time.Now().Before(entry.ExpiresAt) {
			var result []T
			if err := json.Unmarshal(entry.Data, &result); err != nil {
				slog.Warn("cache unmarshal failed", "type", cacheType, "key", key, "error", err)
			} else {
				slog.Debug("cache hit", "type", cacheType, "key", key)
				return result, nil
			}
		}
	}

	result, err := fetch()
	if err != nil {
		return nil, err
	}
	if len(result) > 0 && p.cache != nil {
		data, err := json.Marshal(result)
		if err != nil {
			slog.Warn("cache marshal failed", "type", cacheType, "key", key, "error", err)
		} else {
			go func() {
				if err := p.cache.SetProviderCache(&db.ProviderCache{
					DataType: cacheType, Key: key, Data: datatypes.JSON(data),
					Provider: p.provider, ExpiresAt: time.Now().Add(ttl),
				}); err != nil {
					slog.Warn("cache set failed", "type", cacheType, "key", key, "error", err)
				}
			}()
		}
	}
	return result, nil
}

// Interface implementations using generic helpers.

func (p *CachedFundamentalsProvider) GetCompany(ctx context.Context, ticker string) (*models.Company, error) {
	return cached(p, cacheCompany, ticker, ttlDefault, func() (*models.Company, error) {
		return p.underlying.GetCompany(ctx, ticker)
	})
}

func (p *CachedFundamentalsProvider) GetFinancials(ctx context.Context, ticker string, periods int) ([]models.Financials, error) {
	return cachedSlice(p, cacheFinancials, fmt.Sprintf("%s:%d", ticker, periods), ttlDefault, func() ([]models.Financials, error) {
		return p.underlying.GetFinancials(ctx, ticker, periods)
	})
}

func (p *CachedFundamentalsProvider) GetRatios(ctx context.Context, ticker string) (*models.Ratios, error) {
	return cached(p, cacheRatios, ticker, ttlDefault, func() (*models.Ratios, error) {
		return p.underlying.GetRatios(ctx, ticker)
	})
}

func (p *CachedFundamentalsProvider) GetQuarterlyRatios(ctx context.Context, ticker string, quarters int) ([]models.QuarterlyRatio, error) {
	return cachedSlice(p, cacheQuarterlyRatios, fmt.Sprintf("%s:%d", ticker, quarters), ttlDefault, func() ([]models.QuarterlyRatio, error) {
		return p.underlying.GetQuarterlyRatios(ctx, ticker, quarters)
	})
}

func (p *CachedFundamentalsProvider) GetInstitutionalHolders(ctx context.Context, ticker string) ([]models.InstitutionalHolder, error) {
	return cachedSlice(p, cacheInstitutionalHolder, ticker, ttlDefault, func() ([]models.InstitutionalHolder, error) {
		return p.underlying.GetInstitutionalHolders(ctx, ticker)
	})
}

func (p *CachedFundamentalsProvider) GetInstitutionalSummary(ctx context.Context, ticker string) (*models.InstitutionalSummary, error) {
	return cached(p, cacheInstitutionalSum, ticker, ttlDefault, func() (*models.InstitutionalSummary, error) {
		return p.underlying.GetInstitutionalSummary(ctx, ticker)
	})
}

func (p *CachedFundamentalsProvider) GetInsiderTrades(ctx context.Context, ticker string, days int) ([]models.InsiderTrade, error) {
	return cachedSlice(p, cacheInsiderTrades, fmt.Sprintf("%s:%d", ticker, days), ttlInsider, func() ([]models.InsiderTrade, error) {
		return p.underlying.GetInsiderTrades(ctx, ticker, days)
	})
}

func (p *CachedFundamentalsProvider) GetDCF(ctx context.Context, ticker string) (*models.DCF, error) {
	return cached(p, cacheDCF, ticker, ttlDefault, func() (*models.DCF, error) {
		return p.underlying.GetDCF(ctx, ticker)
	})
}

func (p *CachedFundamentalsProvider) GetOwnerEarnings(ctx context.Context, ticker string) (*models.OwnerEarnings, error) {
	return cached(p, cacheOwnerEarnings, ticker, ttlDefault, func() (*models.OwnerEarnings, error) {
		return p.underlying.GetOwnerEarnings(ctx, ticker)
	})
}

func (p *CachedFundamentalsProvider) GetIndustryAverages(ctx context.Context, industry string) (*models.IndustryAverages, error) {
	return cached(p, cacheIndustryAverages, industry, ttlDefault, func() (*models.IndustryAverages, error) {
		return p.underlying.GetIndustryAverages(ctx, industry)
	})
}

func (p *CachedFundamentalsProvider) GetTechnicalMetrics(ctx context.Context, ticker string) (*models.TechnicalMetrics, error) {
	return cached(p, cacheTechnicalMetrics, ticker, ttlDefault, func() (*models.TechnicalMetrics, error) {
		return p.underlying.GetTechnicalMetrics(ctx, ticker)
	})
}

func (p *CachedFundamentalsProvider) GetShortInterest(ctx context.Context, ticker string) (*models.ShortInterest, error) {
	return cached(p, cacheShortInterest, ticker, ttlDefault, func() (*models.ShortInterest, error) {
		return p.underlying.GetShortInterest(ctx, ticker)
	})
}

func (p *CachedFundamentalsProvider) GetAnalystEstimates(ctx context.Context, ticker string) (*models.AnalystEstimates, error) {
	return cached(p, cacheAnalystEstimates, ticker, ttlDefault, func() (*models.AnalystEstimates, error) {
		return p.underlying.GetAnalystEstimates(ctx, ticker)
	})
}

func (p *CachedFundamentalsProvider) GetStockPeers(ctx context.Context, ticker string) ([]string, error) {
	return cachedSlice(p, cacheStockPeers, ticker, ttlDefault, func() ([]string, error) {
		return p.underlying.GetStockPeers(ctx, ticker)
	})
}

func (p *CachedFundamentalsProvider) GetSectorPE(ctx context.Context, sector, exchange string) (*models.SectorPE, error) {
	return cached(p, cacheSectorPE, fmt.Sprintf("%s:%s", sector, exchange), ttlDefault, func() (*models.SectorPE, error) {
		return p.underlying.GetSectorPE(ctx, sector, exchange)
	})
}

func (p *CachedFundamentalsProvider) GetIndustryPE(ctx context.Context, industry, exchange string) (*models.IndustryPE, error) {
	return cached(p, cacheIndustryPE, fmt.Sprintf("%s:%s", industry, exchange), ttlDefault, func() (*models.IndustryPE, error) {
		return p.underlying.GetIndustryPE(ctx, industry, exchange)
	})
}

func (p *CachedFundamentalsProvider) IsETF(ctx context.Context, ticker string) (bool, error) {
	if p.cache != nil {
		entry, err := p.cache.GetProviderCache(cacheIsETF, ticker)
		if err != nil {
			slog.Warn("cache get failed", "type", cacheIsETF, "key", ticker, "error", err)
		} else if entry != nil && time.Now().Before(entry.ExpiresAt) {
			var result bool
			if err := json.Unmarshal(entry.Data, &result); err != nil {
				slog.Warn("cache unmarshal failed", "type", cacheIsETF, "key", ticker, "error", err)
			} else {
				return result, nil
			}
		}
	}

	result, err := p.underlying.IsETF(ctx, ticker)
	if err != nil {
		return false, err
	}
	if p.cache != nil {
		data, err := json.Marshal(result)
		if err != nil {
			slog.Warn("cache marshal failed", "type", cacheIsETF, "key", ticker, "error", err)
		} else {
			go func() {
				if err := p.cache.SetProviderCache(&db.ProviderCache{
					DataType: cacheIsETF, Key: ticker, Data: datatypes.JSON(data),
					Provider: p.provider, ExpiresAt: time.Now().Add(ttlDefault),
				}); err != nil {
					slog.Warn("cache set failed", "type", cacheIsETF, "key", ticker, "error", err)
				}
			}()
		}
	}
	return result, nil
}

func (p *CachedFundamentalsProvider) GetETFData(ctx context.Context, ticker string) (*models.ETFData, error) {
	return cached(p, cacheETFData, ticker, ttlDefault, func() (*models.ETFData, error) {
		return p.underlying.GetETFData(ctx, ticker)
	})
}

func (p *CachedFundamentalsProvider) GetCongressTrades(ctx context.Context, ticker string, days int) ([]models.CongressTrade, error) {
	return cachedSlice(p, cacheCongressTrades, fmt.Sprintf("%s:%d", ticker, days), ttlInsider, func() ([]models.CongressTrade, error) {
		return p.underlying.GetCongressTrades(ctx, ticker, days)
	})
}

func (p *CachedFundamentalsProvider) GetNews(ctx context.Context, ticker string, limit int) ([]models.NewsArticle, error) {
	return cachedSlice(p, cacheNews, fmt.Sprintf("%s:%d", ticker, limit), ttlInsider, func() ([]models.NewsArticle, error) {
		return p.underlying.GetNews(ctx, ticker, limit)
	})
}
