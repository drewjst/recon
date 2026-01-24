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
	CacheTypeCompany             = "company"
	CacheTypeFinancials          = "financials"
	CacheTypeRatios              = "ratios"
	CacheTypeQuarterlyRatios     = "quarterly_ratios"
	CacheTypeInstitutionalHolder = "institutional_holders"
	CacheTypeInstitutionalSum    = "institutional_summary"
	CacheTypeInsiderTrades       = "insider_trades"
	CacheTypeDCF                 = "dcf"
	CacheTypeIndustryAverages    = "industry_averages"
	CacheTypeTechnicalMetrics    = "technical_metrics"
	CacheTypeShortInterest       = "short_interest"
	CacheTypeAnalystEstimates    = "analyst_estimates"
	CacheTypeStockPeers          = "stock_peers"
	CacheTypeSectorPE            = "sector_pe"
	CacheTypeIndustryPE          = "industry_pe"
	CacheTypeETFData             = "etf_data"
	CacheTypeIsETF               = "is_etf"
)

// Default cache TTLs for different data types.
const (
	DefaultCacheTTL       = 24 * time.Hour
	QuoteCacheTTL         = 5 * time.Minute
	PeersCacheTTL         = 24 * time.Hour
	SectorPECacheTTL      = 24 * time.Hour
	InsiderTradesCacheTTL = 12 * time.Hour
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
	provider   string // Provider name for cache entries
}

// NewCachedFundamentalsProvider creates a new cached provider wrapper.
func NewCachedFundamentalsProvider(underlying FundamentalsProvider, cache CacheRepository, providerName string) *CachedFundamentalsProvider {
	return &CachedFundamentalsProvider{
		underlying: underlying,
		cache:      cache,
		provider:   providerName,
	}
}

// getFromCache retrieves data from cache and unmarshals it.
func (p *CachedFundamentalsProvider) getFromCache(dataType, key string, dest interface{}) (bool, error) {
	if p.cache == nil {
		return false, nil
	}

	cached, err := p.cache.GetProviderCache(dataType, key)
	if err != nil {
		slog.Warn("cache read error", "type", dataType, "key", key, "error", err)
		return false, nil // Don't fail on cache errors, just miss
	}
	if cached == nil {
		return false, nil
	}

	if err := json.Unmarshal(cached.Data, dest); err != nil {
		slog.Warn("cache unmarshal error", "type", dataType, "key", key, "error", err)
		return false, nil
	}

	slog.Debug("cache hit", "type", dataType, "key", key)
	return true, nil
}

// setInCache marshals and stores data in cache.
func (p *CachedFundamentalsProvider) setInCache(dataType, key string, data interface{}, ttl time.Duration) {
	if p.cache == nil {
		return
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		slog.Warn("cache marshal error", "type", dataType, "key", key, "error", err)
		return
	}

	cache := &db.ProviderCache{
		DataType:  dataType,
		Key:       key,
		Data:      datatypes.JSON(jsonData),
		Provider:  p.provider,
		ExpiresAt: time.Now().Add(ttl),
	}

	if err := p.cache.SetProviderCache(cache); err != nil {
		slog.Warn("cache write error", "type", dataType, "key", key, "error", err)
	} else {
		slog.Debug("cache set", "type", dataType, "key", key, "ttl", ttl)
	}
}

// GetCompany retrieves company data with caching.
func (p *CachedFundamentalsProvider) GetCompany(ctx context.Context, ticker string) (*models.Company, error) {
	var cached models.Company
	if hit, _ := p.getFromCache(CacheTypeCompany, ticker, &cached); hit {
		return &cached, nil
	}

	result, err := p.underlying.GetCompany(ctx, ticker)
	if err != nil {
		return nil, err
	}
	if result != nil {
		p.setInCache(CacheTypeCompany, ticker, result, DefaultCacheTTL)
	}
	return result, nil
}

// GetFinancials retrieves financial statements with caching.
func (p *CachedFundamentalsProvider) GetFinancials(ctx context.Context, ticker string, periods int) ([]models.Financials, error) {
	cacheKey := fmt.Sprintf("%s:%d", ticker, periods)
	var cached []models.Financials
	if hit, _ := p.getFromCache(CacheTypeFinancials, cacheKey, &cached); hit {
		return cached, nil
	}

	result, err := p.underlying.GetFinancials(ctx, ticker, periods)
	if err != nil {
		return nil, err
	}
	if len(result) > 0 {
		p.setInCache(CacheTypeFinancials, cacheKey, result, DefaultCacheTTL)
	}
	return result, nil
}

