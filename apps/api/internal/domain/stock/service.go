package stock

import (
	"context"
	"errors"
	"fmt"
	"time"

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
	GetHoldings(ctx context.Context, ticker string) (*Holdings, error)
	GetInsiderTrades(ctx context.Context, ticker string, limit int) ([]InsiderTrade, error)
	GetPerformance(ctx context.Context, ticker string, currentPrice, yearHigh float64) (*Performance, error)
	GetInsiderActivity(ctx context.Context, ticker string) (*InsiderActivity, error)
	Search(ctx context.Context, query string, limit int) ([]SearchResult, error)
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
	Company         Company          `json:"company"`
	Quote           Quote            `json:"quote"`
	Performance     Performance      `json:"performance"`
	Scores          Scores           `json:"scores"`
	Signals         []signals.Signal `json:"signals"`
	Valuation       Valuation        `json:"valuation"`
	Holdings        Holdings         `json:"holdings"`
	InsiderTrades   []InsiderTrade   `json:"insiderTrades"`
	InsiderActivity InsiderActivity  `json:"insiderActivity"`
	Financials      Financials       `json:"financials"`
	Meta            DataMeta         `json:"meta"`
}

// Scores contains all computed scores.
type Scores struct {
	Piotroski    scores.PiotroskiResult `json:"piotroski"`
	RuleOf40     scores.RuleOf40Result  `json:"ruleOf40"`
	AltmanZ      scores.AltmanZResult   `json:"altmanZ"`
	OverallGrade string                 `json:"overallGrade"`
}

// GetStockDetail retrieves comprehensive stock data for a ticker.
func (s *Service) GetStockDetail(ctx context.Context, ticker string) (*StockDetailResponse, error) {
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

	financials, err := s.repo.GetFinancials(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching financials for %s: %w", ticker, err)
	}

	valuation, err := s.repo.GetValuation(ctx, ticker, company.Sector)
	if err != nil {
		return nil, fmt.Errorf("fetching valuation for %s: %w", ticker, err)
	}

	holdings, err := s.repo.GetHoldings(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching holdings for %s: %w", ticker, err)
	}

	// Get insider trades (non-fatal if unavailable on free tier)
	insiderTrades, err := s.repo.GetInsiderTrades(ctx, ticker, 10)
	if err != nil {
		insiderTrades = []InsiderTrade{} // Continue without insider data
	}

	// Get performance metrics from historical prices
	performance, err := s.repo.GetPerformance(ctx, ticker, quote.Price, quote.FiftyTwoWeekHigh)
	if err != nil {
		return nil, fmt.Errorf("fetching performance for %s: %w", ticker, err)
	}

	// Get aggregated insider activity (non-fatal if unavailable on free tier)
	insiderActivity, err := s.repo.GetInsiderActivity(ctx, ticker)
	if err != nil {
		insiderActivity = &InsiderActivity{Trades: []InsiderTrade{}}
	}

	// Get financial data for score calculations (current + previous year)
	financialData, err := s.repo.GetFinancialData(ctx, ticker, 2)
	if err != nil {
		return nil, fmt.Errorf("fetching financial data for %s: %w", ticker, err)
	}

	// Calculate scores
	stockScores := s.calculateScores(financialData)

	// Generate signals
	signalList := s.generateSignals(company, quote, financials, holdings, insiderTrades, stockScores)

	// Determine fundamentals date from financial data
	fundamentalsDate := "N/A"
	if len(financialData) > 0 && financialData[0].FiscalYear > 0 {
		fundamentalsDate = fmt.Sprintf("%d", financialData[0].FiscalYear)
	}

	return &StockDetailResponse{
		Company:         *company,
		Quote:           *quote,
		Performance:     *performance,
		Scores:          stockScores,
		Signals:         signalList,
		Valuation:       *valuation,
		Holdings:        *holdings,
		InsiderTrades:   insiderTrades,
		InsiderActivity: *insiderActivity,
		Financials:      *financials,
		Meta: DataMeta{
			FundamentalsAsOf: fundamentalsDate,
			HoldingsAsOf:     "N/A",
			PriceAsOf:        quote.AsOf.Format(time.RFC3339),
			GeneratedAt:      time.Now().UTC(),
		},
	}, nil
}

// calculateScores computes all financial scores from raw data.
func (s *Service) calculateScores(data []scores.FinancialData) Scores {
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

	return Scores{
		Piotroski:    piotroskiResult,
		RuleOf40:     ruleOf40Result,
		AltmanZ:      altmanZResult,
		OverallGrade: calculateOverallGrade(piotroskiResult, ruleOf40Result, altmanZResult),
	}
}

// generateSignals creates actionable signals from all available data.
func (s *Service) generateSignals(
	company *Company,
	quote *Quote,
	financials *Financials,
	holdings *Holdings,
	insiderTrades []InsiderTrade,
	stockScores Scores,
) []signals.Signal {
	generator := signals.NewGenerator()
	return generator.GenerateAll(company, quote, financials, holdings, insiderTrades, stockScores.Piotroski, stockScores.AltmanZ)
}

// calculateOverallGrade determines a letter grade from all scores.
func calculateOverallGrade(p scores.PiotroskiResult, r scores.RuleOf40Result, a scores.AltmanZResult) string {
	points := 0

	// Piotroski contribution (0-9 -> 0-36 points)
	points += p.Score * 4

	// Rule of 40 contribution (0-20 points)
	if r.Passed {
		points += 20
	} else if r.Score >= 30 {
		points += 15
	} else if r.Score >= 20 {
		points += 10
	}

	// Altman Z contribution (0-24 points)
	switch a.Zone {
	case "safe":
		points += 24
	case "gray":
		points += 12
	case "distress":
		points += 0
	}

	// Total possible: 80 points
	switch {
	case points >= 70:
		return "A"
	case points >= 60:
		return "B+"
	case points >= 50:
		return "B"
	case points >= 35:
		return "C"
	case points >= 20:
		return "D"
	default:
		return "F"
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
