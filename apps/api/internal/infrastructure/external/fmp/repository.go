package fmp

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/drewjst/recon/apps/api/internal/domain/scores"
	"github.com/drewjst/recon/apps/api/internal/domain/stock"
)

// Repository implements stock.Repository using the FMP API directly.
type Repository struct {
	client *Client
}

// NewRepository creates a new FMP-backed repository.
func NewRepository(client *Client) *Repository {
	return &Repository{client: client}
}

// GetCompany retrieves company information from FMP.
func (r *Repository) GetCompany(ctx context.Context, ticker string) (*stock.Company, error) {
	profile, err := r.client.GetCompanyProfile(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching company profile: %w", err)
	}
	if profile == nil {
		return nil, nil
	}

	return &stock.Company{
		Ticker:      profile.Symbol,
		Name:        profile.CompanyName,
		Sector:      profile.Sector,
		Industry:    profile.Industry,
		Description: profile.Description,
	}, nil
}

// GetQuote retrieves real-time quote from FMP.
func (r *Repository) GetQuote(ctx context.Context, ticker string) (*stock.Quote, error) {
	quote, err := r.client.GetQuote(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching quote: %w", err)
	}
	if quote == nil {
		return nil, nil
	}

	return &stock.Quote{
		Price:            quote.Price,
		Change:           quote.Change,
		ChangePercent:    quote.ChangePercent,
		Volume:           int64(quote.Volume),
		MarketCap:        int64(quote.MarketCap),
		FiftyTwoWeekHigh: quote.YearHigh,
		FiftyTwoWeekLow:  quote.YearLow,
		AsOf:             time.Unix(quote.Timestamp, 0),
	}, nil
}

// GetFinancials retrieves financial metrics from FMP.
func (r *Repository) GetFinancials(ctx context.Context, ticker string) (*stock.Financials, error) {
	// Get income statements for margin calculations
	incomeStmts, err := r.client.GetIncomeStatement(ctx, ticker, 2)
	if err != nil {
		return nil, fmt.Errorf("fetching income statement: %w", err)
	}

	// Get balance sheet for ratios
	balanceSheets, err := r.client.GetBalanceSheet(ctx, ticker, 1)
	if err != nil {
		return nil, fmt.Errorf("fetching balance sheet: %w", err)
	}

	// Get cash flow for FCF margin
	cashFlows, err := r.client.GetCashFlowStatement(ctx, ticker, 1)
	if err != nil {
		return nil, fmt.Errorf("fetching cash flow: %w", err)
	}

	financials := &stock.Financials{}

	if len(incomeStmts) >= 1 {
		current := incomeStmts[0]
		if current.Revenue > 0 {
			financials.GrossMargin = (current.GrossProfit / current.Revenue) * 100
			financials.OperatingMargin = (current.OperatingIncome / current.Revenue) * 100
			financials.NetMargin = (current.NetIncome / current.Revenue) * 100
		}

		// Calculate YoY revenue growth if we have previous year
		if len(incomeStmts) >= 2 && incomeStmts[1].Revenue > 0 {
			financials.RevenueGrowthYoY = ((current.Revenue - incomeStmts[1].Revenue) / incomeStmts[1].Revenue) * 100
		}
	}

	if len(balanceSheets) >= 1 && len(incomeStmts) >= 1 {
		bs := balanceSheets[0]
		is := incomeStmts[0]

		if bs.TotalStockholdersEquity > 0 {
			financials.ROE = (is.NetIncome / bs.TotalStockholdersEquity) * 100
			financials.DebtToEquity = bs.TotalDebt / bs.TotalStockholdersEquity
		}

		if bs.TotalCurrentLiabilities > 0 {
			financials.CurrentRatio = bs.TotalCurrentAssets / bs.TotalCurrentLiabilities
		}

		// Calculate ROIC: NOPAT / Invested Capital
		if bs.TotalStockholdersEquity+bs.TotalDebt > 0 {
			nopat := is.OperatingIncome * 0.75 // Assume 25% tax rate
			investedCapital := bs.TotalStockholdersEquity + bs.TotalDebt
			financials.ROIC = (nopat / investedCapital) * 100
		}

		// Interest coverage
		if is.InterestExpense > 0 {
			coverage := is.OperatingIncome / is.InterestExpense
			financials.InterestCoverage = &coverage
		}
	}

	if len(cashFlows) >= 1 && len(incomeStmts) >= 1 && incomeStmts[0].Revenue > 0 {
		financials.FCFMargin = (cashFlows[0].FreeCashFlow / incomeStmts[0].Revenue) * 100
	}

	return financials, nil
}

