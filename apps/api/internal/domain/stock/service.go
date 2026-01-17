package stock

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/drewjst/recon/apps/api/internal/domain/models"
	"github.com/drewjst/recon/apps/api/internal/domain/scores"
	"github.com/drewjst/recon/apps/api/internal/domain/signals"
	"github.com/drewjst/recon/apps/api/internal/infrastructure/db"
	"github.com/drewjst/recon/apps/api/internal/infrastructure/providers"
)

// ErrTickerNotFound is returned when a ticker doesn't exist.
var ErrTickerNotFound = errors.New("ticker not found")

// Repository defines the data access interface for stock data (legacy).
type Repository interface {
	GetCompany(ctx context.Context, ticker string) (*Company, error)
	GetQuote(ctx context.Context, ticker string) (*Quote, error)
	GetFinancials(ctx context.Context, ticker string) (*Financials, error)
	GetFinancialData(ctx context.Context, ticker string, periods int) ([]scores.FinancialData, error)
	GetValuation(ctx context.Context, ticker string, sector string) (*Valuation, error)
	GetProfitability(ctx context.Context, sector string, financials *Financials) (*Profitability, error)
	GetFinancialHealth(ctx context.Context, sector string, financials *Financials, financialData []scores.FinancialData) (*FinancialHealth, error)
	GetGrowth(ctx context.Context, sector string, financialData []scores.FinancialData) (*Growth, error)
	GetEarningsQuality(ctx context.Context, ticker string, sector string) (*EarningsQuality, error)
	GetHoldings(ctx context.Context, ticker string) (*Holdings, error)
	GetInsiderTrades(ctx context.Context, ticker string, limit int) ([]InsiderTrade, error)
	GetPerformance(ctx context.Context, ticker string, currentPrice, yearHigh float64) (*Performance, error)
	GetInsiderActivity(ctx context.Context, ticker string) (*InsiderActivity, error)
	GetDCF(ctx context.Context, ticker string) (*DCFValuation, error)
	Search(ctx context.Context, query string, limit int) ([]SearchResult, error)
	IsETF(ctx context.Context, ticker string) (bool, error)
	GetETFData(ctx context.Context, ticker string) (*ETFData, error)
}

