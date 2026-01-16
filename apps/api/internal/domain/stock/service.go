package stock

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/drewjst/recon/apps/api/internal/domain/scores"
	"github.com/drewjst/recon/apps/api/internal/domain/signals"
)

// ErrTickerNotFound is returned when a ticker doesn't exist.
var ErrTickerNotFound = errors.New("ticker not found")

// Repository defines the data access interface for stock data.
type Repository interface {
	GetCompany(ctx context.Context, ticker string) (*Company, error)
	GetQuote(ctx context.Context, ticker string) (*Quote, error)
	GetFinancials(ctx context.Context, ticker string) (*Financials, error)
	GetFinancialData(ctx context.Context, ticker string, periods int) ([]scores.FinancialData, error)
	GetValuation(ctx context.Context, ticker string, sector string) (*Valuation, error)
	GetEfficiency(ctx context.Context, ticker string, sector string, financials *Financials, valuation *Valuation) (*Efficiency, error)
	GetHoldings(ctx context.Context, ticker string) (*Holdings, error)
	GetInsiderTrades(ctx context.Context, ticker string, limit int) ([]InsiderTrade, error)
	GetPerformance(ctx context.Context, ticker string, currentPrice, yearHigh float64) (*Performance, error)
	GetInsiderActivity(ctx context.Context, ticker string) (*InsiderActivity, error)
	GetDCF(ctx context.Context, ticker string) (*DCFValuation, error)
	Search(ctx context.Context, query string, limit int) ([]SearchResult, error)
	IsETF(ctx context.Context, ticker string) (bool, error)
	GetETFData(ctx context.Context, ticker string) (*ETFData, error)
}

