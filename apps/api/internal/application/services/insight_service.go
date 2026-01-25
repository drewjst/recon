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
	case models.InsightSectionPositionSummary:
		resp, err = s.generatePositionSummary(ctx, req.Ticker)
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
	industryPE *models.IndustryPE
	dcf        *models.DCF
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
		}
		data.estimates = estimates
		return nil
	})

	// Fetch historical ratios (20 quarters = 5 years)
	g.Go(func() error {
		historical, err := s.fundamentals.GetQuarterlyRatios(gctx, ticker, 20)
		if err != nil {
			slog.Warn("failed to fetch historical ratios", "ticker", ticker, "error", err)
		}
		data.historical = historical
		return nil
	})

	// Fetch DCF valuation
	g.Go(func() error {
		dcf, err := s.fundamentals.GetDCF(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch DCF", "ticker", ticker, "error", err)
		}
		data.dcf = dcf
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	// Fetch sector and industry P/E (depends on company data)
	if data.company != nil {
		g2, gctx2 := errgroup.WithContext(ctx)

		if data.company.Sector != "" {
			g2.Go(func() error {
				sectorPE, err := s.fundamentals.GetSectorPE(gctx2, data.company.Sector, data.company.Exchange)
				if err != nil {
					slog.Warn("failed to fetch sector PE", "sector", data.company.Sector, "error", err)
				}
				data.sectorPE = sectorPE
				return nil
			})
		}

		if data.company.Industry != "" {
			g2.Go(func() error {
				industryPE, err := s.fundamentals.GetIndustryPE(gctx2, data.company.Industry, data.company.Exchange)
				if err != nil {
					slog.Warn("failed to fetch industry PE", "industry", data.company.Industry, "error", err)
				}
				data.industryPE = industryPE
				return nil
			})
		}

		_ = g2.Wait() // Ignore errors, these are optional
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
		pd.Industry = data.company.Industry
	}

	if data.quote != nil {
		pd.Price = data.quote.Price
		pd.MarketCap = formatMarketCap(data.quote.MarketCap)
	}

	// Valuation ratios and profitability
	if data.ratios != nil {
		pd.PE = data.ratios.PE
		pd.ForwardPE = data.ratios.ForwardPE
		pd.EVToEBITDA = data.ratios.EVToEBITDA
		pd.PS = data.ratios.PS
		pd.PFCF = data.ratios.PriceToFCF
		pd.PB = data.ratios.PB
		pd.PEG = data.ratios.PEG

		// Profitability
		pd.GrossMargin = data.ratios.GrossMargin * 100
		pd.OperatingMargin = data.ratios.OperatingMargin * 100
		pd.NetMargin = data.ratios.NetMargin * 100
		pd.ROE = data.ratios.ROE * 100
		pd.ROIC = data.ratios.ROIC * 100
		pd.FCFMargin = data.ratios.FCFMargin * 100
		pd.RevenueGrowth = data.ratios.RevenueGrowthYoY * 100

		// Risk
		pd.DebtToEquity = data.ratios.DebtToEquity
		pd.CurrentRatio = data.ratios.CurrentRatio
	}

	// Analyst estimates
	if data.estimates != nil {
		pd.TargetPrice = data.estimates.PriceTargetAverage
		pd.EPSGrowth = data.estimates.EPSGrowthNextY
		pd.AnalystRating = data.estimates.Rating
		pd.AnalystCount = data.estimates.AnalystCount

		// Calculate upside/downside
		if data.quote != nil && data.estimates.PriceTargetAverage > 0 {
			pd.Upside, pd.UpsideDirection = calculateUpside(data.quote.Price, data.estimates.PriceTargetAverage)
		}
	}

	// DCF valuation
	if data.dcf != nil && data.dcf.DCFValue > 0 {
		pd.DCFValue = data.dcf.DCFValue
		if data.quote != nil && data.quote.Price > 0 {
			pd.DCFUpside, pd.DCFDirection = calculateDCFUpside(data.quote.Price, data.dcf.DCFValue)
		}
	}

	// Historical averages
	if len(data.historical) > 0 {
		pd.AvgPE = calculate5YAvgPE(data.historical)

		if data.ratios != nil {
			pd.PEPercentile = calculatePercentile(data.ratios.PE, data.historical)
		}
	}

	// Sector and Industry P/E
	if data.sectorPE != nil {
		pd.SectorPE = data.sectorPE.PE
	}
	if data.industryPE != nil {
		pd.IndustryPE = data.industryPE.PE
	}

	// Recalculate PEG if we have better data
	if pd.PE > 0 && pd.EPSGrowth > 0 && pd.PEG == 0 {
		pd.PEG = calculatePEG(pd.PE, pd.EPSGrowth)
	}

	return pd
}

// positionData holds all data needed for position summary generation.
type positionData struct {
	company    *models.Company
	quote      *models.Quote
	ratios     *models.Ratios
	estimates  *models.AnalystEstimates
	dcf        *models.DCF
	prices     []models.PriceBar
	financials []models.Financials
}

func (s *InsightService) generatePositionSummary(ctx context.Context, ticker string) (*models.InsightResponse, error) {
	data, err := s.fetchPositionData(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching position data: %w", err)
	}

	promptData := s.buildPositionPromptData(data)

	prompt, err := ai.BuildPrompt(models.InsightSectionPositionSummary, promptData)
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
		Section:     models.InsightSectionPositionSummary,
		Insight:     insight,
		GeneratedAt: now,
		ExpiresAt:   now.Add(models.InsightSectionPositionSummary.CacheTTL()),
		Cached:      false,
	}, nil
}

