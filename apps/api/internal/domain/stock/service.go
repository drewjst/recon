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
	GetTechnicalMetrics(ctx context.Context, ticker string) (*TechnicalMetrics, error)
	GetShortInterest(ctx context.Context, ticker string) (*ShortInterest, error)
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
		CacheTTL:      24 * time.Hour,  // Fundamentals fresh for 24h
		QuoteCacheTTL: 5 * time.Minute, // Quotes fresh for 5m
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
	AssetType        AssetType         `json:"assetType"`
	Company          Company           `json:"company"`
	Quote            Quote             `json:"quote"`
	Performance      Performance       `json:"performance"`
	Scores           *Scores           `json:"scores,omitempty"`
	Signals          []signals.Signal  `json:"signals"`
	Valuation        *Valuation        `json:"valuation,omitempty"`
	Holdings         *Holdings         `json:"holdings,omitempty"`
	InsiderTrades    []InsiderTrade    `json:"insiderTrades"`
	InsiderActivity  *InsiderActivity  `json:"insiderActivity,omitempty"`
	Financials       *Financials       `json:"financials,omitempty"`
	Profitability    *Profitability    `json:"profitability,omitempty"`
	FinancialHealth  *FinancialHealth  `json:"financialHealth,omitempty"`
	Growth           *Growth           `json:"growth,omitempty"`
	EarningsQuality  *EarningsQuality  `json:"earningsQuality,omitempty"`
	TechnicalMetrics *TechnicalMetrics `json:"technicalMetrics,omitempty"`
	ShortInterest    *ShortInterest    `json:"shortInterest,omitempty"`
	AnalystEstimates *AnalystEstimates `json:"analystEstimates,omitempty"`
	ETFData          *ETFData          `json:"etfData,omitempty"`
	Meta             DataMeta          `json:"meta"`
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
	company          *Company
	quote            *Quote
	financials       *Financials
	valuation        *Valuation
	profitability    *Profitability
	financialHealth  *FinancialHealth
	growth           *Growth
	earningsQuality  *EarningsQuality
	holdings         *Holdings
	insiderTrades    []InsiderTrade
	performance      *Performance
	insiderActivity  *InsiderActivity
	financialData    []scores.FinancialData
	dcfValuation     *DCFValuation
	technicalMetrics *TechnicalMetrics
	shortInterest    *ShortInterest
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
		company          *models.Company
		quote            *models.Quote
		ratios           *models.Ratios
		financials       []models.Financials
		holders          []models.InstitutionalHolder
		trades           []models.InsiderTrade
		prices           []models.PriceBar
		dcf              *models.DCF
		technicalMetrics *models.TechnicalMetrics
		shortInterest    *models.ShortInterest
		analystEstimates *models.AnalystEstimates
		etfData          *models.ETFData
	)

	// Fetch all data in parallel
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
		financials, err = s.fundamentals.GetFinancials(gctx, ticker, 2)
		if err != nil {
			slog.Warn("failed to fetch financials", "ticker", ticker, "error", err)
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

	g.Go(func() error {
		var err error
		dcf, err = s.fundamentals.GetDCF(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch DCF", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		technicalMetrics, err = s.fundamentals.GetTechnicalMetrics(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch technical metrics", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		shortInterest, err = s.fundamentals.GetShortInterest(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch short interest", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		analystEstimates, err = s.fundamentals.GetAnalystEstimates(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch analyst estimates", "ticker", ticker, "error", err)
		}
		return nil
	})

	// Fetch ETF data (will be nil for non-ETFs)
	g.Go(func() error {
		var err error
		etfData, err = s.fundamentals.GetETFData(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch ETF data", "ticker", ticker, "error", err)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	// If ETF data is present, build ETF response
	if etfData != nil {
		return s.buildETFResponseFromProviders(company, quote, prices, etfData), nil
	}

	// Build stock response from fetched data
	return s.buildResponseFromProviders(company, quote, ratios, financials, holders, trades, prices, dcf, technicalMetrics, shortInterest, analystEstimates), nil
}

// buildResponseFromProviders constructs the response from provider data.
func (s *Service) buildResponseFromProviders(
	company *models.Company,
	quote *models.Quote,
	ratios *models.Ratios,
	financialStatements []models.Financials,
	holders []models.InstitutionalHolder,
	trades []models.InsiderTrade,
	prices []models.PriceBar,
	dcf *models.DCF,
	technicalMetrics *models.TechnicalMetrics,
	shortInterest *models.ShortInterest,
	analystEstimates *models.AnalystEstimates,
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
	growth := calculateGrowthFromRatios(ratios, company.Sector)
	earningsQuality := calculateEarningsQualityFromRatios(ratios, company.Sector)

	// Convert financials to score data and calculate scores
	financialData := convertToScoreData(financialStatements, quote.Price, quote.MarketCap)
	stockScores := s.calculateScoresFromData(financialData, dcf, quote.Price)

	// Generate signals
	signalData := &signals.StockData{
		Financials:      convertFinancialsForSignals(financials),
		InsiderActivity: convertInsiderActivityForSignals(insiderActivity),
	}
	generator := signals.NewGenerator()
	signalList := generator.GenerateAll(signalData, stockScores.Piotroski, stockScores.AltmanZ)

	// Determine fundamentals date
	fundamentalsDate := "TTM"
	if len(financialStatements) > 0 && financialStatements[0].FiscalYear > 0 {
		fundamentalsDate = fmt.Sprintf("%d", financialStatements[0].FiscalYear)
	}

	return &StockDetailResponse{
		AssetType:        AssetTypeStock,
		Company:          domainCompany,
		Quote:            domainQuote,
		Performance:      performance,
		Scores:           &stockScores,
		Signals:          signalList,
		Valuation:        valuation,
		Holdings:         holdings,
		InsiderTrades:    insiderTrades,
		InsiderActivity:  insiderActivity,
		Financials:       financials,
		Profitability:    profitability,
		FinancialHealth:  financialHealth,
		Growth:           growth,
		EarningsQuality:  earningsQuality,
		TechnicalMetrics: convertTechnicalMetricsFromModel(technicalMetrics),
		ShortInterest:    convertShortInterestFromModel(shortInterest),
		AnalystEstimates: convertAnalystEstimatesFromModel(analystEstimates),
		Meta: DataMeta{
			FundamentalsAsOf: fundamentalsDate,
			HoldingsAsOf:     "Latest 13F",
			PriceAsOf:        quote.AsOf.Format(time.RFC3339),
			GeneratedAt:      time.Now().UTC(),
		},
	}
}

// buildETFResponseFromProviders constructs an ETF response from provider data.
func (s *Service) buildETFResponseFromProviders(
	company *models.Company,
	quote *models.Quote,
	prices []models.PriceBar,
	etfData *models.ETFData,
) *StockDetailResponse {
	domainCompany := convertCompanyFromModel(company)
	domainQuote := convertQuoteFromModel(quote)

	// Calculate performance from historical prices
	performance := calculatePerformance(prices, quote.Price, quote.High)

	// Convert ETF data from provider model to domain type
	etf := convertETFDataFromModel(etfData)

	return &StockDetailResponse{
		AssetType:     AssetTypeETF,
		Company:       domainCompany,
		Quote:         domainQuote,
		Performance:   performance,
		Signals:       []signals.Signal{},
		InsiderTrades: []InsiderTrade{},
		ETFData:       etf,
		Meta: DataMeta{
			FundamentalsAsOf: "N/A",
			HoldingsAsOf:     etf.InceptionDate,
			PriceAsOf:        quote.AsOf.Format(time.RFC3339),
			GeneratedAt:      time.Now().UTC(),
		},
	}
}

// convertETFDataFromModel converts provider ETFData to domain ETFData.
func convertETFDataFromModel(m *models.ETFData) *ETFData {
	if m == nil {
		return nil
	}

	// Convert holdings
	holdings := make([]ETFHolding, 0, len(m.Holdings))
	for _, h := range m.Holdings {
		holdings = append(holdings, ETFHolding{
			Ticker:        h.Ticker,
			Name:          h.Name,
			Sector:        h.Sector,
			WeightPercent: h.WeightPercent,
		})
	}

	// Convert sector weights
	sectorWeights := make([]ETFSectorWeight, 0, len(m.SectorWeights))
	for _, s := range m.SectorWeights {
		sectorWeights = append(sectorWeights, ETFSectorWeight{
			Sector:        s.Sector,
			WeightPercent: s.WeightPercent,
		})
	}

	// Convert regions
	regions := make([]ETFRegionWeight, 0, len(m.Regions))
	for _, r := range m.Regions {
		regions = append(regions, ETFRegionWeight{
			Region:        r.Region,
			WeightPercent: r.WeightPercent,
		})
	}

	// Convert market cap breakdown
	var marketCapBreakdown *ETFMarketCap
	if m.MarketCapBreakdown != nil {
		marketCapBreakdown = &ETFMarketCap{
			Mega:   m.MarketCapBreakdown.Mega,
			Big:    m.MarketCapBreakdown.Big,
			Medium: m.MarketCapBreakdown.Medium,
			Small:  m.MarketCapBreakdown.Small,
			Micro:  m.MarketCapBreakdown.Micro,
		}
	}

	// Convert valuations
	var valuations *ETFValuations
	if m.Valuations != nil {
		valuations = &ETFValuations{
			PE:            m.Valuations.PE,
			PB:            m.Valuations.PB,
			PS:            m.Valuations.PS,
			PCF:           m.Valuations.PCF,
			DividendYield: m.Valuations.DividendYield,
		}
	}

	// Convert performance
	var performance *ETFPerformance
	if m.Performance != nil {
		performance = &ETFPerformance{
			YTD: m.Performance.YTD,
			Y1:  m.Performance.Y1,
			Y3:  m.Performance.Y3,
			Y5:  m.Performance.Y5,
			Y10: m.Performance.Y10,
		}
	}

	return &ETFData{
		ExpenseRatio:       m.ExpenseRatio,
		AUM:                m.AUM,
		NAV:                m.NAV,
		AvgVolume:          m.AvgVolume,
		Beta:               m.Beta,
		HoldingsCount:      m.HoldingsCount,
		Domicile:           m.Domicile,
		InceptionDate:      m.InceptionDate,
		Holdings:           holdings,
		SectorWeights:      sectorWeights,
		Regions:            regions,
		MarketCapBreakdown: marketCapBreakdown,
		Valuations:         valuations,
		Performance:        performance,
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

func convertTechnicalMetricsFromModel(m *models.TechnicalMetrics) *TechnicalMetrics {
	if m == nil {
		return nil
	}
	return &TechnicalMetrics{
		Beta:     m.Beta,
		MA50Day:  m.MA50Day,
		MA200Day: m.MA200Day,
	}
}

func convertShortInterestFromModel(m *models.ShortInterest) *ShortInterest {
	if m == nil {
		return nil
	}
	return &ShortInterest{
		SharesShort:           m.SharesShort,
		SharesShortPriorMonth: m.SharesShortPriorMonth,
		ShortRatio:            m.ShortRatio,
		ShortPercentFloat:     m.ShortPercentFloat,
		ShortPercentShares:    m.ShortPercentShares,
	}
}

func convertAnalystEstimatesFromModel(m *models.AnalystEstimates) *AnalystEstimates {
	if m == nil {
		return nil
	}
	return &AnalystEstimates{
		Rating:                  m.Rating,
		RatingScore:             m.RatingScore,
		AnalystCount:            m.AnalystCount,
		StrongBuyCount:          m.StrongBuyCount,
		BuyCount:                m.BuyCount,
		HoldCount:               m.HoldCount,
		SellCount:               m.SellCount,
		StrongSellCount:         m.StrongSellCount,
		PriceTargetHigh:         m.PriceTargetHigh,
		PriceTargetLow:          m.PriceTargetLow,
		PriceTargetAverage:      m.PriceTargetAverage,
		PriceTargetMedian:       m.PriceTargetMedian,
		EPSEstimateCurrentY:     m.EPSEstimateCurrentY,
		EPSEstimateNextY:        m.EPSEstimateNextY,
		EPSGrowthNextY:          m.EPSGrowthNextY,
		RevenueEstimateCurrentY: m.RevenueEstimateCurrentY,
		RevenueEstimateNextY:    m.RevenueEstimateNextY,
		RevenueGrowthNextY:      m.RevenueGrowthNextY,
	}
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
	ranges := getSectorRanges(sector)
	ptr := func(v float64) *float64 { return &v }
	ptrInt := func(v int) *int { return &v }

	// Helper to calculate inverted percentile for valuation metrics (lower is better)
	calcPct := func(value float64, rng metricRange) *int {
		if value <= 0 {
			return nil // Invalid or missing value
		}
		return ptrInt(calculatePercentileInverted(value, rng.Min, rng.Max))
	}

	return &Valuation{
		PE:          ValuationMetric{Value: ptr(r.PE), SectorMedian: ptr(medians.PE), Percentile: calcPct(r.PE, ranges.PE)},
		ForwardPE:   ValuationMetric{Value: ptr(r.ForwardPE), SectorMedian: ptr(medians.PE), Percentile: calcPct(r.ForwardPE, ranges.PE)},
		PEG:         ValuationMetric{Value: ptr(r.PEG), SectorMedian: ptr(medians.PEG), Percentile: calcPct(r.PEG, ranges.PEG)},
		EVToEBITDA:  ValuationMetric{Value: ptr(r.EVToEBITDA), SectorMedian: ptr(medians.EVToEBITDA), Percentile: calcPct(r.EVToEBITDA, ranges.EVToEBITDA)},
		PriceToFCF:  ValuationMetric{Value: ptr(r.PriceToFCF), SectorMedian: ptr(medians.PriceToFCF), Percentile: calcPct(r.PriceToFCF, ranges.PriceToFCF)},
		PriceToBook: ValuationMetric{Value: ptr(r.PB), SectorMedian: ptr(medians.PriceToBook), Percentile: calcPct(r.PB, ranges.PriceToBook)},
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

	prof := &Profitability{
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

	// Add Gross Margin if available
	if r.GrossMargin != 0 {
		prof.GrossMargin = &SectorMetric{
			Value:        r.GrossMargin,
			SectorMin:    ranges.GrossMargin.Min,
			SectorMedian: ranges.GrossMargin.Median,
			SectorMax:    ranges.GrossMargin.Max,
			Percentile:   calculatePercentile(r.GrossMargin, ranges.GrossMargin.Min, ranges.GrossMargin.Max),
		}
	}

	// Add Net Margin if available
	if r.NetMargin != 0 {
		prof.NetMargin = &SectorMetric{
			Value:        r.NetMargin,
			SectorMin:    ranges.NetMargin.Min,
			SectorMedian: ranges.NetMargin.Median,
			SectorMax:    ranges.NetMargin.Max,
			Percentile:   calculatePercentile(r.NetMargin, ranges.NetMargin.Min, ranges.NetMargin.Max),
		}
	}

	return prof
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

func calculateGrowthFromRatios(r *models.Ratios, sector string) *Growth {
	if r == nil {
		return &Growth{}
	}

	ranges := getSectorRanges(sector)

	growth := &Growth{
		RevenueGrowthYoY: SectorMetric{
			Value:        r.RevenueGrowthYoY,
			SectorMin:    ranges.RevenueGrowth.Min,
			SectorMedian: ranges.RevenueGrowth.Median,
			SectorMax:    ranges.RevenueGrowth.Max,
			Percentile:   calculatePercentile(r.RevenueGrowthYoY, ranges.RevenueGrowth.Min, ranges.RevenueGrowth.Max),
		},
		EPSGrowthYoY: SectorMetric{
			Value:        r.EPSGrowthYoY,
			SectorMin:    ranges.EPSGrowth.Min,
			SectorMedian: ranges.EPSGrowth.Median,
			SectorMax:    ranges.EPSGrowth.Max,
			Percentile:   calculatePercentile(r.EPSGrowthYoY, ranges.EPSGrowth.Min, ranges.EPSGrowth.Max),
		},
	}

	// Add projected EPS growth if estimates available
	if r.EPSEstimateCurrent > 0 && r.EPSEstimateNext > 0 {
		projectedGrowth := ((r.EPSEstimateNext - r.EPSEstimateCurrent) / r.EPSEstimateCurrent) * 100
		growth.ProjectedEPSGrowth = &SectorMetric{
			Value:        projectedGrowth,
			SectorMin:    ranges.EPSGrowth.Min,
			SectorMedian: ranges.EPSGrowth.Median,
			SectorMax:    ranges.EPSGrowth.Max,
			Percentile:   calculatePercentile(projectedGrowth, ranges.EPSGrowth.Min, ranges.EPSGrowth.Max),
		}
	}

	// Add FCF TTM if available (convert to millions for display)
	if r.FreeCashFlowTTM != 0 {
		fcfMillions := r.FreeCashFlowTTM / 1000000
		growth.FreeCashFlowTTM = &SectorMetric{
			Value:        fcfMillions,
			SectorMin:    ranges.FCF.Min,
			SectorMedian: ranges.FCF.Median,
			SectorMax:    ranges.FCF.Max,
			Percentile:   calculatePercentile(fcfMillions, ranges.FCF.Min, ranges.FCF.Max),
		}
	}

	// Add cash flow growth if available
	if r.CashFlowGrowthYoY != 0 {
		growth.CashFlowGrowthYoY = &SectorMetric{
			Value:        r.CashFlowGrowthYoY,
			SectorMin:    ranges.CashFlowGrowth.Min,
			SectorMedian: ranges.CashFlowGrowth.Median,
			SectorMax:    ranges.CashFlowGrowth.Max,
			Percentile:   calculatePercentile(r.CashFlowGrowthYoY, ranges.CashFlowGrowth.Min, ranges.CashFlowGrowth.Max),
		}
	}

	return growth
}

func calculateEarningsQualityFromRatios(r *models.Ratios, sector string) *EarningsQuality {
	if r == nil {
		return &EarningsQuality{}
	}

	ranges := getSectorRanges(sector)

	eq := &EarningsQuality{
		AccrualRatio: SectorMetric{
			Value:        0, // Would need to calculate from financials
			SectorMin:    -20,
			SectorMedian: 0,
			SectorMax:    20,
			Percentile:   50,
		},
		BuybackYield: SectorMetric{
			Value:        0, // Would need to calculate from buyback data
			SectorMin:    0,
			SectorMedian: 2,
			SectorMax:    10,
			Percentile:   50,
		},
	}

	// Add Revenue per Employee if available
	if r.RevenuePerEmployee > 0 {
		eq.RevenuePerEmployee = &SectorMetric{
			Value:        r.RevenuePerEmployee,
			SectorMin:    ranges.RevenuePerEmployee.Min,
			SectorMedian: ranges.RevenuePerEmployee.Median,
			SectorMax:    ranges.RevenuePerEmployee.Max,
			Percentile:   calculatePercentile(r.RevenuePerEmployee, ranges.RevenuePerEmployee.Min, ranges.RevenuePerEmployee.Max),
		}
	}

	// Add Income per Employee if available
	if r.IncomePerEmployee > 0 {
		eq.IncomePerEmployee = &SectorMetric{
			Value:        r.IncomePerEmployee,
			SectorMin:    ranges.IncomePerEmployee.Min,
			SectorMedian: ranges.IncomePerEmployee.Median,
			SectorMax:    ranges.IncomePerEmployee.Max,
			Percentile:   calculatePercentile(r.IncomePerEmployee, ranges.IncomePerEmployee.Min, ranges.IncomePerEmployee.Max),
		}
	}

	return eq
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
	// Valuation metrics (lower is better)
	PE          metricRange
	PEG         metricRange
	EVToEBITDA  metricRange
	PriceToFCF  metricRange
	PriceToBook metricRange
	// Profitability metrics
	ROIC               metricRange
	ROE                metricRange
	OperatingMargin    metricRange
	GrossMargin        metricRange
	NetMargin          metricRange
	DebtToEquity       metricRange
	CurrentRatio       metricRange
	AssetTurnover      metricRange
	RevenueGrowth      metricRange
	EPSGrowth          metricRange
	FCF                metricRange
	CashFlowGrowth     metricRange
	RevenuePerEmployee metricRange
	IncomePerEmployee  metricRange
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
		PE: metricRange{10, 28, 60}, PEG: metricRange{0.5, 1.8, 4}, EVToEBITDA: metricRange{8, 18, 40}, PriceToFCF: metricRange{10, 25, 60}, PriceToBook: metricRange{2, 6, 15},
		ROIC: metricRange{5, 15, 40}, ROE: metricRange{10, 25, 50}, OperatingMargin: metricRange{10, 20, 40},
		GrossMargin: metricRange{40, 60, 85}, NetMargin: metricRange{5, 15, 30},
		DebtToEquity: metricRange{0, 0.4, 1.5}, CurrentRatio: metricRange{1, 2, 4}, AssetTurnover: metricRange{0.3, 0.6, 1.2},
		RevenueGrowth: metricRange{-5, 15, 50}, EPSGrowth: metricRange{-10, 20, 80}, FCF: metricRange{0, 5000, 50000},
		CashFlowGrowth: metricRange{-20, 15, 60}, RevenuePerEmployee: metricRange{200000, 500000, 1500000}, IncomePerEmployee: metricRange{20000, 80000, 300000},
	},
	"Healthcare": {
		PE: metricRange{8, 22, 50}, PEG: metricRange{0.4, 1.6, 3.5}, EVToEBITDA: metricRange{6, 14, 35}, PriceToFCF: metricRange{8, 20, 50}, PriceToBook: metricRange{1.5, 4, 12},
		ROIC: metricRange{3, 12, 30}, ROE: metricRange{8, 18, 40}, OperatingMargin: metricRange{5, 15, 30},
		GrossMargin: metricRange{30, 55, 80}, NetMargin: metricRange{2, 12, 25},
		DebtToEquity: metricRange{0, 0.5, 1.8}, CurrentRatio: metricRange{1, 1.8, 3.5}, AssetTurnover: metricRange{0.3, 0.5, 1.0},
		RevenueGrowth: metricRange{-3, 10, 40}, EPSGrowth: metricRange{-15, 15, 60}, FCF: metricRange{0, 3000, 30000},
		CashFlowGrowth: metricRange{-25, 12, 50}, RevenuePerEmployee: metricRange{150000, 350000, 800000}, IncomePerEmployee: metricRange{15000, 50000, 150000},
	},
	"Financial Services": {
		PE: metricRange{6, 14, 25}, PEG: metricRange{0.3, 1.2, 2.5}, EVToEBITDA: metricRange{4, 10, 20}, PriceToFCF: metricRange{5, 12, 25}, PriceToBook: metricRange{0.5, 1.5, 3},
		ROIC: metricRange{2, 8, 18}, ROE: metricRange{8, 12, 20}, OperatingMargin: metricRange{15, 30, 50},
		GrossMargin: metricRange{50, 70, 90}, NetMargin: metricRange{10, 22, 40},
		DebtToEquity: metricRange{0.5, 2, 8}, CurrentRatio: metricRange{0.8, 1.2, 2}, AssetTurnover: metricRange{0.02, 0.05, 0.1},
		RevenueGrowth: metricRange{-5, 8, 25}, EPSGrowth: metricRange{-10, 10, 35}, FCF: metricRange{0, 8000, 80000},
		CashFlowGrowth: metricRange{-30, 10, 45}, RevenuePerEmployee: metricRange{300000, 600000, 2000000}, IncomePerEmployee: metricRange{80000, 150000, 500000},
	},
	"Consumer Cyclical": {
		PE: metricRange{8, 18, 40}, PEG: metricRange{0.4, 1.4, 3}, EVToEBITDA: metricRange{5, 12, 28}, PriceToFCF: metricRange{8, 18, 45}, PriceToBook: metricRange{1.5, 4, 10},
		ROIC: metricRange{4, 12, 28}, ROE: metricRange{10, 20, 40}, OperatingMargin: metricRange{5, 12, 25},
		GrossMargin: metricRange{20, 35, 55}, NetMargin: metricRange{2, 8, 18},
		DebtToEquity: metricRange{0.2, 0.8, 2}, CurrentRatio: metricRange{1, 1.5, 3}, AssetTurnover: metricRange{0.8, 1.5, 2.5},
		RevenueGrowth: metricRange{-8, 10, 35}, EPSGrowth: metricRange{-15, 12, 50}, FCF: metricRange{0, 2000, 20000},
		CashFlowGrowth: metricRange{-25, 10, 45}, RevenuePerEmployee: metricRange{100000, 250000, 600000}, IncomePerEmployee: metricRange{10000, 30000, 100000},
	},
	"Consumer Defensive": {
		PE: metricRange{10, 20, 35}, PEG: metricRange{1, 2.2, 4}, EVToEBITDA: metricRange{8, 14, 25}, PriceToFCF: metricRange{12, 22, 45}, PriceToBook: metricRange{2, 5, 12},
		ROIC: metricRange{5, 14, 30}, ROE: metricRange{12, 22, 45}, OperatingMargin: metricRange{8, 15, 28},
		GrossMargin: metricRange{25, 40, 60}, NetMargin: metricRange{4, 10, 20},
		DebtToEquity: metricRange{0.2, 0.6, 1.5}, CurrentRatio: metricRange{0.8, 1.2, 2}, AssetTurnover: metricRange{0.8, 1.2, 2.0},
		RevenueGrowth: metricRange{-3, 5, 20}, EPSGrowth: metricRange{-8, 8, 30}, FCF: metricRange{0, 4000, 40000},
		CashFlowGrowth: metricRange{-15, 8, 35}, RevenuePerEmployee: metricRange{150000, 350000, 800000}, IncomePerEmployee: metricRange{20000, 50000, 120000},
	},
	"Industrials": {
		PE: metricRange{10, 20, 40}, PEG: metricRange{0.5, 1.5, 3}, EVToEBITDA: metricRange{6, 12, 25}, PriceToFCF: metricRange{8, 18, 40}, PriceToBook: metricRange{1.5, 3.5, 8},
		ROIC: metricRange{4, 11, 25}, ROE: metricRange{10, 18, 35}, OperatingMargin: metricRange{6, 12, 22},
		GrossMargin: metricRange{20, 32, 50}, NetMargin: metricRange{3, 8, 16},
		DebtToEquity: metricRange{0.3, 0.8, 2}, CurrentRatio: metricRange{1, 1.5, 2.5}, AssetTurnover: metricRange{0.5, 0.9, 1.5},
		RevenueGrowth: metricRange{-5, 8, 25}, EPSGrowth: metricRange{-12, 12, 40}, FCF: metricRange{0, 3000, 30000},
		CashFlowGrowth: metricRange{-20, 10, 40}, RevenuePerEmployee: metricRange{150000, 300000, 700000}, IncomePerEmployee: metricRange{15000, 40000, 100000},
	},
	"Energy": {
		PE: metricRange{5, 12, 25}, PEG: metricRange{0.3, 1.0, 2.5}, EVToEBITDA: metricRange{3, 6, 15}, PriceToFCF: metricRange{4, 10, 25}, PriceToBook: metricRange{0.8, 1.8, 4},
		ROIC: metricRange{2, 8, 20}, ROE: metricRange{5, 15, 30}, OperatingMargin: metricRange{5, 15, 35},
		GrossMargin: metricRange{15, 30, 55}, NetMargin: metricRange{2, 10, 25},
		DebtToEquity: metricRange{0.2, 0.5, 1.5}, CurrentRatio: metricRange{0.8, 1.2, 2}, AssetTurnover: metricRange{0.3, 0.6, 1.0},
		RevenueGrowth: metricRange{-20, 5, 40}, EPSGrowth: metricRange{-30, 10, 80}, FCF: metricRange{0, 5000, 50000},
		CashFlowGrowth: metricRange{-40, 8, 60}, RevenuePerEmployee: metricRange{500000, 1200000, 3000000}, IncomePerEmployee: metricRange{50000, 150000, 400000},
	},
	"Basic Materials": {
		PE: metricRange{6, 14, 30}, PEG: metricRange{0.3, 1.2, 2.5}, EVToEBITDA: metricRange{4, 8, 18}, PriceToFCF: metricRange{5, 12, 30}, PriceToBook: metricRange{0.8, 2, 5},
		ROIC: metricRange{3, 9, 20}, ROE: metricRange{8, 15, 28}, OperatingMargin: metricRange{8, 15, 28},
		GrossMargin: metricRange{15, 28, 45}, NetMargin: metricRange{3, 9, 18},
		DebtToEquity: metricRange{0.2, 0.5, 1.5}, CurrentRatio: metricRange{1, 1.8, 3}, AssetTurnover: metricRange{0.4, 0.7, 1.2},
		RevenueGrowth: metricRange{-15, 5, 30}, EPSGrowth: metricRange{-25, 8, 50}, FCF: metricRange{0, 2000, 20000},
		CashFlowGrowth: metricRange{-30, 8, 50}, RevenuePerEmployee: metricRange{300000, 600000, 1500000}, IncomePerEmployee: metricRange{30000, 70000, 200000},
	},
	"Utilities": {
		PE: metricRange{10, 18, 30}, PEG: metricRange{1.5, 2.5, 4.5}, EVToEBITDA: metricRange{8, 12, 20}, PriceToFCF: metricRange{8, 15, 30}, PriceToBook: metricRange{1, 2, 3.5},
		ROIC: metricRange{2, 5, 10}, ROE: metricRange{6, 10, 15}, OperatingMargin: metricRange{15, 25, 40},
		GrossMargin: metricRange{30, 45, 65}, NetMargin: metricRange{5, 12, 22},
		DebtToEquity: metricRange{0.8, 1.2, 2.5}, CurrentRatio: metricRange{0.6, 0.9, 1.5}, AssetTurnover: metricRange{0.2, 0.3, 0.5},
		RevenueGrowth: metricRange{-3, 4, 15}, EPSGrowth: metricRange{-8, 5, 20}, FCF: metricRange{0, 2000, 15000},
		CashFlowGrowth: metricRange{-15, 5, 25}, RevenuePerEmployee: metricRange{400000, 800000, 1800000}, IncomePerEmployee: metricRange{50000, 100000, 250000},
	},
	"Real Estate": {
		PE: metricRange{15, 35, 70}, PEG: metricRange{1, 2, 4}, EVToEBITDA: metricRange{10, 18, 35}, PriceToFCF: metricRange{12, 25, 50}, PriceToBook: metricRange{1, 2.5, 5},
		ROIC: metricRange{2, 5, 12}, ROE: metricRange{4, 8, 15}, OperatingMargin: metricRange{20, 35, 55},
		GrossMargin: metricRange{40, 60, 80}, NetMargin: metricRange{10, 25, 45},
		DebtToEquity: metricRange{0.5, 1, 2.5}, CurrentRatio: metricRange{0.5, 1, 2}, AssetTurnover: metricRange{0.05, 0.1, 0.2},
		RevenueGrowth: metricRange{-5, 5, 20}, EPSGrowth: metricRange{-10, 5, 25}, FCF: metricRange{0, 500, 5000},
		CashFlowGrowth: metricRange{-20, 5, 30}, RevenuePerEmployee: metricRange{200000, 500000, 1500000}, IncomePerEmployee: metricRange{30000, 100000, 400000},
	},
	"Communication Services": {
		PE: metricRange{8, 18, 40}, PEG: metricRange{0.4, 1.3, 3}, EVToEBITDA: metricRange{5, 10, 22}, PriceToFCF: metricRange{6, 15, 35}, PriceToBook: metricRange{1.2, 3, 8},
		ROIC: metricRange{4, 10, 22}, ROE: metricRange{8, 16, 32}, OperatingMargin: metricRange{10, 20, 35},
		GrossMargin: metricRange{35, 55, 75}, NetMargin: metricRange{5, 15, 28},
		DebtToEquity: metricRange{0.3, 0.8, 2}, CurrentRatio: metricRange{0.8, 1.3, 2.5}, AssetTurnover: metricRange{0.3, 0.5, 0.9},
		RevenueGrowth: metricRange{-5, 10, 35}, EPSGrowth: metricRange{-15, 15, 50}, FCF: metricRange{0, 5000, 50000},
		CashFlowGrowth: metricRange{-20, 12, 45}, RevenuePerEmployee: metricRange{300000, 700000, 2000000}, IncomePerEmployee: metricRange{40000, 120000, 400000},
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

	g1.Go(func() error {
		technicalMetrics, err := s.legacyRepo.GetTechnicalMetrics(ctx1, ticker)
		if err != nil {
			slog.Warn("failed to fetch technical metrics", "ticker", ticker, "error", err)
			data.technicalMetrics = &TechnicalMetrics{}
		} else {
			data.technicalMetrics = technicalMetrics
		}
		return nil
	})

	g1.Go(func() error {
		shortInterest, err := s.legacyRepo.GetShortInterest(ctx1, ticker)
		if err != nil {
			slog.Warn("failed to fetch short interest", "ticker", ticker, "error", err)
			data.shortInterest = &ShortInterest{}
		} else {
			data.shortInterest = shortInterest
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
		AssetType:        AssetTypeStock,
		Company:          *data.company,
		Quote:            *data.quote,
		Performance:      *data.performance,
		Scores:           &stockScores,
		Signals:          signalList,
		Valuation:        data.valuation,
		Holdings:         data.holdings,
		InsiderTrades:    data.insiderTrades,
		InsiderActivity:  data.insiderActivity,
		Financials:       data.financials,
		Profitability:    data.profitability,
		FinancialHealth:  data.financialHealth,
		Growth:           data.growth,
		EarningsQuality:  data.earningsQuality,
		TechnicalMetrics: data.technicalMetrics,
		ShortInterest:    data.shortInterest,
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

// convertFinancialsForSignals converts *Financials to *signals.FinancialsData.
func convertFinancialsForSignals(f *Financials) *signals.FinancialsData {
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

// convertToScoreData converts provider financials to score calculation format.
func convertToScoreData(financials []models.Financials, price float64, marketCap int64) []scores.FinancialData {
	result := make([]scores.FinancialData, 0, len(financials))

	for _, f := range financials {
		result = append(result, scores.FinancialData{
			Revenue:            float64(f.Revenue),
			GrossProfit:        float64(f.GrossProfit),
			OperatingIncome:    float64(f.OperatingIncome),
			NetIncome:          float64(f.NetIncome),
			EBIT:               float64(f.OperatingIncome), // Use operating income as EBIT proxy
			EPS:                f.EPS,
			TotalAssets:        float64(f.TotalAssets),
			TotalLiabilities:   float64(f.TotalLiabilities),
			CurrentAssets:      float64(f.Cash), // Simplified
			CurrentLiabilities: float64(f.Debt), // Simplified
			LongTermDebt:       float64(f.Debt),
			ShareholdersEquity: float64(f.TotalEquity),
			OperatingCashFlow:  float64(f.OperatingCashFlow),
			FreeCashFlow:       float64(f.FreeCashFlow),
			MarketCap:          float64(marketCap),
			StockPrice:         price,
			FiscalYear:         f.FiscalYear,
		})
	}

	return result
}

// calculateScoresFromData calculates all financial scores from the data.
func (s *Service) calculateScoresFromData(data []scores.FinancialData, dcf *models.DCF, quotePrice float64) Scores {
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
		// Use quote price if DCF endpoint doesn't provide stock price
		currentPrice := dcf.StockPrice
		if currentPrice == 0 {
			currentPrice = quotePrice
		}
		diffPercent := 0.0
		if currentPrice > 0 {
			diffPercent = ((dcf.DCFValue - currentPrice) / currentPrice) * 100
		}
		assessment := "Fairly Valued"
		if diffPercent > 15 {
			assessment = "Undervalued"
		} else if diffPercent < -15 {
			assessment = "Overvalued"
		}
		dcfValuation = DCFValuation{
			IntrinsicValue:    dcf.DCFValue,
			CurrentPrice:      currentPrice,
			DifferencePercent: diffPercent,
			Assessment:        assessment,
		}
	}

	return Scores{
		Piotroski:    piotroskiResult,
		RuleOf40:     ruleOf40Result,
		AltmanZ:      altmanZResult,
		DCFValuation: dcfValuation,
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