// Cache defines the caching interface.
type Cache interface {
	Get(ctx context.Context, key string, dest any) error
	Set(ctx context.Context, key string, value any, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

// Service orchestrates stock data fetching and score calculations.
type Service struct {
	repo  Repository
	cache Cache
}

// NewService creates a new stock service with the given dependencies.
func NewService(repo Repository, cache Cache) *Service {
	return &Service{
		repo:  repo,
		cache: cache,
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
	Efficiency      *Efficiency      `json:"efficiency,omitempty"`
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
	efficiency      *Efficiency
	holdings        *Holdings
	insiderTrades   []InsiderTrade
	performance     *Performance
	insiderActivity *InsiderActivity
	financialData   []scores.FinancialData
	dcfValuation    *DCFValuation
}

// GetStockDetail retrieves comprehensive stock data for a ticker.
func (s *Service) GetStockDetail(ctx context.Context, ticker string) (*StockDetailResponse, error) {
	// Check if ticker is an ETF - log errors but don't fail
	isETF, err := s.repo.IsETF(ctx, ticker)
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
	company, err := s.repo.GetCompany(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching company for %s: %w", ticker, err)
	}
	if company == nil {
		return nil, ErrTickerNotFound
	}

	quote, err := s.repo.GetQuote(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching quote for %s: %w", ticker, err)
	}

	performance, err := s.repo.GetPerformance(ctx, ticker, quote.Price, quote.FiftyTwoWeekHigh)
	if err != nil {
		return nil, fmt.Errorf("fetching performance for %s: %w", ticker, err)
	}

	etfData, err := s.repo.GetETFData(ctx, ticker)
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

// getStockDetail retrieves comprehensive stock data for a ticker.
func (s *Service) getStockDetail(ctx context.Context, ticker string) (*StockDetailResponse, error) {
	// Fetch all data in parallel
	data, err := s.fetchAllStockData(ctx, ticker)
	if err != nil {
		return nil, err
	}

	// Calculate scores and generate signals
	stockScores, signalList := s.analyzeStock(data)

	// Build and return the response
	return s.buildStockResponse(data, stockScores, signalList), nil
}

// fetchAllStockData fetches all required data for a stock in parallel.
func (s *Service) fetchAllStockData(ctx context.Context, ticker string) (*stockData, error) {
	data := &stockData{}

	// Phase 1: Fetch company and quote first (needed for dependent calls)
	g1, ctx1 := errgroup.WithContext(ctx)

	g1.Go(func() error {
		company, err := s.repo.GetCompany(ctx1, ticker)
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
		quote, err := s.repo.GetQuote(ctx1, ticker)
		if err != nil {
			return fmt.Errorf("fetching quote for %s: %w", ticker, err)
		}
		data.quote = quote
		return nil
	})

	// Also fetch independent data in phase 1
	g1.Go(func() error {
		holdings, err := s.repo.GetHoldings(ctx1, ticker)
		if err != nil {
			return fmt.Errorf("fetching holdings for %s: %w", ticker, err)
		}
		data.holdings = holdings
		return nil
	})

	g1.Go(func() error {
		financialData, err := s.repo.GetFinancialData(ctx1, ticker, 2)
		if err != nil {
			return fmt.Errorf("fetching financial data for %s: %w", ticker, err)
		}
		data.financialData = financialData
		return nil
	})

	// Non-fatal fetches in phase 1
	g1.Go(func() error {
		insiderTrades, err := s.repo.GetInsiderTrades(ctx1, ticker, 10)
		if err != nil {
			slog.Warn("failed to fetch insider trades, continuing without",
				"ticker", ticker,
				"error", err,
			)
			data.insiderTrades = []InsiderTrade{}
		} else {
			data.insiderTrades = insiderTrades
		}
		return nil
	})

	g1.Go(func() error {
		insiderActivity, err := s.repo.GetInsiderActivity(ctx1, ticker)
		if err != nil {
			slog.Warn("failed to fetch insider activity, continuing without",
				"ticker", ticker,
				"error", err,
			)
			data.insiderActivity = &InsiderActivity{Trades: []InsiderTrade{}}
		} else {
			data.insiderActivity = insiderActivity
		}
		return nil
	})

	g1.Go(func() error {
		dcfValuation, err := s.repo.GetDCF(ctx1, ticker)
		if err != nil {
			slog.Warn("failed to fetch DCF valuation, continuing without",
				"ticker", ticker,
				"error", err,
			)
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
		financials, err := s.repo.GetFinancials(ctx2, ticker)
		if err != nil {
			return fmt.Errorf("fetching financials for %s: %w", ticker, err)
		}
		data.financials = financials
		return nil
	})

	g2.Go(func() error {
		valuation, err := s.repo.GetValuation(ctx2, ticker, data.company.Sector)
		if err != nil {
			return fmt.Errorf("fetching valuation for %s: %w", ticker, err)
		}
		data.valuation = valuation
		return nil
	})

	g2.Go(func() error {
		performance, err := s.repo.GetPerformance(ctx2, ticker, data.quote.Price, data.quote.FiftyTwoWeekHigh)
		if err != nil {
			return fmt.Errorf("fetching performance for %s: %w", ticker, err)
		}
		data.performance = performance
		return nil
	})

	if err := g2.Wait(); err != nil {
		return nil, err
	}

	// Phase 3: Fetch efficiency (depends on financials and valuation)
	efficiency, err := s.repo.GetEfficiency(ctx, ticker, data.company.Sector, data.financials, data.valuation)
	if err != nil {
		return nil, fmt.Errorf("fetching efficiency for %s: %w", ticker, err)
	}
	data.efficiency = efficiency

	return data, nil
}

// analyzeStock calculates scores and generates signals from fetched data.
func (s *Service) analyzeStock(data *stockData) (Scores, []signals.Signal) {
	stockScores := s.calculateScores(data.financialData, data.dcfValuation)

	// Convert to signal-compatible types
	signalData := &signals.StockData{
		Financials:      convertFinancials(data.financials),
		InsiderActivity: convertInsiderActivity(data.insiderActivity),
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
		Efficiency:      data.efficiency,
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

// convertInsiderActivity converts stock.InsiderActivity to signals.InsiderActivityData.
func convertInsiderActivity(i *InsiderActivity) *signals.InsiderActivityData {
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
	results, err := s.repo.Search(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("searching for %s: %w", query, err)
	}
	return results, nil
}
