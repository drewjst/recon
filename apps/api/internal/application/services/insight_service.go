package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/drewjst/crux/apps/api/internal/domain/models"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/ai"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers"
)

// InsightCache defines the interface for caching insights.
type InsightCache interface {
	GetInsight(key string) (*models.InsightResponse, error)
	SetInsight(key string, resp *models.InsightResponse, ttl time.Duration) error
}

// InsightService generates AI-powered insights for stocks.
type InsightService struct {
	cruxAI       *ai.CruxClient
	fundamentals providers.FundamentalsProvider
	quotes       providers.QuoteProvider
	cache        InsightCache
	enabled      bool
}

// NewInsightService creates a new insight service.
func NewInsightService(
	cruxAI *ai.CruxClient,
	fundamentals providers.FundamentalsProvider,
	quotes providers.QuoteProvider,
	cache InsightCache,
	enabled bool,
) *InsightService {
	return &InsightService{
		cruxAI:       cruxAI,
		fundamentals: fundamentals,
		quotes:       quotes,
		cache:        cache,
		enabled:      enabled,
	}
}

// GetInsight retrieves or generates an insight for the given request.
func (s *InsightService) GetInsight(ctx context.Context, req models.InsightRequest) (*models.InsightResponse, error) {
	if !s.enabled {
		return nil, fmt.Errorf("CruxAI insights are not enabled")
	}

	if !req.Section.IsValid() {
		return nil, fmt.Errorf("invalid insight section: %s", req.Section)
	}

	// Check cache
	cacheKey := req.CacheKey()
	if s.cache != nil {
		cached, err := s.cache.GetInsight(cacheKey)
		if err != nil {
			slog.Warn("failed to check insight cache", "key", cacheKey, "error", err)
		} else if cached != nil && time.Now().Before(cached.ExpiresAt) {
			cached.Cached = true
			return cached, nil
		}
	}

	// Route to appropriate generator
	var resp *models.InsightResponse
	var err error

	switch req.Section {
	case models.InsightSectionValuationSummary:
		resp, err = s.generateValuationSummary(ctx, req.Ticker)
	default:
		return nil, fmt.Errorf("no generator for section: %s", req.Section)
	}

	if err != nil {
		return nil, err
	}

	// Cache the result
	if s.cache != nil {
		if cacheErr := s.cache.SetInsight(cacheKey, resp, req.Section.CacheTTL()); cacheErr != nil {
			slog.Warn("failed to cache insight", "key", cacheKey, "error", cacheErr)
		}
	}

	return resp, nil
}

// valuationData holds all data needed for valuation summary generation.
type valuationData struct {
	company    *models.Company
	quote      *models.Quote
	ratios     *models.Ratios
	estimates  *models.AnalystEstimates
	historical []models.QuarterlyRatio
	sectorPE   *models.SectorPE
}

func (s *InsightService) generateValuationSummary(ctx context.Context, ticker string) (*models.InsightResponse, error) {
	data, err := s.fetchValuationData(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching valuation data: %w", err)
	}

	promptData := s.buildValuationPromptData(data)

	prompt, err := ai.BuildPrompt(models.InsightSectionValuationSummary, promptData)
	if err != nil {
		return nil, fmt.Errorf("building prompt: %w", err)
	}

	insight, err := s.cruxAI.GenerateInsight(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("generating insight: %w", err)
	}

	now := time.Now()
	return &models.InsightResponse{
		Ticker:      ticker,
		Section:     models.InsightSectionValuationSummary,
		Insight:     insight,
		GeneratedAt: now,
		ExpiresAt:   now.Add(models.InsightSectionValuationSummary.CacheTTL()),
		Cached:      false,
	}, nil
}