// GetFinancialData retrieves raw financial data for score calculations.
func (r *Repository) GetFinancialData(ctx context.Context, ticker string, periods int) ([]scores.FinancialData, error) {
	incomeStmts, err := r.client.GetIncomeStatement(ctx, ticker, periods)
	if err != nil {
		return nil, fmt.Errorf("fetching income statements: %w", err)
	}

	balanceSheets, err := r.client.GetBalanceSheet(ctx, ticker, periods)
	if err != nil {
		return nil, fmt.Errorf("fetching balance sheets: %w", err)
	}

	cashFlows, err := r.client.GetCashFlowStatement(ctx, ticker, periods)
	if err != nil {
		return nil, fmt.Errorf("fetching cash flows: %w", err)
	}

	quote, err := r.client.GetQuote(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching quote: %w", err)
	}

	var result []scores.FinancialData

	minLen := min(len(incomeStmts), len(balanceSheets), len(cashFlows))
	for i := 0; i < minLen && i < periods; i++ {
		is := incomeStmts[i]
		bs := balanceSheets[i]
		cf := cashFlows[i]

		year, _ := parseYear(is.Date)

		fd := scores.FinancialData{
			// Income Statement
			Revenue:         is.Revenue,
			GrossProfit:     is.GrossProfit,
			OperatingIncome: is.OperatingIncome,
			NetIncome:       is.NetIncome,
			EBIT:            is.OperatingIncome,

			// Balance Sheet
			TotalAssets:        bs.TotalAssets,
			TotalLiabilities:   bs.TotalLiabilities,
			CurrentAssets:      bs.TotalCurrentAssets,
			CurrentLiabilities: bs.TotalCurrentLiabilities,
			LongTermDebt:       bs.LongTermDebt,
			ShareholdersEquity: bs.TotalStockholdersEquity,
			RetainedEarnings:   bs.RetainedEarnings,
			SharesOutstanding:  0, // Not available in stable API

			// Cash Flow
			OperatingCashFlow: cf.OperatingCashFlow,
			FreeCashFlow:      cf.FreeCashFlow,

			// Period Info
			FiscalYear: year,
		}

		// Add market data for current period
		if i == 0 && quote != nil {
			fd.MarketCap = quote.MarketCap
			fd.StockPrice = quote.Price
		}

		result = append(result, fd)
	}

	return result, nil
}

