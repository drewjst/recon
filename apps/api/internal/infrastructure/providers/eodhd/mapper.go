package eodhd

import (
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/drewjst/recon/apps/api/internal/domain/models"
)

// mapCompany converts EODHD General to internal Company model.
func mapCompany(e *FundamentalsResponse) *models.Company {
	ceo := ""
	if len(e.General.Officers) > 0 {
		// First pass: look for CEO
		for _, officer := range e.General.Officers {
			title := strings.ToLower(officer.Title)
			if strings.Contains(title, "ceo") || strings.Contains(title, "chief executive") {
				ceo = officer.Name
				break
			}
		}
		// Fallback to first officer (key "0") if no CEO found
		if ceo == "" {
			if first, ok := e.General.Officers["0"]; ok {
				ceo = first.Name
			}
		}
	}

	return &models.Company{
		Ticker:      e.General.Code,
		Name:        e.General.Name,
		Exchange:    e.General.Exchange,
		Sector:      e.General.Sector,
		Industry:    e.General.Industry,
		Description: e.General.Description,
		Website:     e.General.WebURL,
		CEO:         ceo,
		Employees:   e.General.FullTimeEmployees,
		Country:     e.General.CountryName,
	}
}

// mapRatios converts EODHD Highlights and Valuation to internal Ratios model.
func mapRatios(e *FundamentalsResponse) *models.Ratios {
	ratios := &models.Ratios{
		Ticker: e.General.Code,
		AsOf:   time.Now(),

		// Valuation
		PE:         e.Valuation.TrailingPE,
		ForwardPE:  e.Valuation.ForwardPE,
		PEG:        e.Highlights.PEGRatio,
		PB:         e.Valuation.PriceBookMRQ,
		PS:         e.Valuation.PriceSalesTTM,
		EVToEBITDA: e.Valuation.EnterpriseValueEbitda,

		// Profitability - EODHD returns these as decimals, convert to percentages
		GrossMargin:     calculateGrossMargin(e),
		OperatingMargin: e.Highlights.OperatingMarginTTM * 100,
		NetMargin:       e.Highlights.ProfitMargin * 100,
		ROE:             e.Highlights.ReturnOnEquityTTM * 100,
		ROA:             e.Highlights.ReturnOnAssetsTTM * 100,

		// Growth metrics from EODHD
		EPSEstimateCurrent: e.Highlights.EPSEstimateCurrentYear,
		EPSEstimateNext:    e.Highlights.EPSEstimateNextYear,
		RevenueGrowthYoY:   e.Highlights.QuarterlyRevenueGrowthYOY * 100,
		EPSGrowthYoY:       e.Highlights.QuarterlyEarningsGrowthYOY * 100,

		// Revenue/Income for per-employee calculations
		RevenueTTM:        e.Highlights.RevenueTTM,
		FullTimeEmployees: e.General.FullTimeEmployees,
	}

	// Calculate projected EPS growth
	if e.Highlights.EarningsShare > 0 && e.Highlights.EPSEstimateNextYear > 0 {
		ratios.EPSGrowthYoY = ((e.Highlights.EPSEstimateNextYear - e.Highlights.EarningsShare) / e.Highlights.EarningsShare) * 100
	}

	// Calculate per-employee metrics
	if e.General.FullTimeEmployees > 0 {
		ratios.RevenuePerEmployee = e.Highlights.RevenueTTM / float64(e.General.FullTimeEmployees)
		// Get net income from most recent year's financial statements
		if netIncome := getLatestNetIncome(e); netIncome != 0 {
			ratios.NetIncomeTTM = netIncome
			ratios.IncomePerEmployee = netIncome / float64(e.General.FullTimeEmployees)
		}
	}

	// Calculate FCF TTM and growth from cash flow statements
	fcfTTM, fcfGrowth := calculateFCFMetrics(e)
	ratios.FreeCashFlowTTM = fcfTTM
	ratios.CashFlowGrowthYoY = fcfGrowth

	return ratios
}

// calculateGrossMargin calculates gross margin from revenue and gross profit.
func calculateGrossMargin(e *FundamentalsResponse) float64 {
	if e.Highlights.RevenueTTM == 0 {
		return 0
	}
	return (e.Highlights.GrossProfitTTM / e.Highlights.RevenueTTM) * 100
}

