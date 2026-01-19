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

		// Growth metrics from EODHD (QuarterlyEarningsGrowthYOY is TTM EPS growth)
		EPSEstimateCurrent: e.Highlights.EPSEstimateCurrentYear,
		EPSEstimateNext:    e.Highlights.EPSEstimateNextYear,
		RevenueGrowthYoY:   e.Highlights.QuarterlyRevenueGrowthYOY * 100,
		EPSGrowthYoY:       e.Highlights.QuarterlyEarningsGrowthYOY * 100,

		// Revenue/Income for per-employee calculations
		RevenueTTM:        e.Highlights.RevenueTTM,
		FullTimeEmployees: e.General.FullTimeEmployees,
	}

	// Calculate balance sheet ratios from latest financial statements
	calculateBalanceSheetRatios(e, ratios)

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

	// Calculate Price/FCF ratio
	if fcfTTM > 0 && e.Highlights.MarketCapitalization > 0 {
		ratios.PriceToFCF = e.Highlights.MarketCapitalization / fcfTTM
	}

	return ratios
}

// calculateBalanceSheetRatios calculates financial health ratios from balance sheet data.
func calculateBalanceSheetRatios(e *FundamentalsResponse, ratios *models.Ratios) {
	dates := getSortedPeriods(e.Financials.BalanceSheet.Yearly)
	if len(dates) == 0 {
		return
	}

	latest := e.Financials.BalanceSheet.Yearly[dates[0]]

	// Debt to Equity = Total Debt / Stockholders Equity
	totalDebt := float64(latest.TotalDebt)
	if totalDebt == 0 {
		totalDebt = float64(latest.ShortTermDebt + latest.LongTermDebt)
	}
	equity := float64(latest.TotalStockholderEquity)
	if equity > 0 {
		ratios.DebtToEquity = totalDebt / equity
	}

	// Current Ratio = Current Assets / Current Liabilities
	currentAssets := float64(latest.TotalCurrentAssets)
	currentLiabilities := float64(latest.TotalCurrentLiabilities)
	if currentLiabilities > 0 {
		ratios.CurrentRatio = currentAssets / currentLiabilities
	}

	// Quick Ratio = (Current Assets - Inventory) / Current Liabilities
	inventory := float64(latest.Inventory)
	if currentLiabilities > 0 {
		ratios.QuickRatio = (currentAssets - inventory) / currentLiabilities
	}

	// Asset Turnover = Revenue / Total Assets
	totalAssets := float64(latest.TotalAssets)
	if totalAssets > 0 && e.Highlights.RevenueTTM > 0 {
		ratios.AssetTurnover = e.Highlights.RevenueTTM / totalAssets
	}

	// ROIC = NOPAT / Invested Capital
	// NOPAT ≈ Operating Income * (1 - Tax Rate), simplified to Operating Income * 0.75
	// Invested Capital = Total Assets - Current Liabilities (or Equity + Net Debt)
	incomeDates := getSortedPeriods(e.Financials.IncomeStatement.Yearly)
	if len(incomeDates) > 0 {
		income := e.Financials.IncomeStatement.Yearly[incomeDates[0]]
		operatingIncome := float64(income.OperatingIncome)
		investedCapital := totalAssets - currentLiabilities
		if investedCapital > 0 && operatingIncome != 0 {
			nopat := operatingIncome * 0.75 // Approximate 25% tax rate
			ratios.ROIC = (nopat / investedCapital) * 100
		}
	}
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

// =============================================================================
// ETF Mapper Functions
// =============================================================================

// mapETFData converts EODHD ETF data to internal ETFData model.
func mapETFData(etf *ETFData) *models.ETFData {
	if etf == nil {
		return nil
	}

	holdings := mapETFHoldings(etf.Holdings)

	return &models.ETFData{
		ExpenseRatio:       float64(etf.NetExpenseRatio),
		AUM:                int64(etf.TotalAssets),
		HoldingsCount:      len(holdings),
		InceptionDate:      etf.InceptionDate,
		Holdings:           holdings,
		SectorWeights:      mapETFSectorWeights(etf.SectorWeights),
		Regions:            mapETFRegions(etf.WorldRegions),
		MarketCapBreakdown: mapETFMarketCap(etf.MarketCapitalisation),
		Valuations:         mapETFValuations(etf.ValuationsRatesPortfolio),
		Performance:        mapETFPerformance(etf.MorningStar),
	}
}

// mapETFHoldings converts EODHD Holdings map to sorted slice of ETFHolding.
func mapETFHoldings(holdings map[string]ETFHoldingData) []models.ETFHolding {
	if len(holdings) == 0 {
		return nil
	}

	result := make([]models.ETFHolding, 0, len(holdings))
	for _, h := range holdings {
		result = append(result, models.ETFHolding{
			Ticker:        h.Code,
			Name:          h.Name,
			Sector:        h.Sector,
			WeightPercent: float64(h.AssetsPercent),
		})
	}

	// Sort by weight descending
	sort.Slice(result, func(i, j int) bool {
		return result[i].WeightPercent > result[j].WeightPercent
	})

	// Return top 10 holdings
	if len(result) > 10 {
		return result[:10]
	}
	return result
}

// mapETFSectorWeights converts EODHD sector weights map to slice.
func mapETFSectorWeights(sectors map[string]ETFSectorWeight) []models.ETFSectorWeight {
	if len(sectors) == 0 {
		return nil
	}

	result := make([]models.ETFSectorWeight, 0, len(sectors))
	for name, s := range sectors {
		result = append(result, models.ETFSectorWeight{
			Sector:        name,
			WeightPercent: float64(s.EquityPercent),
		})
	}

	// Sort by weight descending
	sort.Slice(result, func(i, j int) bool {
		return result[i].WeightPercent > result[j].WeightPercent
	})

	return result
}

// mapETFRegions converts EODHD regions map to slice.
func mapETFRegions(regions map[string]ETFRegionWeight) []models.ETFRegionWeight {
	if len(regions) == 0 {
		return nil
	}

	result := make([]models.ETFRegionWeight, 0, len(regions))
	for name, r := range regions {
		result = append(result, models.ETFRegionWeight{
			Region:        name,
			WeightPercent: float64(r.EquityPercent),
		})
	}

	// Sort by weight descending
	sort.Slice(result, func(i, j int) bool {
		return result[i].WeightPercent > result[j].WeightPercent
	})

	return result
}

// mapETFMarketCap converts EODHD market cap breakdown.
func mapETFMarketCap(mc ETFMarketCapBreakdown) *models.ETFMarketCap {
	// Return nil if all zeros (no data)
	if mc.Mega == 0 && mc.Big == 0 && mc.Medium == 0 && mc.Small == 0 && mc.Micro == 0 {
		return nil
	}

	return &models.ETFMarketCap{
		Mega:   float64(mc.Mega),
		Big:    float64(mc.Big),
		Medium: float64(mc.Medium),
		Small:  float64(mc.Small),
		Micro:  float64(mc.Micro),
	}
}

// mapETFValuations converts EODHD valuation rates.
func mapETFValuations(v ETFValuationsRates) *models.ETFValuations {
	// Return nil if all zeros (no data)
	if v.PriceProspectiveEarnings == 0 && v.PriceBook == 0 && v.PriceSales == 0 && v.PriceCashFlow == 0 {
		return nil
	}

	return &models.ETFValuations{
		PE:            float64(v.PriceProspectiveEarnings),
		PB:            float64(v.PriceBook),
		PS:            float64(v.PriceSales),
		PCF:           float64(v.PriceCashFlow),
		DividendYield: float64(v.DividendYieldFactor),
	}
}

// mapETFPerformance converts EODHD MorningStar performance data.
func mapETFPerformance(ms map[string]interface{}) *models.ETFPerformance {
	if len(ms) == 0 {
		return nil
	}

	getFloat := func(key string) float64 {
		if v, ok := ms[key]; ok {
			switch val := v.(type) {
			case float64:
				return val
			case int:
				return float64(val)
			case string:
				if f, err := strconv.ParseFloat(val, 64); err == nil {
					return f
				}
			}
		}
		return 0
	}

	perf := &models.ETFPerformance{
		YTD: getFloat("Year_to_Date"),
		Y1:  getFloat("1y_Return"),
		Y3:  getFloat("3y_Return"),
		Y5:  getFloat("5y_Return"),
		Y10: getFloat("10y_Return"),
	}

	// Return nil if all zeros (no data)
	if perf.YTD == 0 && perf.Y1 == 0 && perf.Y3 == 0 && perf.Y5 == 0 {
		return nil
	}

	return perf
}