// GetRatios retrieves valuation ratios with caching.
func (p *CachedFundamentalsProvider) GetRatios(ctx context.Context, ticker string) (*models.Ratios, error) {
	var cached models.Ratios
	if hit, _ := p.getFromCache(CacheTypeRatios, ticker, &cached); hit {
		return &cached, nil
	}

	result, err := p.underlying.GetRatios(ctx, ticker)
	if err != nil {
		return nil, err
	}
	if result != nil {
		p.setInCache(CacheTypeRatios, ticker, result, DefaultCacheTTL)
	}
	return result, nil
}

// GetQuarterlyRatios retrieves historical quarterly ratios with caching.
func (p *CachedFundamentalsProvider) GetQuarterlyRatios(ctx context.Context, ticker string, quarters int) ([]models.QuarterlyRatio, error) {
	cacheKey := fmt.Sprintf("%s:%d", ticker, quarters)
	var cached []models.QuarterlyRatio
	if hit, _ := p.getFromCache(CacheTypeQuarterlyRatios, cacheKey, &cached); hit {
		return cached, nil
	}

	result, err := p.underlying.GetQuarterlyRatios(ctx, ticker, quarters)
	if err != nil {
		return nil, err
	}
	if len(result) > 0 {
		p.setInCache(CacheTypeQuarterlyRatios, cacheKey, result, DefaultCacheTTL)
	}
	return result, nil
}

// GetInstitutionalHolders retrieves institutional holders with caching.
func (p *CachedFundamentalsProvider) GetInstitutionalHolders(ctx context.Context, ticker string) ([]models.InstitutionalHolder, error) {
	var cached []models.InstitutionalHolder
	if hit, _ := p.getFromCache(CacheTypeInstitutionalHolder, ticker, &cached); hit {
		return cached, nil
	}

	result, err := p.underlying.GetInstitutionalHolders(ctx, ticker)
	if err != nil {
		return nil, err
	}
	if len(result) > 0 {
		p.setInCache(CacheTypeInstitutionalHolder, ticker, result, DefaultCacheTTL)
	}
	return result, nil
}

// GetInstitutionalSummary retrieves institutional ownership summary with caching.
func (p *CachedFundamentalsProvider) GetInstitutionalSummary(ctx context.Context, ticker string) (*models.InstitutionalSummary, error) {
	var cached models.InstitutionalSummary
	if hit, _ := p.getFromCache(CacheTypeInstitutionalSum, ticker, &cached); hit {
		return &cached, nil
	}

	result, err := p.underlying.GetInstitutionalSummary(ctx, ticker)
	if err != nil {
		return nil, err
	}
	if result != nil {
		p.setInCache(CacheTypeInstitutionalSum, ticker, result, DefaultCacheTTL)
	}
	return result, nil
}

// GetInsiderTrades retrieves insider trades with caching.
func (p *CachedFundamentalsProvider) GetInsiderTrades(ctx context.Context, ticker string, days int) ([]models.InsiderTrade, error) {
	cacheKey := fmt.Sprintf("%s:%d", ticker, days)
	var cached []models.InsiderTrade
	if hit, _ := p.getFromCache(CacheTypeInsiderTrades, cacheKey, &cached); hit {
		return cached, nil
	}

	result, err := p.underlying.GetInsiderTrades(ctx, ticker, days)
	if err != nil {
		return nil, err
	}
	if len(result) > 0 {
		p.setInCache(CacheTypeInsiderTrades, cacheKey, result, InsiderTradesCacheTTL)
	}
	return result, nil
}

// GetDCF retrieves DCF valuation with caching.
func (p *CachedFundamentalsProvider) GetDCF(ctx context.Context, ticker string) (*models.DCF, error) {
	var cached models.DCF
	if hit, _ := p.getFromCache(CacheTypeDCF, ticker, &cached); hit {
		return &cached, nil
	}

	result, err := p.underlying.GetDCF(ctx, ticker)
	if err != nil {
		return nil, err
	}
	if result != nil {
		p.setInCache(CacheTypeDCF, ticker, result, DefaultCacheTTL)
	}
	return result, nil
}

// GetIndustryAverages retrieves industry averages with caching.
func (p *CachedFundamentalsProvider) GetIndustryAverages(ctx context.Context, industry string) (*models.IndustryAverages, error) {
	var cached models.IndustryAverages
	if hit, _ := p.getFromCache(CacheTypeIndustryAverages, industry, &cached); hit {
		return &cached, nil
	}

	result, err := p.underlying.GetIndustryAverages(ctx, industry)
	if err != nil {
		return nil, err
	}
	if result != nil {
		p.setInCache(CacheTypeIndustryAverages, industry, result, DefaultCacheTTL)
	}
	return result, nil
}

