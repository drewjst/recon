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
			EPS:             is.EPSDiluted,

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

// sectorMetricRanges defines metric ranges for a single sector.
type sectorMetricRanges struct {
	// Profitability
	ROIC            efficiencyRange
	ROE             efficiencyRange
	OperatingMargin efficiencyRange
	// Financial Health
	DebtToEquity  efficiencyRange
	CurrentRatio  efficiencyRange
	AssetTurnover efficiencyRange
	// Growth
	RevenueGrowth efficiencyRange
	EPSGrowth     efficiencyRange
	// Earnings Quality
	AccrualRatio efficiencyRange
	BuybackYield efficiencyRange
}

// sectorMetrics contains typical metric ranges by sector.
// Percentages: ROIC, ROE, OperatingMargin, RevenueGrowth, EPSGrowth, AccrualRatio, BuybackYield
// Ratios: DebtToEquity, CurrentRatio, AssetTurnover
var sectorMetrics = map[string]sectorMetricRanges{
	"Technology": {
		ROIC: efficiencyRange{5, 15, 40}, ROE: efficiencyRange{10, 25, 50}, OperatingMargin: efficiencyRange{10, 20, 40},
		DebtToEquity: efficiencyRange{0, 0.4, 1.5}, CurrentRatio: efficiencyRange{1, 2, 4}, AssetTurnover: efficiencyRange{0.3, 0.6, 1.2},
		RevenueGrowth: efficiencyRange{-5, 10, 40}, EPSGrowth: efficiencyRange{-10, 15, 50},
		AccrualRatio: efficiencyRange{-15, -5, 5}, BuybackYield: efficiencyRange{0, 1.5, 5},
	},
	"Healthcare": {
		ROIC: efficiencyRange{3, 12, 30}, ROE: efficiencyRange{8, 18, 40}, OperatingMargin: efficiencyRange{5, 15, 30},
		DebtToEquity: efficiencyRange{0, 0.5, 1.8}, CurrentRatio: efficiencyRange{1, 1.8, 3.5}, AssetTurnover: efficiencyRange{0.3, 0.5, 1.0},
		RevenueGrowth: efficiencyRange{-3, 8, 30}, EPSGrowth: efficiencyRange{-10, 12, 40},
		AccrualRatio: efficiencyRange{-12, -4, 6}, BuybackYield: efficiencyRange{0, 1, 4},
	},
	"Financial Services": {
		ROIC: efficiencyRange{2, 8, 18}, ROE: efficiencyRange{8, 12, 20}, OperatingMargin: efficiencyRange{15, 30, 50},
		DebtToEquity: efficiencyRange{0.5, 2, 8}, CurrentRatio: efficiencyRange{0.8, 1.2, 2}, AssetTurnover: efficiencyRange{0.02, 0.05, 0.1},
		RevenueGrowth: efficiencyRange{-5, 5, 20}, EPSGrowth: efficiencyRange{-15, 8, 25},
		AccrualRatio: efficiencyRange{-10, -2, 8}, BuybackYield: efficiencyRange{0, 2, 6},
	},
	"Consumer Cyclical": {
		ROIC: efficiencyRange{4, 12, 28}, ROE: efficiencyRange{10, 20, 40}, OperatingMargin: efficiencyRange{5, 12, 25},
		DebtToEquity: efficiencyRange{0.2, 0.8, 2}, CurrentRatio: efficiencyRange{1, 1.5, 3}, AssetTurnover: efficiencyRange{0.8, 1.5, 2.5},
		RevenueGrowth: efficiencyRange{-8, 7, 25}, EPSGrowth: efficiencyRange{-15, 10, 35},
		AccrualRatio: efficiencyRange{-10, -3, 5}, BuybackYield: efficiencyRange{0, 1.5, 5},
	},
	"Consumer Defensive": {
		ROIC: efficiencyRange{5, 14, 30}, ROE: efficiencyRange{12, 22, 45}, OperatingMargin: efficiencyRange{8, 15, 28},
		DebtToEquity: efficiencyRange{0.2, 0.6, 1.5}, CurrentRatio: efficiencyRange{0.8, 1.2, 2}, AssetTurnover: efficiencyRange{0.8, 1.2, 2.0},
		RevenueGrowth: efficiencyRange{-2, 4, 15}, EPSGrowth: efficiencyRange{-5, 6, 20},
		AccrualRatio: efficiencyRange{-8, -2, 4}, BuybackYield: efficiencyRange{0, 2, 5},
	},
	"Industrials": {
		ROIC: efficiencyRange{4, 11, 25}, ROE: efficiencyRange{10, 18, 35}, OperatingMargin: efficiencyRange{6, 12, 22},
		DebtToEquity: efficiencyRange{0.3, 0.8, 2}, CurrentRatio: efficiencyRange{1, 1.5, 2.5}, AssetTurnover: efficiencyRange{0.5, 0.9, 1.5},
		RevenueGrowth: efficiencyRange{-5, 6, 20}, EPSGrowth: efficiencyRange{-10, 8, 25},
		AccrualRatio: efficiencyRange{-10, -3, 5}, BuybackYield: efficiencyRange{0, 1.5, 4},
	},
	"Energy": {
		ROIC: efficiencyRange{2, 8, 20}, ROE: efficiencyRange{5, 15, 30}, OperatingMargin: efficiencyRange{5, 15, 35},
		DebtToEquity: efficiencyRange{0.2, 0.5, 1.5}, CurrentRatio: efficiencyRange{0.8, 1.2, 2}, AssetTurnover: efficiencyRange{0.3, 0.6, 1.0},
		RevenueGrowth: efficiencyRange{-20, 5, 40}, EPSGrowth: efficiencyRange{-30, 10, 60},
		AccrualRatio: efficiencyRange{-15, -5, 10}, BuybackYield: efficiencyRange{0, 2, 6},
	},
	"Basic Materials": {
		ROIC: efficiencyRange{3, 9, 20}, ROE: efficiencyRange{8, 15, 28}, OperatingMargin: efficiencyRange{8, 15, 28},
		DebtToEquity: efficiencyRange{0.2, 0.5, 1.5}, CurrentRatio: efficiencyRange{1, 1.8, 3}, AssetTurnover: efficiencyRange{0.4, 0.7, 1.2},
		RevenueGrowth: efficiencyRange{-10, 5, 25}, EPSGrowth: efficiencyRange{-20, 8, 40},
		AccrualRatio: efficiencyRange{-12, -4, 6}, BuybackYield: efficiencyRange{0, 1.5, 5},
	},
	"Utilities": {
		ROIC: efficiencyRange{2, 5, 10}, ROE: efficiencyRange{6, 10, 15}, OperatingMargin: efficiencyRange{15, 25, 40},
		DebtToEquity: efficiencyRange{0.8, 1.2, 2.5}, CurrentRatio: efficiencyRange{0.6, 0.9, 1.5}, AssetTurnover: efficiencyRange{0.2, 0.3, 0.5},
		RevenueGrowth: efficiencyRange{-2, 3, 10}, EPSGrowth: efficiencyRange{-5, 4, 12},
		AccrualRatio: efficiencyRange{-8, -2, 5}, BuybackYield: efficiencyRange{0, 0.5, 2},
	},
	"Real Estate": {
		ROIC: efficiencyRange{2, 5, 12}, ROE: efficiencyRange{4, 8, 15}, OperatingMargin: efficiencyRange{20, 35, 55},
		DebtToEquity: efficiencyRange{0.5, 1, 2.5}, CurrentRatio: efficiencyRange{0.5, 1, 2}, AssetTurnover: efficiencyRange{0.05, 0.1, 0.2},
		RevenueGrowth: efficiencyRange{-5, 5, 20}, EPSGrowth: efficiencyRange{-10, 5, 20},
		AccrualRatio: efficiencyRange{-10, -3, 8}, BuybackYield: efficiencyRange{0, 0.5, 2},
	},
	"Communication Services": {
		ROIC: efficiencyRange{4, 10, 22}, ROE: efficiencyRange{8, 16, 32}, OperatingMargin: efficiencyRange{10, 20, 35},
		DebtToEquity: efficiencyRange{0.3, 0.8, 2}, CurrentRatio: efficiencyRange{0.8, 1.3, 2.5}, AssetTurnover: efficiencyRange{0.3, 0.5, 0.9},
		RevenueGrowth: efficiencyRange{-5, 8, 30}, EPSGrowth: efficiencyRange{-10, 12, 40},
		AccrualRatio: efficiencyRange{-10, -3, 5}, BuybackYield: efficiencyRange{0, 1.5, 5},
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

// getSectorRanges returns sector metric ranges with fallback to Technology.
func getSectorRanges(sector string) sectorMetricRanges {
	ranges, ok := sectorMetrics[sector]
	if !ok {
		return sectorMetrics["Technology"]
	}
	return ranges
}

// GetProfitability constructs profitability metrics with sector context.
func (r *Repository) GetProfitability(ctx context.Context, sector string, financials *stock.Financials) (*stock.Profitability, error) {
	ranges := getSectorRanges(sector)

	return &stock.Profitability{
		ROIC: stock.SectorMetric{
			Value:        financials.ROIC,
			SectorMin:    ranges.ROIC.Min,
			SectorMedian: ranges.ROIC.Median,
			SectorMax:    ranges.ROIC.Max,
			Percentile:   calculatePercentile(financials.ROIC, ranges.ROIC.Min, ranges.ROIC.Max),
		},
		ROE: stock.SectorMetric{
			Value:        financials.ROE,
			SectorMin:    ranges.ROE.Min,
			SectorMedian: ranges.ROE.Median,
			SectorMax:    ranges.ROE.Max,
			Percentile:   calculatePercentile(financials.ROE, ranges.ROE.Min, ranges.ROE.Max),
		},
		OperatingMargin: stock.SectorMetric{
			Value:        financials.OperatingMargin,
			SectorMin:    ranges.OperatingMargin.Min,
			SectorMedian: ranges.OperatingMargin.Median,
			SectorMax:    ranges.OperatingMargin.Max,
			Percentile:   calculatePercentile(financials.OperatingMargin, ranges.OperatingMargin.Min, ranges.OperatingMargin.Max),
		},
	}, nil
}

// GetFinancialHealth constructs financial health metrics with sector context.
func (r *Repository) GetFinancialHealth(ctx context.Context, sector string, financials *stock.Financials, financialData []scores.FinancialData) (*stock.FinancialHealth, error) {
	ranges := getSectorRanges(sector)

	// Calculate Asset Turnover from financial data if available
	var assetTurnover float64
	if len(financialData) > 0 && financialData[0].TotalAssets > 0 {
		assetTurnover = financialData[0].Revenue / financialData[0].TotalAssets
	}

	return &stock.FinancialHealth{
		DebtToEquity: stock.SectorMetric{
			Value:        financials.DebtToEquity,
			SectorMin:    ranges.DebtToEquity.Min,
			SectorMedian: ranges.DebtToEquity.Median,
			SectorMax:    ranges.DebtToEquity.Max,
			Percentile:   calculatePercentileInverted(financials.DebtToEquity, ranges.DebtToEquity.Min, ranges.DebtToEquity.Max),
		},
		CurrentRatio: stock.SectorMetric{
			Value:        financials.CurrentRatio,
			SectorMin:    ranges.CurrentRatio.Min,
			SectorMedian: ranges.CurrentRatio.Median,
			SectorMax:    ranges.CurrentRatio.Max,
			Percentile:   calculatePercentile(financials.CurrentRatio, ranges.CurrentRatio.Min, ranges.CurrentRatio.Max),
		},
		AssetTurnover: stock.SectorMetric{
			Value:        assetTurnover,
			SectorMin:    ranges.AssetTurnover.Min,
			SectorMedian: ranges.AssetTurnover.Median,
			SectorMax:    ranges.AssetTurnover.Max,
			Percentile:   calculatePercentile(assetTurnover, ranges.AssetTurnover.Min, ranges.AssetTurnover.Max),
		},
	}, nil
}

// GetGrowth constructs growth metrics with sector context.
func (r *Repository) GetGrowth(ctx context.Context, sector string, financialData []scores.FinancialData) (*stock.Growth, error) {
	ranges := getSectorRanges(sector)

	var revenueGrowth, epsGrowth float64

	// Calculate YoY growth if we have 2 years of data
	if len(financialData) >= 2 {
		current := financialData[0]
		prior := financialData[1]

		// Revenue growth
		if prior.Revenue > 0 {
			revenueGrowth = ((current.Revenue - prior.Revenue) / prior.Revenue) * 100
		}

		// EPS growth
		if prior.EPS != 0 && current.EPS != 0 {
			// Handle negative EPS cases
			if prior.EPS > 0 {
				epsGrowth = ((current.EPS - prior.EPS) / prior.EPS) * 100
			} else if prior.EPS < 0 && current.EPS > 0 {
				// From loss to profit - show as large positive growth
				epsGrowth = 100
			} else if prior.EPS < 0 && current.EPS < 0 {
				// Both negative - improvement if loss decreased
				epsGrowth = ((prior.EPS - current.EPS) / -prior.EPS) * 100
			}
		}
	}

	return &stock.Growth{
		RevenueGrowthYoY: stock.SectorMetric{
			Value:        revenueGrowth,
			SectorMin:    ranges.RevenueGrowth.Min,
			SectorMedian: ranges.RevenueGrowth.Median,
			SectorMax:    ranges.RevenueGrowth.Max,
			Percentile:   calculatePercentile(revenueGrowth, ranges.RevenueGrowth.Min, ranges.RevenueGrowth.Max),
		},
		EPSGrowthYoY: stock.SectorMetric{
			Value:        epsGrowth,
			SectorMin:    ranges.EPSGrowth.Min,
			SectorMedian: ranges.EPSGrowth.Median,
			SectorMax:    ranges.EPSGrowth.Max,
			Percentile:   calculatePercentile(epsGrowth, ranges.EPSGrowth.Min, ranges.EPSGrowth.Max),
		},
	}, nil
}

// GetEarningsQuality constructs earnings quality metrics with sector context.
func (r *Repository) GetEarningsQuality(ctx context.Context, ticker string, sector string) (*stock.EarningsQuality, error) {
	ranges := getSectorRanges(sector)

	// Fetch cash flow and income statements for accrual ratio calculation
	cashFlows, err := r.client.GetCashFlowStatement(ctx, ticker, 1)
	if err != nil {
		return nil, fmt.Errorf("fetching cash flow for earnings quality: %w", err)
	}

	incomeStmts, err := r.client.GetIncomeStatement(ctx, ticker, 1)
	if err != nil {
		return nil, fmt.Errorf("fetching income statement for earnings quality: %w", err)
	}

	balanceSheets, err := r.client.GetBalanceSheet(ctx, ticker, 2)
	if err != nil {
		return nil, fmt.Errorf("fetching balance sheet for earnings quality: %w", err)
	}

	var accrualRatio, buybackYield float64

	// Accrual Ratio = (Net Income - Operating Cash Flow) / Average Total Assets
	// Lower is better (more cash-based earnings)
	if len(cashFlows) > 0 && len(incomeStmts) > 0 && len(balanceSheets) >= 1 {
		netIncome := incomeStmts[0].NetIncome
		operatingCF := cashFlows[0].OperatingCashFlow

		// Use average assets if we have 2 periods, otherwise current
		var avgAssets float64
		if len(balanceSheets) >= 2 {
			avgAssets = (balanceSheets[0].TotalAssets + balanceSheets[1].TotalAssets) / 2
		} else {
			avgAssets = balanceSheets[0].TotalAssets
		}

		if avgAssets > 0 {
			accrualRatio = ((netIncome - operatingCF) / avgAssets) * 100
		}
	}

	// Share Buyback Yield = (Shares Repurchased Value / Market Cap) * 100
	// Positive values indicate buybacks (shareholder friendly)
	if len(cashFlows) > 0 {
		// Get current market cap from quote
		quote, err := r.client.GetQuote(ctx, ticker)
		if err == nil && quote != nil && quote.MarketCap > 0 {
			// Common stock repurchased is typically negative in cash flow (cash outflow)
			// We want positive buyback yield, so we negate it
			buybackYield = (-cashFlows[0].CommonStockRepurchased / quote.MarketCap) * 100
			if buybackYield < 0 {
				buybackYield = 0 // Ignore stock issuance for this metric
			}
		}
	}

	return &stock.EarningsQuality{
		AccrualRatio: stock.SectorMetric{
			Value:        accrualRatio,
			SectorMin:    ranges.AccrualRatio.Min,
			SectorMedian: ranges.AccrualRatio.Median,
			SectorMax:    ranges.AccrualRatio.Max,
			Percentile:   calculatePercentileInverted(accrualRatio, ranges.AccrualRatio.Min, ranges.AccrualRatio.Max), // Lower is better
		},
		BuybackYield: stock.SectorMetric{
			Value:        buybackYield,
			SectorMin:    ranges.BuybackYield.Min,
			SectorMedian: ranges.BuybackYield.Median,
			SectorMax:    ranges.BuybackYield.Max,
			Percentile:   calculatePercentile(buybackYield, ranges.BuybackYield.Min, ranges.BuybackYield.Max),
		},
	}, nil
}

// getMostRecentFilingQuarter returns the most recent quarter with complete 13F filings.
// 13F filings are due 45 days after quarter end, so we look back accordingly.
func getMostRecentFilingQuarter() (year int, quarter int) {
	now := time.Now()

	// Subtract 45 days to account for filing delay
	filingDeadline := now.AddDate(0, 0, -45)

	year = filingDeadline.Year()
	month := int(filingDeadline.Month())

	// Determine quarter based on month
	switch {
	case month >= 10:
		quarter = 3 // Q3 ends Sep 30
	case month >= 7:
		quarter = 2 // Q2 ends Jun 30
	case month >= 4:
		quarter = 1 // Q1 ends Mar 31
	default:
		quarter = 4 // Q4 ends Dec 31
		year-- // Previous year's Q4
	}

	return year, quarter
}

// GetHoldings retrieves institutional holdings data.
func (r *Repository) GetHoldings(ctx context.Context, ticker string) (*stock.Holdings, error) {
	const topHoldersLimit = 5

	year, quarter := getMostRecentFilingQuarter()

	// Fetch more than we need to handle filtering
	holders, err := r.client.GetInstitutionalHolders(ctx, ticker, year, quarter, 10)
	if err != nil {
		// Log the error but return empty holdings (non-fatal)
		slog.Warn("failed to fetch institutional holders, returning empty",
			"ticker", ticker,
			"year", year,
			"quarter", quarter,
			"error", err,
		)
		return &stock.Holdings{
			TopInstitutional: []stock.InstitutionalHolder{},
		}, nil
	}

	if len(holders) == 0 {
		// Try previous quarter if current has no data
		prevYear, prevQuarter := year, quarter-1
		if prevQuarter == 0 {
			prevQuarter = 4
			prevYear--
		}

		holders, err = r.client.GetInstitutionalHolders(ctx, ticker, prevYear, prevQuarter, 10)
		if err != nil || len(holders) == 0 {
			return &stock.Holdings{
				TopInstitutional: []stock.InstitutionalHolder{},
			}, nil
		}
		year, quarter = prevYear, prevQuarter
	}

	// Map to domain type and limit to top 5
	result := &stock.Holdings{
		TopInstitutional: make([]stock.InstitutionalHolder, 0, topHoldersLimit),
	}

	for i, h := range holders {
		if i >= topHoldersLimit {
			break
		}

		quarterDate := fmt.Sprintf("%d-Q%d", year, quarter)

		result.TopInstitutional = append(result.TopInstitutional, stock.InstitutionalHolder{
			FundName:         h.InvestorName,
			FundCIK:          h.CIK,
			Shares:           h.Shares,
			Value:            h.Value,
			PortfolioPercent: h.Weight,
			ChangeShares:     h.SharesChange,
			ChangePercent:    h.ChangePercentage,
			QuarterDate:      quarterDate,
		})
	}

	// Calculate total institutional ownership if available
	// FMP may provide this directly, but we can estimate from holdings if needed
	var totalOwnership float64
	for _, h := range holders {
		if h.OwnershipPercent > 0 {
			totalOwnership += h.OwnershipPercent
		}
	}
	result.TotalInstitutionalOwner = totalOwnership / 100 // Convert to decimal

	return result, nil
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