func (s *InsightService) fetchValuationData(ctx context.Context, ticker string) (*valuationData, error) {
	data := &valuationData{}
	g, gctx := errgroup.WithContext(ctx)

	// Fetch company profile
	g.Go(func() error {
		company, err := s.fundamentals.GetCompany(gctx, ticker)
		if err != nil {
			return fmt.Errorf("fetching company: %w", err)
		}
		data.company = company
		return nil
	})

	// Fetch current quote
	g.Go(func() error {
		quote, err := s.quotes.GetQuote(gctx, ticker)
		if err != nil {
			return fmt.Errorf("fetching quote: %w", err)
		}
		data.quote = quote
		return nil
	})

	// Fetch TTM ratios
	g.Go(func() error {
		ratios, err := s.fundamentals.GetRatios(gctx, ticker)
		if err != nil {
			return fmt.Errorf("fetching ratios: %w", err)
		}
		data.ratios = ratios
		return nil
	})

	// Fetch analyst estimates
	g.Go(func() error {
		estimates, err := s.fundamentals.GetAnalystEstimates(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch analyst estimates", "ticker", ticker, "error", err)
			// Non-fatal: estimates are optional
		}
		data.estimates = estimates
		return nil
	})

	// Fetch historical ratios (20 quarters = 5 years)
	g.Go(func() error {
		historical, err := s.fundamentals.GetQuarterlyRatios(gctx, ticker, 20)
		if err != nil {
			slog.Warn("failed to fetch historical ratios", "ticker", ticker, "error", err)
			// Non-fatal: historical data is optional
		}
		data.historical = historical
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	// Fetch sector P/E (depends on company data)
	if data.company != nil && data.company.Sector != "" {
		sectorPE, err := s.fundamentals.GetSectorPE(ctx, data.company.Sector, data.company.Exchange)
		if err != nil {
			slog.Warn("failed to fetch sector PE", "sector", data.company.Sector, "error", err)
		}
		data.sectorPE = sectorPE
	}

	return data, nil
}

func (s *InsightService) buildValuationPromptData(data *valuationData) ai.PromptData {
	pd := ai.PromptData{}

	// Common fields
	if data.company != nil {
		pd.Ticker = data.company.Ticker
		pd.CompanyName = data.company.Name
		pd.Sector = data.company.Sector
	}

	if data.quote != nil {
		pd.Price = data.quote.Price
	}

	// Valuation ratios
	if data.ratios != nil {
		pd.PE = data.ratios.PE
		pd.ForwardPE = data.ratios.ForwardPE
		pd.EVToEBITDA = data.ratios.EVToEBITDA
		pd.PS = data.ratios.PS
		pd.PFCF = data.ratios.PriceToFCF
		pd.PEG = data.ratios.PEG
	}

	// Analyst estimates
	if data.estimates != nil {
		pd.TargetPrice = data.estimates.PriceTargetAverage
		pd.EPSGrowth = data.estimates.EPSGrowthNextY

		// Calculate upside/downside
		if data.quote != nil && data.estimates.PriceTargetAverage > 0 {
			pd.Upside, pd.UpsideDirection = calculateUpside(data.quote.Price, data.estimates.PriceTargetAverage)
		}
	}

	// Historical averages
	if len(data.historical) > 0 {
		pd.AvgPE = calculate5YAvgPE(data.historical)

		if data.ratios != nil {
			pd.PEPercentile = calculatePercentile(data.ratios.PE, data.historical)
		}
	}

	// Sector P/E
	if data.sectorPE != nil {
		pd.SectorPE = data.sectorPE.PE
	}

	// Recalculate PEG if we have better data
	if pd.PE > 0 && pd.EPSGrowth > 0 && pd.PEG == 0 {
		pd.PEG = calculatePEG(pd.PE, pd.EPSGrowth)
	}

	return pd
}

// calculatePEG computes the PEG ratio.
func calculatePEG(pe, epsGrowth float64) float64 {
	if epsGrowth == 0 {
		return 0
	}
	return pe / epsGrowth
}

// calculatePercentile returns the percentile of current PE vs historical values.
func calculatePercentile(current float64, historical []models.QuarterlyRatio) int {
	if len(historical) == 0 || current <= 0 {
		return 0
	}

	// Extract valid PE values
	var peValues []float64
	for _, h := range historical {
		if h.PE > 0 {
			peValues = append(peValues, h.PE)
		}
	}

	if len(peValues) == 0 {
		return 0
	}

	// Count how many historical values are below current
	belowCount := 0
	for _, pe := range peValues {
		if pe < current {
			belowCount++
		}
	}

	return int(math.Round(float64(belowCount) / float64(len(peValues)) * 100))
}

// calculateUpside returns the percentage upside/downside and direction.
func calculateUpside(price, target float64) (float64, string) {
	if price <= 0 {
		return 0, "upside"
	}

	pctChange := ((target - price) / price) * 100
	if pctChange >= 0 {
		return pctChange, "upside"
	}
	return -pctChange, "downside"
}

// calculate5YAvgPE returns the average P/E over the historical period.
func calculate5YAvgPE(historical []models.QuarterlyRatio) float64 {
	var sum float64
	var count int

	for _, h := range historical {
		if h.PE > 0 {
			sum += h.PE
			count++
		}
	}

	if count == 0 {
		return 0
	}
	return sum / float64(count)
}

// InsightCacheAdapter adapts the db.Repository for insight caching.
type InsightCacheAdapter struct {
	getFunc func(dataType, key string) ([]byte, error)
	setFunc func(dataType, key string, data []byte, expiresAt time.Time) error
}

// NewInsightCacheAdapter creates a cache adapter from get/set functions.
func NewInsightCacheAdapter(
	getFunc func(dataType, key string) ([]byte, error),
	setFunc func(dataType, key string, data []byte, expiresAt time.Time) error,
) *InsightCacheAdapter {
	return &InsightCacheAdapter{
		getFunc: getFunc,
		setFunc: setFunc,
	}
}

func (a *InsightCacheAdapter) GetInsight(key string) (*models.InsightResponse, error) {
	data, err := a.getFunc("insight", key)
	if err != nil || data == nil {
		return nil, err
	}

	var resp models.InsightResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("unmarshaling cached insight: %w", err)
	}

	return &resp, nil
}

func (a *InsightCacheAdapter) SetInsight(key string, resp *models.InsightResponse, ttl time.Duration) error {
	data, err := json.Marshal(resp)
	if err != nil {
		return fmt.Errorf("marshaling insight: %w", err)
	}

	return a.setFunc("insight", key, data, time.Now().Add(ttl))
}

// Ensure compile-time interface compliance
var _ InsightCache = (*InsightCacheAdapter)(nil)