// getLatestNetIncome extracts the most recent net income from financial statements.
func getLatestNetIncome(e *FundamentalsResponse) float64 {
	dates := getSortedPeriods(e.Financials.IncomeStatement.Yearly)
	if len(dates) == 0 {
		return 0
	}
	latest := e.Financials.IncomeStatement.Yearly[dates[0]]
	return float64(latest.NetIncome)
}

// calculateFCFMetrics calculates FCF TTM and YoY growth from cash flow statements.
func calculateFCFMetrics(e *FundamentalsResponse) (fcfTTM, fcfGrowth float64) {
	dates := getSortedPeriods(e.Financials.CashFlow.Yearly)
	if len(dates) == 0 {
		return 0, 0
	}

	// Get most recent FCF
	latest := e.Financials.CashFlow.Yearly[dates[0]]
	fcfTTM = float64(latest.FreeCashFlow)
	if fcfTTM == 0 && latest.OperatingCashFlow != 0 {
		// Calculate from OCF - CapEx if not directly provided
		fcfTTM = float64(latest.OperatingCashFlow) - abs64(float64(latest.CapitalExpenditures))
	}

	// Calculate YoY growth if we have prior year data
	if len(dates) >= 2 {
		prior := e.Financials.CashFlow.Yearly[dates[1]]
		priorFCF := float64(prior.FreeCashFlow)
		if priorFCF == 0 && prior.OperatingCashFlow != 0 {
			priorFCF = float64(prior.OperatingCashFlow) - abs64(float64(prior.CapitalExpenditures))
		}
		if priorFCF != 0 {
			fcfGrowth = ((fcfTTM - priorFCF) / abs64(priorFCF)) * 100
		}
	}

	return fcfTTM, fcfGrowth
}

// abs64 returns the absolute value of a float64.
func abs64(n float64) float64 {
	if n < 0 {
		return -n
	}
	return n
}

// mapFinancials converts EODHD financial statements to internal Financials model.
// It returns financials sorted by date (most recent first).
func mapFinancials(e *FundamentalsResponse, periods int) []models.Financials {
	// Get yearly statements, sorted by date descending
	incomeStatements := getSortedPeriods(e.Financials.IncomeStatement.Yearly)
	balanceSheets := getSortedPeriods(e.Financials.BalanceSheet.Yearly)
	cashFlows := getSortedPeriods(e.Financials.CashFlow.Yearly)

	// Build a map of periods by date for matching
	incomeByDate := make(map[string]FinancialPeriod)
	for _, date := range incomeStatements {
		incomeByDate[date] = e.Financials.IncomeStatement.Yearly[date]
	}

	balanceByDate := make(map[string]FinancialPeriod)
	for _, date := range balanceSheets {
		balanceByDate[date] = e.Financials.BalanceSheet.Yearly[date]
	}

	cashFlowByDate := make(map[string]FinancialPeriod)
	for _, date := range cashFlows {
		cashFlowByDate[date] = e.Financials.CashFlow.Yearly[date]
	}

	// Use income statement dates as the primary list
	result := make([]models.Financials, 0, periods)
	count := 0

	for _, date := range incomeStatements {
		if count >= periods {
			break
		}

		income := incomeByDate[date]
		balance, hasBalance := balanceByDate[date]
		cashFlow, hasCashFlow := cashFlowByDate[date]

		financials := models.Financials{
			Ticker:       e.General.Code,
			FiscalYear:   parseYearFromDate(date),
			FiscalPeriod: "FY",
			ReportDate:   parseDate(date),

			// Income Statement
			Revenue:         int64(income.TotalRevenue),
			GrossProfit:     int64(income.GrossProfit),
			OperatingIncome: int64(income.OperatingIncome),
			NetIncome:       int64(income.NetIncome),
			EPS:             0, // Would need to calculate from shares outstanding
		}

		if hasBalance {
			financials.TotalAssets = int64(balance.TotalAssets)
			financials.TotalLiabilities = int64(balance.TotalLiabilities)
			financials.TotalEquity = int64(balance.TotalStockholderEquity)
			financials.Cash = int64(balance.CashAndShortTermInv)
			if financials.Cash == 0 {
				financials.Cash = int64(balance.Cash)
			}
			financials.Debt = int64(balance.TotalDebt)
			if financials.Debt == 0 {
				financials.Debt = int64(balance.ShortTermDebt + balance.LongTermDebt)
			}
		}

		if hasCashFlow {
			financials.OperatingCashFlow = int64(cashFlow.OperatingCashFlow)
			financials.CapEx = int64(cashFlow.CapitalExpenditures)
			financials.FreeCashFlow = int64(cashFlow.FreeCashFlow)
			if financials.FreeCashFlow == 0 && financials.OperatingCashFlow != 0 {
				financials.FreeCashFlow = financials.OperatingCashFlow - abs(financials.CapEx)
			}
		}

		result = append(result, financials)
		count++
	}

	return result
}

