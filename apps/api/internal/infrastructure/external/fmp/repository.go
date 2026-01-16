package fmp

import (
	"context"
	"fmt"
	"log/slog"
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
	PE          float64
	PEG         float64
	EVToEBITDA  float64
	PriceToFCF  float64
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

// efficiencyRange defines min, median, max for an efficiency metric within a sector.
type efficiencyRange struct {
	Min    float64
	Median float64
	Max    float64
}

// sectorEfficiencyRanges defines efficiency metric ranges for a single sector.
type sectorEfficiencyRanges struct {
	ROIC            efficiencyRange
	ROE             efficiencyRange
	OperatingMargin efficiencyRange
	FCFYield        efficiencyRange
	DebtToEquity    efficiencyRange
	CurrentRatio    efficiencyRange
}

// sectorEfficiency contains typical efficiency ranges by sector.
// ROIC/ROE/OperatingMargin/FCFYield are percentages, DebtToEquity/CurrentRatio are ratios.
var sectorEfficiency = map[string]sectorEfficiencyRanges{
	"Technology": {
		ROIC: efficiencyRange{5, 15, 40}, ROE: efficiencyRange{10, 25, 50},
		OperatingMargin: efficiencyRange{10, 20, 40}, FCFYield: efficiencyRange{1, 3, 8},
		DebtToEquity: efficiencyRange{0, 0.4, 1.5}, CurrentRatio: efficiencyRange{1, 2, 4},
	},
	"Healthcare": {
		ROIC: efficiencyRange{3, 12, 30}, ROE: efficiencyRange{8, 18, 40},
		OperatingMargin: efficiencyRange{5, 15, 30}, FCFYield: efficiencyRange{1, 2.5, 6},
		DebtToEquity: efficiencyRange{0, 0.5, 1.8}, CurrentRatio: efficiencyRange{1, 1.8, 3.5},
	},
	"Financial Services": {
		ROIC: efficiencyRange{2, 8, 18}, ROE: efficiencyRange{8, 12, 20},
		OperatingMargin: efficiencyRange{15, 30, 50}, FCFYield: efficiencyRange{2, 5, 12},
		DebtToEquity: efficiencyRange{0.5, 2, 8}, CurrentRatio: efficiencyRange{0.8, 1.2, 2},
	},
	"Consumer Cyclical": {
		ROIC: efficiencyRange{4, 12, 28}, ROE: efficiencyRange{10, 20, 40},
		OperatingMargin: efficiencyRange{5, 12, 25}, FCFYield: efficiencyRange{1, 3, 7},
		DebtToEquity: efficiencyRange{0.2, 0.8, 2}, CurrentRatio: efficiencyRange{1, 1.5, 3},
	},
	"Consumer Defensive": {
		ROIC: efficiencyRange{5, 14, 30}, ROE: efficiencyRange{12, 22, 45},
		OperatingMargin: efficiencyRange{8, 15, 28}, FCFYield: efficiencyRange{2, 4, 8},
		DebtToEquity: efficiencyRange{0.2, 0.6, 1.5}, CurrentRatio: efficiencyRange{0.8, 1.2, 2},
	},
	"Industrials": {
		ROIC: efficiencyRange{4, 11, 25}, ROE: efficiencyRange{10, 18, 35},
		OperatingMargin: efficiencyRange{6, 12, 22}, FCFYield: efficiencyRange{1.5, 3.5, 7},
		DebtToEquity: efficiencyRange{0.3, 0.8, 2}, CurrentRatio: efficiencyRange{1, 1.5, 2.5},
	},
	"Energy": {
		ROIC: efficiencyRange{2, 8, 20}, ROE: efficiencyRange{5, 15, 30},
		OperatingMargin: efficiencyRange{5, 15, 35}, FCFYield: efficiencyRange{3, 6, 15},
		DebtToEquity: efficiencyRange{0.2, 0.5, 1.5}, CurrentRatio: efficiencyRange{0.8, 1.2, 2},
	},
	"Basic Materials": {
		ROIC: efficiencyRange{3, 9, 20}, ROE: efficiencyRange{8, 15, 28},
		OperatingMargin: efficiencyRange{8, 15, 28}, FCFYield: efficiencyRange{2, 4, 10},
		DebtToEquity: efficiencyRange{0.2, 0.5, 1.5}, CurrentRatio: efficiencyRange{1, 1.8, 3},
	},
	"Utilities": {
		ROIC: efficiencyRange{2, 5, 10}, ROE: efficiencyRange{6, 10, 15},
		OperatingMargin: efficiencyRange{15, 25, 40}, FCFYield: efficiencyRange{2, 4, 8},
		DebtToEquity: efficiencyRange{0.8, 1.2, 2.5}, CurrentRatio: efficiencyRange{0.6, 0.9, 1.5},
	},
	"Real Estate": {
		ROIC: efficiencyRange{2, 5, 12}, ROE: efficiencyRange{4, 8, 15},
		OperatingMargin: efficiencyRange{20, 35, 55}, FCFYield: efficiencyRange{3, 5, 10},
		DebtToEquity: efficiencyRange{0.5, 1, 2.5}, CurrentRatio: efficiencyRange{0.5, 1, 2},
	},
	"Communication Services": {
		ROIC: efficiencyRange{4, 10, 22}, ROE: efficiencyRange{8, 16, 32},
		OperatingMargin: efficiencyRange{10, 20, 35}, FCFYield: efficiencyRange{2, 4, 9},
		DebtToEquity: efficiencyRange{0.3, 0.8, 2}, CurrentRatio: efficiencyRange{0.8, 1.3, 2.5},
	},
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

// calculatePercentile computes where a value falls in a range (0-100).
// For "higher is better" metrics (ROIC, FCFYield, InterestCoverage).
func calculatePercentile(value, min, max float64) int {
	if max <= min {
		return 50
	}
	// Clamp value to range
	if value <= min {
		return 0
	}
	if value >= max {
		return 100
	}
	pct := ((value - min) / (max - min)) * 100
	return int(pct)
}

// calculatePercentileInverted computes percentile for "lower is better" metrics (DebtToEquity).
func calculatePercentileInverted(value, min, max float64) int {
	if max <= min {
		return 50
	}
	// Clamp value to range
	if value <= min {
		return 100 // Lower is better, so being at min = 100th percentile
	}
	if value >= max {
		return 0
	}
	pct := ((max - value) / (max - min)) * 100
	return int(pct)
}

// GetEfficiency constructs efficiency metrics with sector context.
func (r *Repository) GetEfficiency(ctx context.Context, ticker string, sector string, financials *stock.Financials, valuation *stock.Valuation) (*stock.Efficiency, error) {
	// Get sector ranges (with fallback to Technology)
	ranges, ok := sectorEfficiency[sector]
	if !ok {
		ranges = sectorEfficiency["Technology"]
	}

	efficiency := &stock.Efficiency{}

	// ROIC - already in percentage form from financials
	roicValue := financials.ROIC
	efficiency.ROIC = stock.EfficiencyMetric{
		Value:        roicValue,
		SectorMin:    ranges.ROIC.Min,
		SectorMedian: ranges.ROIC.Median,
		SectorMax:    ranges.ROIC.Max,
		Percentile:   calculatePercentile(roicValue, ranges.ROIC.Min, ranges.ROIC.Max),
	}

	// ROE - already in percentage form from financials
	roeValue := financials.ROE
	efficiency.ROE = stock.EfficiencyMetric{
		Value:        roeValue,
		SectorMin:    ranges.ROE.Min,
		SectorMedian: ranges.ROE.Median,
		SectorMax:    ranges.ROE.Max,
		Percentile:   calculatePercentile(roeValue, ranges.ROE.Min, ranges.ROE.Max),
	}

	// Operating Margin - already in percentage form from financials
	opMarginValue := financials.OperatingMargin
	efficiency.OperatingMargin = stock.EfficiencyMetric{
		Value:        opMarginValue,
		SectorMin:    ranges.OperatingMargin.Min,
		SectorMedian: ranges.OperatingMargin.Median,
		SectorMax:    ranges.OperatingMargin.Max,
		Percentile:   calculatePercentile(opMarginValue, ranges.OperatingMargin.Min, ranges.OperatingMargin.Max),
	}

	// FCF Yield - calculated from Price/FCF (FCF Yield = 1 / P/FCF * 100)
	if valuation.PriceToFCF.Value != nil && *valuation.PriceToFCF.Value > 0 {
		fcfYield := (1 / *valuation.PriceToFCF.Value) * 100
		efficiency.FCFYield = &stock.EfficiencyMetric{
			Value:        fcfYield,
			SectorMin:    ranges.FCFYield.Min,
			SectorMedian: ranges.FCFYield.Median,
			SectorMax:    ranges.FCFYield.Max,
			Percentile:   calculatePercentile(fcfYield, ranges.FCFYield.Min, ranges.FCFYield.Max),
		}
	}

	// Debt/Equity - lower is better (inverted percentile)
	debtEquity := financials.DebtToEquity
	efficiency.DebtToEquity = stock.EfficiencyMetric{
		Value:        debtEquity,
		SectorMin:    ranges.DebtToEquity.Min,
		SectorMedian: ranges.DebtToEquity.Median,
		SectorMax:    ranges.DebtToEquity.Max,
		Percentile:   calculatePercentileInverted(debtEquity, ranges.DebtToEquity.Min, ranges.DebtToEquity.Max),
	}

	// Current Ratio - higher is better (good liquidity)
	currentRatio := financials.CurrentRatio
	efficiency.CurrentRatio = stock.EfficiencyMetric{
		Value:        currentRatio,
		SectorMin:    ranges.CurrentRatio.Min,
		SectorMedian: ranges.CurrentRatio.Median,
		SectorMax:    ranges.CurrentRatio.Max,
		Percentile:   calculatePercentile(currentRatio, ranges.CurrentRatio.Min, ranges.CurrentRatio.Max),
	}

	return efficiency, nil
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
		// Skip trades with no shares transacted (Form 3 initial filings, etc.)
		if t.SecuritiesTransacted == 0 {
			continue
		}

		tradeType := "sell"
		if t.AcquisitionOrDisp == "A" {
			tradeType = "buy"
		}

		// Calculate value from shares * price
		value := int64(float64(t.SecuritiesTransacted) * t.Price)

		result = append(result, stock.InsiderTrade{
			InsiderName: t.ReportingName,
			Title:       t.TypeOfOwner,
			TradeType:   tradeType,
			Shares:      t.SecuritiesTransacted,
			Price:       t.Price,
			Value:       value,
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
	activity := &stock.InsiderActivity{
		Trades: []stock.InsiderTrade{},
	}

	// Get quarterly statistics for summary counts
	stats, err := r.client.GetInsiderStatistics(ctx, ticker)
	if err == nil && len(stats) > 0 {
		// Sum the most recent 1-2 quarters to approximate 90 days
		// Skip current quarter if it has no activity yet
		for i, stat := range stats {
			if i >= 2 {
				break // Only look at 2 most recent quarters
			}
			// Skip if current quarter has no transactions yet
			if i == 0 && stat.AcquiredTransactions == 0 && stat.DisposedTransactions == 0 {
				continue
			}
			activity.BuyCount90d += stat.AcquiredTransactions
			activity.SellCount90d += stat.DisposedTransactions
		}
	}

	// Get recent trades for the list display
	trades, err := r.client.GetInsiderTrades(ctx, ticker, 50)
	if err != nil {
		// Return what we have from statistics
		return activity, nil
	}

	// Filter to last 90 days and build trade list
	cutoffDate := time.Now().AddDate(0, 0, -90).Format("2006-01-02")

	for _, t := range trades {
		if t.TransactionDate < cutoffDate {
			continue
		}

		// Skip trades with no shares transacted (Form 3 initial filings, etc.)
		if t.SecuritiesTransacted == 0 {
			continue
		}

		// Calculate value from shares * price (only meaningful for priced transactions)
		value := float64(t.SecuritiesTransacted) * t.Price

		tradeType := "sell"
		if t.AcquisitionOrDisp == "A" {
			tradeType = "buy"
			// Add to net value for buys with price
			if t.Price > 0 {
				activity.NetValue90d += value
			}
		} else {
			// Subtract from net value for sells with price
			if t.Price > 0 {
				activity.NetValue90d -= value
			}
		}

		activity.Trades = append(activity.Trades, stock.InsiderTrade{
			InsiderName: t.ReportingName,
			Title:       t.TypeOfOwner,
			TradeType:   tradeType,
			Shares:      t.SecuritiesTransacted,
			Price:       t.Price,
			Value:       int64(value),
			TradeDate:   t.TransactionDate,
		})
	}

	return activity, nil
}

// GetDCF retrieves and calculates DCF valuation assessment.
func (r *Repository) GetDCF(ctx context.Context, ticker string) (*stock.DCFValuation, error) {
	dcfData, err := r.client.GetDCF(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching DCF: %w", err)
	}
	if dcfData == nil {
		return nil, nil
	}

	// FMP DCF endpoint doesn't reliably return stock price, so fetch from quote
	currentPrice := dcfData.StockPrice
	if currentPrice == 0 {
		quote, err := r.client.GetQuote(ctx, ticker)
		if err == nil && quote != nil {
			currentPrice = quote.Price
		}
	}

	return calculateDCFAssessment(dcfData.DCF, currentPrice), nil
}

// calculateDCFAssessment determines valuation status based on DCF vs current price.
func calculateDCFAssessment(dcf, price float64) *stock.DCFValuation {
	if price == 0 {
		return &stock.DCFValuation{
			IntrinsicValue: dcf,
			Assessment:     "N/A",
		}
	}

	diff := ((dcf - price) / price) * 100

	assessment := "Fairly Valued"
	if diff > 15 {
		assessment = "Undervalued"
	} else if diff < -15 {
		assessment = "Overvalued"
	}

	return &stock.DCFValuation{
		IntrinsicValue:    dcf,
		CurrentPrice:      price,
		DifferencePercent: diff,
		Assessment:        assessment,
	}
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

// IsETF checks if a ticker is an ETF by attempting to fetch ETF info.
func (r *Repository) IsETF(ctx context.Context, ticker string) (bool, error) {
	info, err := r.client.GetETFInfo(ctx, ticker)
	if err != nil {
		// Return the error so caller can decide how to handle it
		return false, fmt.Errorf("checking if %s is ETF: %w", ticker, err)
	}
	return info != nil && info.ExpenseRatio > 0, nil
}

// GetETFData retrieves complete ETF data (info, holdings, sectors).
func (r *Repository) GetETFData(ctx context.Context, ticker string) (*stock.ETFData, error) {
	info, err := r.client.GetETFInfo(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching ETF info: %w", err)
	}
	if info == nil {
		return nil, fmt.Errorf("no ETF info found for %s", ticker)
	}

	// Fetch holdings (non-fatal if fails)
	holdings, err := r.client.GetETFHoldings(ctx, ticker)
	if err != nil {
		slog.Warn("failed to fetch ETF holdings, continuing without",
			"ticker", ticker,
			"error", err,
		)
	}

	// Fetch sector weightings (non-fatal if fails)
	sectors, err := r.client.GetETFSectorWeightings(ctx, ticker)
	if err != nil {
		slog.Warn("failed to fetch ETF sector weightings, continuing without",
			"ticker", ticker,
			"error", err,
		)
	}

	return &stock.ETFData{
		ExpenseRatio:  info.ExpenseRatio,
		AUM:           int64(info.AUM),
		InceptionDate: info.InceptionDate,
		Holdings:      mapETFHoldings(holdings),
		SectorWeights: mapSectorWeightings(sectors),
	}, nil
}

// mapETFHoldings transforms FMP ETF holdings to domain type.
func mapETFHoldings(holdings []ETFHolding) []stock.ETFHolding {
	if len(holdings) == 0 {
		return []stock.ETFHolding{}
	}

	// Limit to top 10 holdings
	limit := 10
	if len(holdings) < limit {
		limit = len(holdings)
	}

	result := make([]stock.ETFHolding, limit)
	for i := 0; i < limit; i++ {
		result[i] = stock.ETFHolding{
			Ticker:        holdings[i].Asset,
			Name:          holdings[i].Name,
			Shares:        holdings[i].Shares,
			WeightPercent: holdings[i].WeightPercentage,
			MarketValue:   int64(holdings[i].MarketValue),
		}
	}
	return result
}

// mapSectorWeightings transforms FMP sector weightings to domain type.
func mapSectorWeightings(sectors []ETFSectorWeighting) []stock.ETFSectorWeight {
	if len(sectors) == 0 {
		return []stock.ETFSectorWeight{}
	}

	result := make([]stock.ETFSectorWeight, len(sectors))
	for i, s := range sectors {
		// Parse weight from string (e.g., "28.50%" -> 28.50)
		weight, _ := strconv.ParseFloat(strings.TrimSuffix(s.WeightPercentage, "%"), 64)
		result[i] = stock.ETFSectorWeight{
			Sector:        s.Sector,
			WeightPercent: weight,
		}
	}
	return result
}
