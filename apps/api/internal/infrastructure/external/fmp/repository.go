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

// GetValuation retrieves valuation metrics.
func (r *Repository) GetValuation(ctx context.Context, ticker string) (*stock.Valuation, error) {
	ratios, err := r.client.GetRatios(ctx, ticker, 1)
	if err != nil {
		return nil, fmt.Errorf("fetching ratios: %w", err)
	}

	valuation := &stock.Valuation{}

	if len(ratios) > 0 {
		ratio := ratios[0]

		if ratio.PriceToEarningsRatio != 0 {
			pe := ratio.PriceToEarningsRatio
			valuation.PE = stock.ValuationMetric{Value: &pe}
		}

		if ratio.PriceToEarningsGrowthRatio != 0 {
			peg := ratio.PriceToEarningsGrowthRatio
			valuation.PEG = stock.ValuationMetric{Value: &peg}
		}

		if ratio.EnterpriseValueMultiple != 0 {
			evEbitda := ratio.EnterpriseValueMultiple
			valuation.EVToEBITDA = stock.ValuationMetric{Value: &evEbitda}
		}

		if ratio.PriceToFreeCashFlowRatio != 0 {
			priceFcf := ratio.PriceToFreeCashFlowRatio
			valuation.PriceToFCF = stock.ValuationMetric{Value: &priceFcf}
		}

		if ratio.PriceToBookRatio != 0 {
			priceBook := ratio.PriceToBookRatio
			valuation.PriceToBook = stock.ValuationMetric{Value: &priceBook}
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
	// For MVP, return empty - would need FMP premium for this
	return []stock.InsiderTrade{}, nil
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