// sectorMedians contains typical valuation medians by sector.
// These are approximate values based on historical averages.
var sectorMedians = map[string]struct {
	PE         float64
	PEG        float64
	EVToEBITDA float64
	PriceToFCF float64
	PriceToBook float64
}{
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

// GetValuation retrieves valuation metrics using TTM data.
func (r *Repository) GetValuation(ctx context.Context, ticker string, sector string) (*stock.Valuation, error) {
	// Fetch TTM ratios
	ratiosTTM, err := r.client.GetRatiosTTM(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching TTM ratios: %w", err)
	}

	// Fetch TTM key metrics for EV/EBITDA
	metricsTTM, err := r.client.GetKeyMetricsTTM(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching TTM key metrics: %w", err)
	}

	valuation := &stock.Valuation{}

	// Get sector medians (with fallback to Technology)
	medians, ok := sectorMedians[sector]
	if !ok {
		medians = sectorMedians["Technology"]
	}

	// Helper to create a pointer
	ptr := func(v float64) *float64 { return &v }

	if len(ratiosTTM) > 0 {
		ratio := ratiosTTM[0]

		if ratio.PriceToEarningsRatioTTM > 0 {
			valuation.PE = stock.ValuationMetric{
				Value:        ptr(ratio.PriceToEarningsRatioTTM),
				SectorMedian: ptr(medians.PE),
			}
		}

		if ratio.PriceToEarningsGrowthRatioTTM > 0 {
			valuation.PEG = stock.ValuationMetric{
				Value:        ptr(ratio.PriceToEarningsGrowthRatioTTM),
				SectorMedian: ptr(medians.PEG),
			}
		}

		if ratio.PriceToFreeCashFlowRatioTTM > 0 {
			valuation.PriceToFCF = stock.ValuationMetric{
				Value:        ptr(ratio.PriceToFreeCashFlowRatioTTM),
				SectorMedian: ptr(medians.PriceToFCF),
			}
		}

		if ratio.PriceToBookRatioTTM > 0 {
			valuation.PriceToBook = stock.ValuationMetric{
				Value:        ptr(ratio.PriceToBookRatioTTM),
				SectorMedian: ptr(medians.PriceToBook),
			}
		}
	}

	if len(metricsTTM) > 0 {
		metrics := metricsTTM[0]

		if metrics.EVToEBITDATTM > 0 {
			valuation.EVToEBITDA = stock.ValuationMetric{
				Value:        ptr(metrics.EVToEBITDATTM),
				SectorMedian: ptr(medians.EVToEBITDA),
			}
		}
	}

	return valuation, nil
}

// GetHoldings retrieves institutional holdings data.
func (r *Repository) GetHoldings(ctx context.Context, ticker string) (*stock.Holdings, error) {
	// For MVP, return empty holdings - would need FMP premium for this
	return &stock.Holdings{
		TopInstitutional: []stock.InstitutionalHolder{},
	}, nil
}

// GetInsiderTrades retrieves insider trading data.
func (r *Repository) GetInsiderTrades(ctx context.Context, ticker string, limit int) ([]stock.InsiderTrade, error) {
	trades, err := r.client.GetInsiderTrades(ctx, ticker, limit)
	if err != nil {
		return nil, fmt.Errorf("fetching insider trades: %w", err)
	}

	var result []stock.InsiderTrade
	for _, t := range trades {
		tradeType := "sell"
		if t.TransactionType == "A" {
			tradeType = "buy"
		}
		result = append(result, stock.InsiderTrade{
			InsiderName: t.ReportingName,
			Title:       t.TypeOfOwner,
			TradeType:   tradeType,
			Shares:      t.SecuritiesTransacted,
			Price:       t.Price,
			Value:       int64(t.Value),
			TradeDate:   t.TransactionDate,
		})
	}

	return result, nil
}

// GetPerformance calculates performance metrics from historical prices.
func (r *Repository) GetPerformance(ctx context.Context, ticker string, currentPrice, yearHigh float64) (*stock.Performance, error) {
	// Get historical prices from 1 year ago
	fromDate := time.Now().AddDate(-1, 0, 0).Format("2006-01-02")
	prices, err := r.client.GetHistoricalPrices(ctx, ticker, fromDate)
	if err != nil {
		return nil, fmt.Errorf("fetching historical prices: %w", err)
	}

	perf := &stock.Performance{}

	if yearHigh > 0 {
		perf.PercentOf52High = (currentPrice / yearHigh) * 100
	}

	if len(prices) == 0 {
		return perf, nil
	}

	// Helper to find price N trading days ago
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

	// 1 day = index 1 (today is index 0)
	perf.Day1Change = getPriceChange(1)
	// 1 week ~ 5 trading days
	perf.Week1Change = getPriceChange(5)
	// 1 month ~ 21 trading days
	perf.Month1Change = getPriceChange(21)
	// 1 year ~ 252 trading days
	if len(prices) > 250 {
		perf.Year1Change = getPriceChange(252)
	}

	// YTD - find first trading day of current year
	currentYear := time.Now().Year()
	yearPrefix := fmt.Sprintf("%d-01-", currentYear)
	for i := len(prices) - 1; i >= 0; i-- {
		if strings.HasPrefix(prices[i].Date, yearPrefix) {
			oldPrice := prices[i].Close
			if oldPrice > 0 {
				perf.YTDChange = ((currentPrice - oldPrice) / oldPrice) * 100
			}
			break
		}
	}

	return perf, nil
}

// GetInsiderActivity aggregates insider trading activity.
func (r *Repository) GetInsiderActivity(ctx context.Context, ticker string) (*stock.InsiderActivity, error) {
	trades, err := r.client.GetInsiderTrades(ctx, ticker, 50)
	if err != nil {
		return nil, fmt.Errorf("fetching insider trades: %w", err)
	}

	activity := &stock.InsiderActivity{
		Trades: []stock.InsiderTrade{},
	}

	// Filter to last 90 days
	cutoffDate := time.Now().AddDate(0, 0, -90).Format("2006-01-02")

	for _, t := range trades {
		if t.TransactionDate < cutoffDate {
			continue
		}

		tradeType := "sell"
		if t.TransactionType == "A" {
			tradeType = "buy"
			activity.BuyCount90d++
			activity.NetValue90d += t.Value
		} else {
			activity.SellCount90d++
			activity.NetValue90d -= t.Value
		}

		activity.Trades = append(activity.Trades, stock.InsiderTrade{
			InsiderName: t.ReportingName,
			Title:       t.TypeOfOwner,
			TradeType:   tradeType,
			Shares:      t.SecuritiesTransacted,
			Price:       t.Price,
			Value:       int64(t.Value),
			TradeDate:   t.TransactionDate,
		})
	}

	return activity, nil
}

// Search finds tickers matching the query.
func (r *Repository) Search(ctx context.Context, query string, limit int) ([]stock.SearchResult, error) {
	results, err := r.client.SearchTicker(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("searching tickers: %w", err)
	}

	var stockResults []stock.SearchResult
	for _, r := range results {
		stockResults = append(stockResults, stock.SearchResult{
			Ticker:   r.Symbol,
			Name:     r.Name,
			Exchange: r.ExchangeShort,
		})
	}

	return stockResults, nil
}

// parseYear extracts the year from a date string like "2024-09-30"
func parseYear(date string) (int, error) {
	parts := strings.Split(date, "-")
	if len(parts) < 1 {
		return 0, fmt.Errorf("invalid date format: %s", date)
	}
	return strconv.Atoi(parts[0])
}

func min(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}