// Cache defines the caching interface (legacy).
type Cache interface {
	Get(ctx context.Context, key string, dest any) error
	Set(ctx context.Context, key string, value any, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

// Service orchestrates stock data fetching with caching and score calculations.
type Service struct {
	// Provider interfaces
	fundamentals providers.FundamentalsProvider
	quotes       providers.QuoteProvider

	// Cache repository (optional)
	cacheRepo *db.Repository

	// Legacy repository (for backward compatibility)
	legacyRepo Repository

	// Cache TTL
	cacheTTL      time.Duration
	quoteCacheTTL time.Duration
}

// ServiceConfig holds service configuration options.
type ServiceConfig struct {
	CacheTTL      time.Duration
	QuoteCacheTTL time.Duration
}

// DefaultServiceConfig returns default configuration.
func DefaultServiceConfig() ServiceConfig {
	return ServiceConfig{
		CacheTTL:      24 * time.Hour,    // Fundamentals fresh for 24h
		QuoteCacheTTL: 5 * time.Minute,   // Quotes fresh for 5m
	}
}

// NewService creates a new stock service with legacy repository.
func NewService(repo Repository, cache Cache) *Service {
	return &Service{
		legacyRepo:    repo,
		cacheTTL:      24 * time.Hour,
		quoteCacheTTL: 5 * time.Minute,
	}
}

// NewCachedService creates a new stock service with providers and caching.
func NewCachedService(
	fundamentals providers.FundamentalsProvider,
	quotes providers.QuoteProvider,
	cacheRepo *db.Repository,
	cfg ServiceConfig,
) *Service {
	return &Service{
		fundamentals:  fundamentals,
		quotes:        quotes,
		cacheRepo:     cacheRepo,
		cacheTTL:      cfg.CacheTTL,
		quoteCacheTTL: cfg.QuoteCacheTTL,
	}
}

// StockDetailResponse is the complete response for GET /api/stock/{ticker}.
type StockDetailResponse struct {
	AssetType       AssetType        `json:"assetType"`
	Company         Company          `json:"company"`
	Quote           Quote            `json:"quote"`
	Performance     Performance      `json:"performance"`
	Scores          *Scores          `json:"scores,omitempty"`
	Signals         []signals.Signal `json:"signals"`
	Valuation       *Valuation       `json:"valuation,omitempty"`
	Holdings        *Holdings        `json:"holdings,omitempty"`
	InsiderTrades   []InsiderTrade   `json:"insiderTrades"`
	InsiderActivity *InsiderActivity `json:"insiderActivity,omitempty"`
	Financials      *Financials      `json:"financials,omitempty"`
	Profitability   *Profitability   `json:"profitability,omitempty"`
	FinancialHealth *FinancialHealth `json:"financialHealth,omitempty"`
	Growth          *Growth          `json:"growth,omitempty"`
	EarningsQuality *EarningsQuality `json:"earningsQuality,omitempty"`
	ETFData         *ETFData         `json:"etfData,omitempty"`
	Meta            DataMeta         `json:"meta"`
}

// Scores contains all computed scores.
type Scores struct {
	Piotroski    scores.PiotroskiResult `json:"piotroski"`
	RuleOf40     scores.RuleOf40Result  `json:"ruleOf40"`
	AltmanZ      scores.AltmanZResult   `json:"altmanZ"`
	DCFValuation DCFValuation           `json:"dcfValuation"`
}

// stockData holds all fetched data for building a response.
type stockData struct {
	company         *Company
	quote           *Quote
	financials      *Financials
	valuation       *Valuation
	profitability   *Profitability
	financialHealth *FinancialHealth
	growth          *Growth
	earningsQuality *EarningsQuality
	holdings        *Holdings
	insiderTrades   []InsiderTrade
	performance     *Performance
	insiderActivity *InsiderActivity
	financialData   []scores.FinancialData
	dcfValuation    *DCFValuation
}

// GetStockDetail retrieves comprehensive stock data for a ticker.
func (s *Service) GetStockDetail(ctx context.Context, ticker string) (*StockDetailResponse, error) {
	start := time.Now()

	// Use legacy path if no providers configured
	if s.fundamentals == nil {
		return s.getStockDetailLegacy(ctx, ticker)
	}

	// Check cache first
	if s.cacheRepo != nil {
		cached, err := s.cacheRepo.GetStock(ticker)
		if err == nil && time.Since(cached.UpdatedAt) < s.cacheTTL {
			slog.Info("cache hit",
				"ticker", ticker,
				"age", time.Since(cached.UpdatedAt).Round(time.Second),
				"duration", time.Since(start).Round(time.Millisecond),
			)
			return s.unmarshalResponse(cached.Fundamentals)
		}
		if err != nil && !errors.Is(err, db.ErrNotFound) {
			slog.Warn("cache read error", "ticker", ticker, "error", err)
		}
	}

	slog.Info("cache miss", "ticker", ticker)

	// Fetch fresh data from providers
	response, err := s.fetchAndBuildResponse(ctx, ticker)
	if err != nil {
		return nil, err
	}

	// Store in cache
	if s.cacheRepo != nil {
		if err := s.cacheResponse(ticker, response); err != nil {
			slog.Warn("cache write error", "ticker", ticker, "error", err)
		}
	}

	slog.Info("provider fetch complete",
		"ticker", ticker,
		"provider", "fmp",
		"duration", time.Since(start).Round(time.Millisecond),
	)

	return response, nil
}

// fetchAndBuildResponse fetches data from providers and builds the response.
func (s *Service) fetchAndBuildResponse(ctx context.Context, ticker string) (*StockDetailResponse, error) {
	var (
		company  *models.Company
		quote    *models.Quote
		ratios   *models.Ratios
		holders  []models.InstitutionalHolder
		trades   []models.InsiderTrade
		prices   []models.PriceBar
	)

	// Phase 1: Fetch base data in parallel
	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		company, err = s.fundamentals.GetCompany(gctx, ticker)
		if err != nil {
			return fmt.Errorf("fetching company: %w", err)
		}
		if company == nil {
			return ErrTickerNotFound
		}
		return nil
	})

	g.Go(func() error {
		var err error
		quote, err = s.quotes.GetQuote(gctx, ticker)
		if err != nil {
			return fmt.Errorf("fetching quote: %w", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		ratios, err = s.fundamentals.GetRatios(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch ratios", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		holders, err = s.fundamentals.GetInstitutionalHolders(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch holders", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		trades, err = s.fundamentals.GetInsiderTrades(gctx, ticker, 90)
		if err != nil {
			slog.Warn("failed to fetch insider trades", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		prices, err = s.quotes.GetHistoricalPrices(gctx, ticker, 365)
		if err != nil {
			slog.Warn("failed to fetch historical prices", "ticker", ticker, "error", err)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	// Build response from fetched data
	return s.buildResponseFromProviders(company, quote, ratios, holders, trades, prices), nil
}

// buildResponseFromProviders constructs the response from provider data.
func (s *Service) buildResponseFromProviders(
	company *models.Company,
	quote *models.Quote,
	ratios *models.Ratios,
	holders []models.InstitutionalHolder,
	trades []models.InsiderTrade,
	prices []models.PriceBar,
) *StockDetailResponse {
	// Convert provider models to domain types
	domainCompany := convertCompanyFromModel(company)
	domainQuote := convertQuoteFromModel(quote)

	// Calculate performance from historical prices
	performance := calculatePerformance(prices, quote.Price, quote.High)

	// Convert holdings
	holdings := convertHoldingsFromModel(holders)

	// Convert and aggregate insider trades
	insiderTrades, insiderActivity := convertInsiderTradesFromModel(trades)

	// Build financials from ratios
	financials := convertFinancialsFromRatios(ratios)

	// Build valuation
	valuation := convertValuationFromRatios(ratios, company.Sector)

	// Calculate sector metrics
	profitability := calculateProfitability(ratios, company.Sector)
	financialHealth := calculateFinancialHealth(ratios, company.Sector)

	return &StockDetailResponse{
		AssetType:       AssetTypeStock,
		Company:         domainCompany,
		Quote:           domainQuote,
		Performance:     performance,
		Signals:         []signals.Signal{},
		Valuation:       valuation,
		Holdings:        holdings,
		InsiderTrades:   insiderTrades,
		InsiderActivity: insiderActivity,
		Financials:      financials,
		Profitability:   profitability,
		FinancialHealth: financialHealth,
		Meta: DataMeta{
			FundamentalsAsOf: "TTM",
			HoldingsAsOf:     "Latest 13F",
			PriceAsOf:        quote.AsOf.Format(time.RFC3339),
			GeneratedAt:      time.Now().UTC(),
		},
	}
}

// cacheResponse stores the response in the cache.
func (s *Service) cacheResponse(ticker string, response *StockDetailResponse) error {
	data, err := json.Marshal(response)
	if err != nil {
		return fmt.Errorf("marshaling response: %w", err)
	}

	return s.cacheRepo.UpsertStock(&db.StockCache{
		Ticker:       ticker,
		Name:         response.Company.Name,
		Sector:       response.Company.Sector,
		Industry:     response.Company.Industry,
		MarketCap:    response.Quote.MarketCap,
		Fundamentals: data,
		Provider:     "fmp",
	})
}

// unmarshalResponse deserializes a cached response.
func (s *Service) unmarshalResponse(data []byte) (*StockDetailResponse, error) {
	var response StockDetailResponse
	if err := json.Unmarshal(data, &response); err != nil {
		return nil, fmt.Errorf("unmarshaling cached response: %w", err)
	}
	return &response, nil
}

// Conversion functions from provider models to domain types

func convertCompanyFromModel(m *models.Company) Company {
	return Company{
		Ticker:      m.Ticker,
		Name:        m.Name,
		Exchange:    m.Exchange,
		Sector:      m.Sector,
		Industry:    m.Industry,
		Description: m.Description,
	}
}

func convertQuoteFromModel(m *models.Quote) Quote {
	return Quote{
		Price:            m.Price,
		Change:           m.Change,
		ChangePercent:    m.ChangePercent,
		Volume:           m.Volume,
		MarketCap:        m.MarketCap,
		FiftyTwoWeekHigh: m.High,
		FiftyTwoWeekLow:  m.Low,
		AsOf:             m.AsOf,
	}
}

func convertHoldingsFromModel(holders []models.InstitutionalHolder) *Holdings {
	if len(holders) == 0 {
		return &Holdings{TopInstitutional: []InstitutionalHolder{}}
	}

	top := make([]InstitutionalHolder, 0, len(holders))
	for _, h := range holders {
		top = append(top, InstitutionalHolder{
			FundName:         h.Name,
			Shares:           h.Shares,
			Value:            h.Value,
			PortfolioPercent: h.PercentOwned,
			ChangeShares:     h.ChangeShares,
			ChangePercent:    h.ChangePercent,
			QuarterDate:      h.DateReported.Format("2006-Q1"),
		})
	}

	return &Holdings{TopInstitutional: top}
}

func convertInsiderTradesFromModel(trades []models.InsiderTrade) ([]InsiderTrade, *InsiderActivity) {
	result := make([]InsiderTrade, 0, len(trades))
	activity := &InsiderActivity{Trades: []InsiderTrade{}}

	for _, t := range trades {
		trade := InsiderTrade{
			InsiderName: t.Name,
			Title:       t.Title,
			TradeType:   t.TradeType,
			Shares:      t.Shares,
			Price:       t.Price,
			Value:       t.Value,
			TradeDate:   t.TradeDate.Format("2006-01-02"),
		}
		result = append(result, trade)
		activity.Trades = append(activity.Trades, trade)

		if t.TradeType == "buy" {
			activity.BuyCount90d++
			activity.NetValue90d += float64(t.Value)
		} else {
			activity.SellCount90d++
			activity.NetValue90d -= float64(t.Value)
		}
	}

	return result, activity
}

func convertFinancialsFromRatios(r *models.Ratios) *Financials {
	if r == nil {
		return &Financials{}
	}
	return &Financials{
		GrossMargin:     r.GrossMargin,
		OperatingMargin: r.OperatingMargin,
		NetMargin:       r.NetMargin,
		ROE:             r.ROE,
		ROIC:            r.ROIC,
		DebtToEquity:    r.DebtToEquity,
		CurrentRatio:    r.CurrentRatio,
	}
}

func convertValuationFromRatios(r *models.Ratios, sector string) *Valuation {
	if r == nil {
		return &Valuation{}
	}

	medians := getSectorMedians(sector)
	ptr := func(v float64) *float64 { return &v }

	return &Valuation{
		PE:          ValuationMetric{Value: ptr(r.PE), SectorMedian: ptr(medians.PE)},
		ForwardPE:   ValuationMetric{Value: ptr(r.ForwardPE), SectorMedian: ptr(medians.PE)},
		PEG:         ValuationMetric{Value: ptr(r.PEG), SectorMedian: ptr(medians.PEG)},
		EVToEBITDA:  ValuationMetric{Value: ptr(r.EVToEBITDA), SectorMedian: ptr(medians.EVToEBITDA)},
		PriceToFCF:  ValuationMetric{Value: ptr(r.PriceToFCF), SectorMedian: ptr(medians.PriceToFCF)},
		PriceToBook: ValuationMetric{Value: ptr(r.PB), SectorMedian: ptr(medians.PriceToBook)},
	}
}

func calculatePerformance(prices []models.PriceBar, currentPrice, yearHigh float64) Performance {
	perf := Performance{}

	if yearHigh > 0 {
		perf.PercentOf52High = (currentPrice / yearHigh) * 100
	}

	if len(prices) == 0 {
		return perf
	}

	getPriceChange := func(daysAgo int) float64 {
		if len(prices) <= daysAgo {
			return 0
		}
		oldPrice := prices[daysAgo].Close
		if oldPrice == 0 {
			return 0
		}
		return ((currentPrice - oldPrice) / oldPrice) * 100
	}

	perf.Day1Change = getPriceChange(1)
	perf.Week1Change = getPriceChange(5)
	perf.Month1Change = getPriceChange(21)
	if len(prices) > 250 {
		perf.Year1Change = getPriceChange(252)
	}

	return perf
}

func calculateProfitability(r *models.Ratios, sector string) *Profitability {
	if r == nil {
		return &Profitability{}
	}

	ranges := getSectorRanges(sector)

	return &Profitability{
		ROIC: SectorMetric{
			Value:        r.ROIC,
			SectorMin:    ranges.ROIC.Min,
			SectorMedian: ranges.ROIC.Median,
			SectorMax:    ranges.ROIC.Max,
			Percentile:   calculatePercentile(r.ROIC, ranges.ROIC.Min, ranges.ROIC.Max),
		},
		ROE: SectorMetric{
			Value:        r.ROE,
			SectorMin:    ranges.ROE.Min,
			SectorMedian: ranges.ROE.Median,
			SectorMax:    ranges.ROE.Max,
			Percentile:   calculatePercentile(r.ROE, ranges.ROE.Min, ranges.ROE.Max),
		},
		OperatingMargin: SectorMetric{
			Value:        r.OperatingMargin,
			SectorMin:    ranges.OperatingMargin.Min,
			SectorMedian: ranges.OperatingMargin.Median,
			SectorMax:    ranges.OperatingMargin.Max,
			Percentile:   calculatePercentile(r.OperatingMargin, ranges.OperatingMargin.Min, ranges.OperatingMargin.Max),
		},
	}
}

func calculateFinancialHealth(r *models.Ratios, sector string) *FinancialHealth {
	if r == nil {
		return &FinancialHealth{}
	}

	ranges := getSectorRanges(sector)

	return &FinancialHealth{
		DebtToEquity: SectorMetric{
			Value:        r.DebtToEquity,
			SectorMin:    ranges.DebtToEquity.Min,
			SectorMedian: ranges.DebtToEquity.Median,
			SectorMax:    ranges.DebtToEquity.Max,
			Percentile:   calculatePercentileInverted(r.DebtToEquity, ranges.DebtToEquity.Min, ranges.DebtToEquity.Max),
		},
		CurrentRatio: SectorMetric{
			Value:        r.CurrentRatio,
			SectorMin:    ranges.CurrentRatio.Min,
			SectorMedian: ranges.CurrentRatio.Median,
			SectorMax:    ranges.CurrentRatio.Max,
			Percentile:   calculatePercentile(r.CurrentRatio, ranges.CurrentRatio.Min, ranges.CurrentRatio.Max),
		},
		AssetTurnover: SectorMetric{
			Value:        r.AssetTurnover,
			SectorMin:    ranges.AssetTurnover.Min,
			SectorMedian: ranges.AssetTurnover.Median,
			SectorMax:    ranges.AssetTurnover.Max,
			Percentile:   calculatePercentile(r.AssetTurnover, ranges.AssetTurnover.Min, ranges.AssetTurnover.Max),
		},
	}
}

func calculatePercentile(value, min, max float64) int {
	if max <= min {
		return 50
	}
	if value <= min {
		return 0
	}
	if value >= max {
		return 100
	}
	return int(((value - min) / (max - min)) * 100)
}

func calculatePercentileInverted(value, min, max float64) int {
	if max <= min {
		return 50
	}
	if value <= min {
		return 100
	}
	if value >= max {
		return 0
	}
	return int(((max - value) / (max - min)) * 100)
}

// Sector data structures

type sectorMedians struct {
	PE          float64
	PEG         float64
	EVToEBITDA  float64
	PriceToFCF  float64
	PriceToBook float64
}

type metricRange struct {
	Min    float64
	Median float64
	Max    float64
}

type sectorRanges struct {
	ROIC            metricRange
	ROE             metricRange
	OperatingMargin metricRange
	DebtToEquity    metricRange
	CurrentRatio    metricRange
	AssetTurnover   metricRange
}

var sectorMedianData = map[string]sectorMedians{
	"Technology":             {PE: 28.0, PEG: 1.8, EVToEBITDA: 18.0, PriceToFCF: 25.0, PriceToBook: 6.0},
	"Healthcare":             {PE: 22.0, PEG: 1.6, EVToEBITDA: 14.0, PriceToFCF: 20.0, PriceToBook: 4.0},
	"Financial Services":     {PE: 14.0, PEG: 1.2, EVToEBITDA: 10.0, PriceToFCF: 12.0, PriceToBook: 1.5},
	"Consumer Cyclical":      {PE: 18.0, PEG: 1.4, EVToEBITDA: 12.0, PriceToFCF: 18.0, PriceToBook: 4.0},
	"Consumer Defensive":     {PE: 20.0, PEG: 2.2, EVToEBITDA: 14.0, PriceToFCF: 22.0, PriceToBook: 5.0},
	"Industrials":            {PE: 20.0, PEG: 1.5, EVToEBITDA: 12.0, PriceToFCF: 18.0, PriceToBook: 3.5},
	"Energy":                 {PE: 12.0, PEG: 1.0, EVToEBITDA: 6.0, PriceToFCF: 10.0, PriceToBook: 1.8},
	"Basic Materials":        {PE: 14.0, PEG: 1.2, EVToEBITDA: 8.0, PriceToFCF: 12.0, PriceToBook: 2.0},
	"Utilities":              {PE: 18.0, PEG: 2.5, EVToEBITDA: 12.0, PriceToFCF: 15.0, PriceToBook: 2.0},
	"Real Estate":            {PE: 35.0, PEG: 2.0, EVToEBITDA: 18.0, PriceToFCF: 25.0, PriceToBook: 2.5},
	"Communication Services": {PE: 18.0, PEG: 1.3, EVToEBITDA: 10.0, PriceToFCF: 15.0, PriceToBook: 3.0},
}

var sectorRangeData = map[string]sectorRanges{
	"Technology": {
		ROIC: metricRange{5, 15, 40}, ROE: metricRange{10, 25, 50}, OperatingMargin: metricRange{10, 20, 40},
		DebtToEquity: metricRange{0, 0.4, 1.5}, CurrentRatio: metricRange{1, 2, 4}, AssetTurnover: metricRange{0.3, 0.6, 1.2},
	},
	"Healthcare": {
		ROIC: metricRange{3, 12, 30}, ROE: metricRange{8, 18, 40}, OperatingMargin: metricRange{5, 15, 30},
		DebtToEquity: metricRange{0, 0.5, 1.8}, CurrentRatio: metricRange{1, 1.8, 3.5}, AssetTurnover: metricRange{0.3, 0.5, 1.0},
	},
	"Financial Services": {
		ROIC: metricRange{2, 8, 18}, ROE: metricRange{8, 12, 20}, OperatingMargin: metricRange{15, 30, 50},
		DebtToEquity: metricRange{0.5, 2, 8}, CurrentRatio: metricRange{0.8, 1.2, 2}, AssetTurnover: metricRange{0.02, 0.05, 0.1},
	},
	"Consumer Cyclical": {
		ROIC: metricRange{4, 12, 28}, ROE: metricRange{10, 20, 40}, OperatingMargin: metricRange{5, 12, 25},
		DebtToEquity: metricRange{0.2, 0.8, 2}, CurrentRatio: metricRange{1, 1.5, 3}, AssetTurnover: metricRange{0.8, 1.5, 2.5},
	},
	"Consumer Defensive": {
		ROIC: metricRange{5, 14, 30}, ROE: metricRange{12, 22, 45}, OperatingMargin: metricRange{8, 15, 28},
		DebtToEquity: metricRange{0.2, 0.6, 1.5}, CurrentRatio: metricRange{0.8, 1.2, 2}, AssetTurnover: metricRange{0.8, 1.2, 2.0},
	},
	"Industrials": {
		ROIC: metricRange{4, 11, 25}, ROE: metricRange{10, 18, 35}, OperatingMargin: metricRange{6, 12, 22},
		DebtToEquity: metricRange{0.3, 0.8, 2}, CurrentRatio: metricRange{1, 1.5, 2.5}, AssetTurnover: metricRange{0.5, 0.9, 1.5},
	},
	"Energy": {
		ROIC: metricRange{2, 8, 20}, ROE: metricRange{5, 15, 30}, OperatingMargin: metricRange{5, 15, 35},
		DebtToEquity: metricRange{0.2, 0.5, 1.5}, CurrentRatio: metricRange{0.8, 1.2, 2}, AssetTurnover: metricRange{0.3, 0.6, 1.0},
	},
	"Basic Materials": {
		ROIC: metricRange{3, 9, 20}, ROE: metricRange{8, 15, 28}, OperatingMargin: metricRange{8, 15, 28},
		DebtToEquity: metricRange{0.2, 0.5, 1.5}, CurrentRatio: metricRange{1, 1.8, 3}, AssetTurnover: metricRange{0.4, 0.7, 1.2},
	},
	"Utilities": {
		ROIC: metricRange{2, 5, 10}, ROE: metricRange{6, 10, 15}, OperatingMargin: metricRange{15, 25, 40},
		DebtToEquity: metricRange{0.8, 1.2, 2.5}, CurrentRatio: metricRange{0.6, 0.9, 1.5}, AssetTurnover: metricRange{0.2, 0.3, 0.5},
	},
	"Real Estate": {
		ROIC: metricRange{2, 5, 12}, ROE: metricRange{4, 8, 15}, OperatingMargin: metricRange{20, 35, 55},
		DebtToEquity: metricRange{0.5, 1, 2.5}, CurrentRatio: metricRange{0.5, 1, 2}, AssetTurnover: metricRange{0.05, 0.1, 0.2},
	},
	"Communication Services": {
		ROIC: metricRange{4, 10, 22}, ROE: metricRange{8, 16, 32}, OperatingMargin: metricRange{10, 20, 35},
		DebtToEquity: metricRange{0.3, 0.8, 2}, CurrentRatio: metricRange{0.8, 1.3, 2.5}, AssetTurnover: metricRange{0.3, 0.5, 0.9},
	},
}

func getSectorMedians(sector string) sectorMedians {
	if m, ok := sectorMedianData[sector]; ok {
		return m
	}
	return sectorMedianData["Technology"]
}

func getSectorRanges(sector string) sectorRanges {
	if r, ok := sectorRangeData[sector]; ok {
		return r
	}
	return sectorRangeData["Technology"]
}

// Legacy service implementation for backward compatibility

func (s *Service) getStockDetailLegacy(ctx context.Context, ticker string) (*StockDetailResponse, error) {
	// Check if ticker is an ETF
	isETF, err := s.legacyRepo.IsETF(ctx, ticker)
	if err != nil {
		slog.Warn("failed to check if ticker is ETF, assuming stock",
			"ticker", ticker,
			"error", err,
		)
	}
	if isETF {
		return s.getETFDetail(ctx, ticker)
	}

	return s.getStockDetail(ctx, ticker)
}

// getETFDetail retrieves ETF-specific data.
func (s *Service) getETFDetail(ctx context.Context, ticker string) (*StockDetailResponse, error) {
	company, err := s.legacyRepo.GetCompany(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching company for %s: %w", ticker, err)
	}
	if company == nil {
		return nil, ErrTickerNotFound
	}

	quote, err := s.legacyRepo.GetQuote(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching quote for %s: %w", ticker, err)
	}

	performance, err := s.legacyRepo.GetPerformance(ctx, ticker, quote.Price, quote.FiftyTwoWeekHigh)
	if err != nil {
		return nil, fmt.Errorf("fetching performance for %s: %w", ticker, err)
	}

	etfData, err := s.legacyRepo.GetETFData(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching ETF data for %s: %w", ticker, err)
	}

	return &StockDetailResponse{
		AssetType:     AssetTypeETF,
		Company:       *company,
		Quote:         *quote,
		Performance:   *performance,
		Signals:       []signals.Signal{},
		InsiderTrades: []InsiderTrade{},
		ETFData:       etfData,
		Meta: DataMeta{
			FundamentalsAsOf: "N/A",
			HoldingsAsOf:     etfData.InceptionDate,
			PriceAsOf:        quote.AsOf.Format(time.RFC3339),
			GeneratedAt:      time.Now().UTC(),
		},
	}, nil
}

// getStockDetail retrieves comprehensive stock data for a ticker (legacy path).
func (s *Service) getStockDetail(ctx context.Context, ticker string) (*StockDetailResponse, error) {
	data, err := s.fetchAllStockData(ctx, ticker)
	if err != nil {
		return nil, err
	}

	stockScores, signalList := s.analyzeStock(data)
	return s.buildStockResponse(data, stockScores, signalList), nil
}

// fetchAllStockData fetches all required data for a stock in parallel.
func (s *Service) fetchAllStockData(ctx context.Context, ticker string) (*stockData, error) {
	data := &stockData{}

	// Phase 1: Fetch company and quote first
	g1, ctx1 := errgroup.WithContext(ctx)

	g1.Go(func() error {
		company, err := s.legacyRepo.GetCompany(ctx1, ticker)
		if err != nil {
			return fmt.Errorf("fetching company for %s: %w", ticker, err)
		}
		if company == nil {
			return ErrTickerNotFound
		}
		data.company = company
		return nil
	})

	g1.Go(func() error {
		quote, err := s.legacyRepo.GetQuote(ctx1, ticker)
		if err != nil {
			return fmt.Errorf("fetching quote for %s: %w", ticker, err)
		}
		data.quote = quote
		return nil
	})

	g1.Go(func() error {
		holdings, err := s.legacyRepo.GetHoldings(ctx1, ticker)
		if err != nil {
			return fmt.Errorf("fetching holdings for %s: %w", ticker, err)
		}
		data.holdings = holdings
		return nil
	})

	g1.Go(func() error {
		financialData, err := s.legacyRepo.GetFinancialData(ctx1, ticker, 2)
		if err != nil {
			return fmt.Errorf("fetching financial data for %s: %w", ticker, err)
		}
		data.financialData = financialData
		return nil
	})

	g1.Go(func() error {
		insiderTrades, err := s.legacyRepo.GetInsiderTrades(ctx1, ticker, 10)
		if err != nil {
			slog.Warn("failed to fetch insider trades", "ticker", ticker, "error", err)
			data.insiderTrades = []InsiderTrade{}
		} else {
			data.insiderTrades = insiderTrades
		}
		return nil
	})

	g1.Go(func() error {
		insiderActivity, err := s.legacyRepo.GetInsiderActivity(ctx1, ticker)
		if err != nil {
			slog.Warn("failed to fetch insider activity", "ticker", ticker, "error", err)
			data.insiderActivity = &InsiderActivity{Trades: []InsiderTrade{}}
		} else {
			data.insiderActivity = insiderActivity
		}
		return nil
	})

	g1.Go(func() error {
		dcfValuation, err := s.legacyRepo.GetDCF(ctx1, ticker)
		if err != nil {
			slog.Warn("failed to fetch DCF valuation", "ticker", ticker, "error", err)
			data.dcfValuation = &DCFValuation{}
		} else {
			data.dcfValuation = dcfValuation
		}
		return nil
	})

	if err := g1.Wait(); err != nil {
		return nil, err
	}

	// Phase 2: Fetch data that depends on company/quote
	g2, ctx2 := errgroup.WithContext(ctx)

	g2.Go(func() error {
		financials, err := s.legacyRepo.GetFinancials(ctx2, ticker)
		if err != nil {
			return fmt.Errorf("fetching financials for %s: %w", ticker, err)
		}
		data.financials = financials
		return nil
	})

	g2.Go(func() error {
		valuation, err := s.legacyRepo.GetValuation(ctx2, ticker, data.company.Sector)
		if err != nil {
			return fmt.Errorf("fetching valuation for %s: %w", ticker, err)
		}
		data.valuation = valuation
		return nil
	})

	g2.Go(func() error {
		performance, err := s.legacyRepo.GetPerformance(ctx2, ticker, data.quote.Price, data.quote.FiftyTwoWeekHigh)
		if err != nil {
			return fmt.Errorf("fetching performance for %s: %w", ticker, err)
		}
		data.performance = performance
		return nil
	})

	if err := g2.Wait(); err != nil {
		return nil, err
	}

	// Phase 3: Fetch metrics that depend on financials
	g3, ctx3 := errgroup.WithContext(ctx)

	g3.Go(func() error {
		profitability, err := s.legacyRepo.GetProfitability(ctx3, data.company.Sector, data.financials)
		if err != nil {
			return fmt.Errorf("fetching profitability for %s: %w", ticker, err)
		}
		data.profitability = profitability
		return nil
	})

	g3.Go(func() error {
		financialHealth, err := s.legacyRepo.GetFinancialHealth(ctx3, data.company.Sector, data.financials, data.financialData)
		if err != nil {
			return fmt.Errorf("fetching financial health for %s: %w", ticker, err)
		}
		data.financialHealth = financialHealth
		return nil
	})

	g3.Go(func() error {
		growth, err := s.legacyRepo.GetGrowth(ctx3, data.company.Sector, data.financialData)
		if err != nil {
			return fmt.Errorf("fetching growth for %s: %w", ticker, err)
		}
		data.growth = growth
		return nil
	})

	g3.Go(func() error {
		earningsQuality, err := s.legacyRepo.GetEarningsQuality(ctx3, ticker, data.company.Sector)
		if err != nil {
			return fmt.Errorf("fetching earnings quality for %s: %w", ticker, err)
		}
		data.earningsQuality = earningsQuality
		return nil
	})

	if err := g3.Wait(); err != nil {
		return nil, err
	}

	return data, nil
}

// analyzeStock calculates scores and generates signals from fetched data.
func (s *Service) analyzeStock(data *stockData) (Scores, []signals.Signal) {
	stockScores := s.calculateScores(data.financialData, data.dcfValuation)

	signalData := &signals.StockData{
		Financials:      convertFinancials(data.financials),
		InsiderActivity: convertInsiderActivityForSignals(data.insiderActivity),
	}

	generator := signals.NewGenerator()
	signalList := generator.GenerateAll(signalData, stockScores.Piotroski, stockScores.AltmanZ)

	return stockScores, signalList
}

// buildStockResponse constructs the API response from analyzed data.
func (s *Service) buildStockResponse(data *stockData, stockScores Scores, signalList []signals.Signal) *StockDetailResponse {
	fundamentalsDate := "N/A"
	if len(data.financialData) > 0 && data.financialData[0].FiscalYear > 0 {
		fundamentalsDate = fmt.Sprintf("%d", data.financialData[0].FiscalYear)
	}

	return &StockDetailResponse{
		AssetType:       AssetTypeStock,
		Company:         *data.company,
		Quote:           *data.quote,
		Performance:     *data.performance,
		Scores:          &stockScores,
		Signals:         signalList,
		Valuation:       data.valuation,
		Holdings:        data.holdings,
		InsiderTrades:   data.insiderTrades,
		InsiderActivity: data.insiderActivity,
		Financials:      data.financials,
		Profitability:   data.profitability,
		FinancialHealth: data.financialHealth,
		Growth:          data.growth,
		EarningsQuality: data.earningsQuality,
		Meta: DataMeta{
			FundamentalsAsOf: fundamentalsDate,
			HoldingsAsOf:     "N/A",
			PriceAsOf:        data.quote.AsOf.Format(time.RFC3339),
			GeneratedAt:      time.Now().UTC(),
		},
	}
}

// calculateScores computes all financial scores from raw data.
func (s *Service) calculateScores(data []scores.FinancialData, dcf *DCFValuation) Scores {
	var piotroskiResult scores.PiotroskiResult
	var ruleOf40Result scores.RuleOf40Result
	var altmanZResult scores.AltmanZResult

	if len(data) >= 2 {
		piotroskiResult = scores.CalculatePiotroskiScore(data[0], data[1])
		ruleOf40Result = scores.CalculateRuleOf40WithGrowth(data[0], data[1])
	} else if len(data) == 1 {
		piotroskiResult = scores.CalculatePiotroskiScore(data[0], scores.FinancialData{})
		ruleOf40Result = scores.CalculateRuleOf40(data[0])
	}

	if len(data) >= 1 {
		altmanZResult = scores.CalculateAltmanZScore(data[0])
	}

	dcfValuation := DCFValuation{}
	if dcf != nil {
		dcfValuation = *dcf
	}

	return Scores{
		Piotroski:    piotroskiResult,
		RuleOf40:     ruleOf40Result,
		AltmanZ:      altmanZResult,
		DCFValuation: dcfValuation,
	}
}

// convertFinancials converts stock.Financials to signals.FinancialsData.
func convertFinancials(f *Financials) *signals.FinancialsData {
	if f == nil {
		return nil
	}
	return &signals.FinancialsData{
		RevenueGrowthYoY: f.RevenueGrowthYoY,
		OperatingMargin:  f.OperatingMargin,
		DebtToEquity:     f.DebtToEquity,
		ROIC:             f.ROIC,
	}
}

// convertInsiderActivityForSignals converts stock.InsiderActivity to signals.InsiderActivityData.
func convertInsiderActivityForSignals(i *InsiderActivity) *signals.InsiderActivityData {
	if i == nil {
		return nil
	}
	return &signals.InsiderActivityData{
		BuyCount90d:  i.BuyCount90d,
		SellCount90d: i.SellCount90d,
		NetValue90d:  i.NetValue90d,
	}
}

// Search finds tickers matching the query.
func (s *Service) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	results, err := s.legacyRepo.Search(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("searching for %s: %w", query, err)
	}
	return results, nil
}