func (s *InsightService) fetchPositionData(ctx context.Context, ticker string) (*positionData, error) {
	data := &positionData{}
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
			slog.Warn("failed to fetch ratios", "ticker", ticker, "error", err)
		}
		data.ratios = ratios
		return nil
	})

	// Fetch analyst estimates
	g.Go(func() error {
		estimates, err := s.fundamentals.GetAnalystEstimates(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch analyst estimates", "ticker", ticker, "error", err)
		}
		data.estimates = estimates
		return nil
	})

	// Fetch DCF valuation
	g.Go(func() error {
		dcf, err := s.fundamentals.GetDCF(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch DCF", "ticker", ticker, "error", err)
		}
		data.dcf = dcf
		return nil
	})

	// Fetch historical prices (for YTD, 52-week calculations)
	g.Go(func() error {
		prices, err := s.quotes.GetHistoricalPrices(gctx, ticker, 365)
		if err != nil {
			slog.Warn("failed to fetch historical prices", "ticker", ticker, "error", err)
		}
		data.prices = prices
		return nil
	})

	// Fetch financials for score calculations
	g.Go(func() error {
		financials, err := s.fundamentals.GetFinancials(gctx, ticker, 2)
		if err != nil {
			slog.Warn("failed to fetch financials", "ticker", ticker, "error", err)
		}
		data.financials = financials
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return data, nil
}

func (s *InsightService) buildPositionPromptData(data *positionData) ai.PromptData {
	pd := ai.PromptData{}

	// Common fields
	if data.company != nil {
		pd.Ticker = data.company.Ticker
		pd.CompanyName = data.company.Name
		pd.Sector = data.company.Sector
		pd.Industry = data.company.Industry
	}

	if data.quote != nil {
		pd.Price = data.quote.Price
		pd.MarketCap = formatMarketCap(data.quote.MarketCap)
		pd.Week52High = data.quote.High
		pd.Week52Low = data.quote.Low

		// Calculate 52-week percentages
		if data.quote.High > 0 {
			pd.PctFrom52High = ((data.quote.High - data.quote.Price) / data.quote.High) * 100
		}
		if data.quote.Low > 0 && data.quote.Price > data.quote.Low {
			pd.PctFrom52Low = ((data.quote.Price - data.quote.Low) / data.quote.Low) * 100
		}
	}

	// Calculate YTD return from historical prices
	if len(data.prices) > 0 && data.quote != nil {
		pd.YTDReturn = calculateYTDReturn(data.prices, data.quote.Price)
	}

	// Calculate scores from financials
	if len(data.financials) > 0 {
		piotroski, ruleOf40, altmanZ := calculateScoresFromFinancials(data.financials, data.quote)
		pd.PiotroskiScore = piotroski.Score
		pd.RuleOf40Score = ruleOf40.Score
		pd.RuleOf40Passed = ruleOf40.Passed
		pd.AltmanZScore = altmanZ.Score
		pd.AltmanZZone = altmanZ.Zone
	}

	// Valuation ratios and profitability
	if data.ratios != nil {
		pd.PE = data.ratios.PE
		pd.ForwardPE = data.ratios.ForwardPE
		pd.EVToEBITDA = data.ratios.EVToEBITDA
		pd.PFCF = data.ratios.PriceToFCF

		// Profitability
		pd.GrossMargin = data.ratios.GrossMargin * 100
		pd.OperatingMargin = data.ratios.OperatingMargin * 100
		pd.NetMargin = data.ratios.NetMargin * 100
		pd.ROE = data.ratios.ROE * 100
		pd.ROIC = data.ratios.ROIC * 100
		pd.RevenueGrowth = data.ratios.RevenueGrowthYoY * 100

		// Financial health
		pd.DebtToEquity = data.ratios.DebtToEquity
		pd.CurrentRatio = data.ratios.CurrentRatio
	}

	// DCF valuation
	if data.dcf != nil && data.dcf.DCFValue > 0 {
		pd.DCFValue = data.dcf.DCFValue
		if data.quote != nil && data.quote.Price > 0 {
			pd.DCFUpside, pd.DCFDirection = calculateDCFUpside(data.quote.Price, data.dcf.DCFValue)
		}
	}

	// Analyst estimates
	if data.estimates != nil {
		pd.TargetPrice = data.estimates.PriceTargetAverage
		pd.EPSGrowth = data.estimates.EPSGrowthNextY
		pd.AnalystRating = data.estimates.Rating
		pd.AnalystCount = data.estimates.AnalystCount

		// Calculate upside/downside
		if data.quote != nil && data.estimates.PriceTargetAverage > 0 {
			pd.Upside, pd.UpsideDirection = calculateUpside(data.quote.Price, data.estimates.PriceTargetAverage)
		}
	}

	return pd
}

// calculateYTDReturn calculates year-to-date return from historical prices.
func calculateYTDReturn(prices []models.PriceBar, currentPrice float64) float64 {
	if len(prices) == 0 || currentPrice <= 0 {
		return 0
	}

	currentYear := time.Now().Year()
	for i := len(prices) - 1; i >= 0; i-- {
		if prices[i].Date.Year() == currentYear && prices[i].Close > 0 {
			return ((currentPrice - prices[i].Close) / prices[i].Close) * 100
		}
	}
	return 0
}

// ScoreResults holds calculated score results for reuse.
type ScoreResults struct {
	Piotroski PiotroskiResult
	RuleOf40  RuleOf40Result
	AltmanZ   AltmanZResult
}

// PiotroskiResult simplified for internal use.
type PiotroskiResult struct {
	Score int
}

// RuleOf40Result simplified for internal use.
type RuleOf40Result struct {
	Score  float64
	Passed bool
}

// AltmanZResult simplified for internal use.
type AltmanZResult struct {
	Score float64
	Zone  string
}

// calculateScoresFromFinancials calculates Piotroski, Rule of 40, and Altman Z scores.
func calculateScoresFromFinancials(financials []models.Financials, quote *models.Quote) (PiotroskiResult, RuleOf40Result, AltmanZResult) {
	piotroski := PiotroskiResult{}
	ruleOf40 := RuleOf40Result{}
	altmanZ := AltmanZResult{Zone: "unknown"}

	if len(financials) == 0 {
		return piotroski, ruleOf40, altmanZ
	}

	current := financials[0]
	var prior models.Financials
	if len(financials) > 1 {
		prior = financials[1]
	}

	// Piotroski F-Score (simplified calculation)
	score := 0

	// Profitability
	if current.NetIncome > 0 {
		score++ // Positive net income
	}
	if current.TotalAssets > 0 && float64(current.NetIncome)/float64(current.TotalAssets) > 0 {
		score++ // Positive ROA
	}
	if current.OperatingCashFlow > 0 {
		score++ // Positive operating cash flow
	}
	if current.OperatingCashFlow > current.NetIncome {
		score++ // Cash flow > net income (quality)
	}

	// Leverage & Liquidity (need prior year data)
	if prior.Debt > 0 && current.Debt < prior.Debt {
		score++ // Lower long-term debt
	}
	if prior.TotalAssets > 0 && prior.Debt > 0 && current.TotalAssets > 0 && current.Debt > 0 {
		priorCurrent := float64(prior.Cash) / float64(prior.Debt)
		currentCurrent := float64(current.Cash) / float64(current.Debt)
		if currentCurrent > priorCurrent {
			score++ // Higher current ratio
		}
	}
	// Shares outstanding check would need additional data

	// Operating Efficiency
	if prior.Revenue > 0 && prior.GrossProfit > 0 && current.Revenue > 0 && current.GrossProfit > 0 {
		priorGM := float64(prior.GrossProfit) / float64(prior.Revenue)
		currentGM := float64(current.GrossProfit) / float64(current.Revenue)
		if currentGM > priorGM {
			score++ // Higher gross margin
		}
	}
	if prior.Revenue > 0 && prior.TotalAssets > 0 && current.Revenue > 0 && current.TotalAssets > 0 {
		priorAT := float64(prior.Revenue) / float64(prior.TotalAssets)
		currentAT := float64(current.Revenue) / float64(current.TotalAssets)
		if currentAT > priorAT {
			score++ // Higher asset turnover
		}
	}

	piotroski.Score = score

	// Rule of 40
	revenueGrowth := 0.0
	if prior.Revenue > 0 {
		revenueGrowth = (float64(current.Revenue-prior.Revenue) / float64(prior.Revenue)) * 100
	}
	profitMargin := 0.0
	if current.Revenue > 0 {
		// Use FCF margin or operating margin
		if current.FreeCashFlow != 0 {
			profitMargin = (float64(current.FreeCashFlow) / float64(current.Revenue)) * 100
		} else if current.OperatingIncome != 0 {
			profitMargin = (float64(current.OperatingIncome) / float64(current.Revenue)) * 100
		}
	}
	ruleOf40.Score = revenueGrowth + profitMargin
	ruleOf40.Passed = ruleOf40.Score >= 40

	// Altman Z-Score
	if current.TotalAssets > 0 && current.TotalLiabilities > 0 {
		ta := float64(current.TotalAssets)
		tl := float64(current.TotalLiabilities)

		workingCapital := float64(current.Cash) - float64(current.Debt)
		// Simplified retained earnings estimate
		retainedEarnings := float64(current.TotalEquity) * 0.8

		x1 := workingCapital / ta
		x2 := retainedEarnings / ta
		x3 := float64(current.OperatingIncome) / ta

		marketCap := 0.0
		if quote != nil {
			marketCap = float64(quote.MarketCap)
		}
		x4 := marketCap / tl
		x5 := float64(current.Revenue) / ta

		altmanZ.Score = 1.2*x1 + 1.4*x2 + 3.3*x3 + 0.6*x4 + 1.0*x5

		if altmanZ.Score > 2.99 {
			altmanZ.Zone = "safe"
		} else if altmanZ.Score > 1.81 {
			altmanZ.Zone = "gray"
		} else {
			altmanZ.Zone = "distress"
		}
	}

	return piotroski, ruleOf40, altmanZ
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

	var peValues []float64
	for _, h := range historical {
		if h.PE > 0 {
			peValues = append(peValues, h.PE)
		}
	}

	if len(peValues) == 0 {
		return 0
	}

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

// calculateDCFUpside returns the percentage difference from DCF fair value.
func calculateDCFUpside(price, dcfValue float64) (float64, string) {
	if price <= 0 {
		return 0, "undervalued"
	}

	pctDiff := ((dcfValue - price) / price) * 100
	if pctDiff >= 0 {
		return pctDiff, "undervalued"
	}
	return -pctDiff, "overvalued"
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

// formatMarketCap formats market cap as human-readable string.
func formatMarketCap(marketCap int64) string {
	if marketCap <= 0 {
		return ""
	}

	mc := float64(marketCap)
	switch {
	case mc >= 1e12:
		return fmt.Sprintf("$%.1fT", mc/1e12)
	case mc >= 1e9:
		return fmt.Sprintf("$%.1fB", mc/1e9)
	case mc >= 1e6:
		return fmt.Sprintf("$%.0fM", mc/1e6)
	default:
		return fmt.Sprintf("$%.0f", mc)
	}
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