// GetTechnicalMetrics retrieves technical metrics with caching.
func (p *CachedFundamentalsProvider) GetTechnicalMetrics(ctx context.Context, ticker string) (*models.TechnicalMetrics, error) {
	var cached models.TechnicalMetrics
	if hit, _ := p.getFromCache(CacheTypeTechnicalMetrics, ticker, &cached); hit {
		return &cached, nil
	}

	result, err := p.underlying.GetTechnicalMetrics(ctx, ticker)
	if err != nil {
		return nil, err
	}
	if result != nil {
		p.setInCache(CacheTypeTechnicalMetrics, ticker, result, DefaultCacheTTL)
	}
	return result, nil
}

// GetShortInterest retrieves short interest data with caching.
func (p *CachedFundamentalsProvider) GetShortInterest(ctx context.Context, ticker string) (*models.ShortInterest, error) {
	var cached models.ShortInterest
	if hit, _ := p.getFromCache(CacheTypeShortInterest, ticker, &cached); hit {
		return &cached, nil
	}

	result, err := p.underlying.GetShortInterest(ctx, ticker)
	if err != nil {
		return nil, err
	}
	if result != nil {
		p.setInCache(CacheTypeShortInterest, ticker, result, DefaultCacheTTL)
	}
	return result, nil
}

// GetAnalystEstimates retrieves analyst estimates with caching.
func (p *CachedFundamentalsProvider) GetAnalystEstimates(ctx context.Context, ticker string) (*models.AnalystEstimates, error) {
	var cached models.AnalystEstimates
	if hit, _ := p.getFromCache(CacheTypeAnalystEstimates, ticker, &cached); hit {
		return &cached, nil
	}

	result, err := p.underlying.GetAnalystEstimates(ctx, ticker)
	if err != nil {
		return nil, err
	}
	if result != nil {
		p.setInCache(CacheTypeAnalystEstimates, ticker, result, DefaultCacheTTL)
	}
	return result, nil
}

// GetStockPeers retrieves stock peers with caching.
func (p *CachedFundamentalsProvider) GetStockPeers(ctx context.Context, ticker string) ([]string, error) {
	var cached []string
	if hit, _ := p.getFromCache(CacheTypeStockPeers, ticker, &cached); hit {
		return cached, nil
	}

	result, err := p.underlying.GetStockPeers(ctx, ticker)
	if err != nil {
		return nil, err
	}
	if len(result) > 0 {
		p.setInCache(CacheTypeStockPeers, ticker, result, PeersCacheTTL)
	}
	return result, nil
}

// GetSectorPE retrieves sector P/E with caching.
func (p *CachedFundamentalsProvider) GetSectorPE(ctx context.Context, sector string, exchange string) (*models.SectorPE, error) {
	cacheKey := fmt.Sprintf("%s:%s", sector, exchange)
	var cached models.SectorPE
	if hit, _ := p.getFromCache(CacheTypeSectorPE, cacheKey, &cached); hit {
		return &cached, nil
	}

	result, err := p.underlying.GetSectorPE(ctx, sector, exchange)
	if err != nil {
		return nil, err
	}
	if result != nil {
		p.setInCache(CacheTypeSectorPE, cacheKey, result, SectorPECacheTTL)
	}
	return result, nil
}

// GetIndustryPE retrieves industry P/E with caching.
func (p *CachedFundamentalsProvider) GetIndustryPE(ctx context.Context, industry string, exchange string) (*models.IndustryPE, error) {
	cacheKey := fmt.Sprintf("%s:%s", industry, exchange)
	var cached models.IndustryPE
	if hit, _ := p.getFromCache(CacheTypeIndustryPE, cacheKey, &cached); hit {
		return &cached, nil
	}

	result, err := p.underlying.GetIndustryPE(ctx, industry, exchange)
	if err != nil {
		return nil, err
	}
	if result != nil {
		p.setInCache(CacheTypeIndustryPE, cacheKey, result, SectorPECacheTTL)
	}
	return result, nil
}

// IsETF checks if a ticker is an ETF with caching.
func (p *CachedFundamentalsProvider) IsETF(ctx context.Context, ticker string) (bool, error) {
	var cached bool
	if hit, _ := p.getFromCache(CacheTypeIsETF, ticker, &cached); hit {
		return cached, nil
	}

	result, err := p.underlying.IsETF(ctx, ticker)
	if err != nil {
		return false, err
	}
	p.setInCache(CacheTypeIsETF, ticker, result, DefaultCacheTTL)
	return result, nil
}

// GetETFData retrieves ETF data with caching.
func (p *CachedFundamentalsProvider) GetETFData(ctx context.Context, ticker string) (*models.ETFData, error) {
	var cached models.ETFData
	if hit, _ := p.getFromCache(CacheTypeETFData, ticker, &cached); hit {
		return &cached, nil
	}

	result, err := p.underlying.GetETFData(ctx, ticker)
	if err != nil {
		return nil, err
	}
	if result != nil {
		p.setInCache(CacheTypeETFData, ticker, result, DefaultCacheTTL)
	}
	return result, nil
}