// getSortedPeriods returns period dates sorted descending (most recent first).
func getSortedPeriods(periods map[string]FinancialPeriod) []string {
	dates := make([]string, 0, len(periods))
	for date := range periods {
		dates = append(dates, date)
	}
	sort.Sort(sort.Reverse(sort.StringSlice(dates)))
	return dates
}

// mapInstitutionalHolders converts EODHD Holders to internal InstitutionalHolder models.
func mapInstitutionalHolders(e *FundamentalsResponse) []models.InstitutionalHolder {
	result := make([]models.InstitutionalHolder, 0, len(e.Holders.Institutions))

	for _, h := range e.Holders.Institutions {
		result = append(result, models.InstitutionalHolder{
			Name:          h.Name,
			Shares:        int64(h.CurrentShares),
			Value:         0, // EODHD doesn't provide value in this format
			PercentOwned:  0, // Would need to calculate from total shares outstanding
			ChangeShares:  int64(h.Change),
			ChangePercent: h.ChangePercent,
			DateReported:  parseDate(h.Date),
		})
	}

	return result
}

// mapInsiderTrades converts EODHD InsiderTransactions (map) to internal InsiderTrade models.
func mapInsiderTrades(trades map[string]InsiderTransaction, days int) []models.InsiderTrade {
	cutoff := time.Now().AddDate(0, 0, -days)
	result := make([]models.InsiderTrade, 0)

	for _, t := range trades {
		tradeDate := parseDate(t.TransactionDate)
		if tradeDate.Before(cutoff) {
			continue
		}

		// Skip zero-amount transactions
		if t.TransactionAmount == 0 {
			continue
		}

		tradeType := mapTransactionCode(t.TransactionCode, t.TransactionAcquiredDisposed)
		value := int64(t.TransactionAmount * t.TransactionPrice)

		result = append(result, models.InsiderTrade{
			Name:        t.OwnerName,
			Title:       "", // Would need owner title from different endpoint
			TradeType:   tradeType,
			Shares:      int64(t.TransactionAmount),
			Price:       t.TransactionPrice,
			Value:       value,
			SharesOwned: int64(t.PostTransactionAmount),
			TradeDate:   tradeDate,
			FilingDate:  parseDate(t.Date),
		})
	}

	return result
}

// mapInsiderTradesFromResponse converts InsiderTransactionResponse to internal InsiderTrade models.
func mapInsiderTradesFromResponse(trades []InsiderTransactionResponse, days int) []models.InsiderTrade {
	cutoff := time.Now().AddDate(0, 0, -days)
	result := make([]models.InsiderTrade, 0)

	for _, t := range trades {
		tradeDate := parseDate(t.TransactionDate)
		if tradeDate.Before(cutoff) {
			continue
		}

		if t.TransactionAmount == 0 {
			continue
		}

		tradeType := mapTransactionCode(t.TransactionCode, t.TransactionAcquiredDisposed)
		value := int64(t.TransactionAmount * t.TransactionPrice)

		result = append(result, models.InsiderTrade{
			Name:        t.OwnerName,
			Title:       t.OwnerTitle,
			TradeType:   tradeType,
			Shares:      int64(t.TransactionAmount),
			Price:       t.TransactionPrice,
			Value:       value,
			SharesOwned: int64(t.PostTransactionAmount),
			TradeDate:   tradeDate,
			FilingDate:  parseDate(t.Date),
		})
	}

	return result
}

// mapTransactionCode converts EODHD transaction codes to buy/sell.
func mapTransactionCode(code string, acquiredDisposed string) string {
	// EODHD uses SEC transaction codes:
	// P = Open market purchase
	// S = Open market sale
	// A = Grant/Award
	// D = Disposition to issuer
	// M = Exercise of derivative
	// etc.

	// First check the acquired/disposed field
	switch strings.ToUpper(acquiredDisposed) {
	case "A":
		return "buy"
	case "D":
		return "sell"
	}

	// Fallback to transaction code
	switch strings.ToUpper(code) {
	case "P":
		return "buy"
	case "S":
		return "sell"
	case "A", "M": // Grants and exercises are acquisitions
		return "buy"
	case "D", "F": // Dispositions and tax payments
		return "sell"
	default:
		return "other"
	}
}

// mapQuote converts EODHD QuoteResponse to internal Quote model.
func mapQuote(q *QuoteResponse, ticker string, marketCap int64) *models.Quote {
	return &models.Quote{
		Ticker:        ticker,
		Price:         q.Close,
		Change:        q.Change,
		ChangePercent: q.ChangePercent,
		Open:          q.Open,
		High:          q.High,
		Low:           q.Low,
		PrevClose:     q.PreviousClose,
		Volume:        q.Volume,
		MarketCap:     marketCap,
		AsOf:          time.Unix(q.Timestamp, 0),
	}
}

// mapHistoricalPrices converts EODHD historical prices to internal PriceBar models.
func mapHistoricalPrices(prices []HistoricalPrice) []models.PriceBar {
	result := make([]models.PriceBar, 0, len(prices))
	for _, p := range prices {
		result = append(result, models.PriceBar{
			Date:   parseDate(p.Date),
			Open:   p.Open,
			High:   p.High,
			Low:    p.Low,
			Close:  p.AdjustedClose,
			Volume: p.Volume,
		})
	}
	return result
}

// mapSearchResults converts EODHD search results to internal SearchResult models.
func mapSearchResults(results []SearchResult) []models.SearchResult {
	mapped := make([]models.SearchResult, 0, len(results))
	for _, r := range results {
		mapped = append(mapped, models.SearchResult{
			Ticker:   r.Code,
			Name:     r.Name,
			Exchange: r.Exchange,
			Type:     strings.ToLower(r.Type),
		})
	}
	return mapped
}

// parseDate parses a date string like "2024-09-30" to time.Time.
func parseDate(date string) time.Time {
	t, _ := time.Parse("2006-01-02", date)
	return t
}

// parseYearFromDate extracts the year from a date string like "2024-09-30".
func parseYearFromDate(date string) int {
	parts := strings.Split(date, "-")
	if len(parts) < 1 {
		return 0
	}
	year, _ := strconv.Atoi(parts[0])
	return year
}

// abs returns the absolute value of an int64.
func abs(n int64) int64 {
	if n < 0 {
		return -n
	}
	return n
}

// mapTechnicalMetrics converts EODHD Technicals to internal TechnicalMetrics model.
func mapTechnicalMetrics(e *FundamentalsResponse) *models.TechnicalMetrics {
	return &models.TechnicalMetrics{
		Ticker:   e.General.Code,
		Beta:     e.Technicals.Beta,
		MA50Day:  e.Technicals.MA50Day,
		MA200Day: e.Technicals.MA200Day,
	}
}

// mapShortInterest converts EODHD SharesStats to internal ShortInterest model.
func mapShortInterest(e *FundamentalsResponse) *models.ShortInterest {
	return &models.ShortInterest{
		Ticker:                e.General.Code,
		SharesShort:           int64(e.SharesStats.SharesShort),
		SharesShortPriorMonth: int64(e.SharesStats.SharesShortPriorMonth),
		ShortRatio:            e.SharesStats.ShortRatio,
		ShortPercentFloat:     e.SharesStats.ShortPercentFloat,
		ShortPercentShares:    e.SharesStats.ShortPercentOutstanding,
	}
}
