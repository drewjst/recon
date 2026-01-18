package fmp

import (
	"strconv"
	"strings"
	"time"

	"github.com/drewjst/recon/apps/api/internal/domain/models"
)

// mapCompanyProfile converts FMP CompanyProfile to internal Company model.
func mapCompanyProfile(fmp *CompanyProfile) *models.Company {
	employees, _ := strconv.Atoi(fmp.FullTimeEmployees)

	return &models.Company{
		Ticker:      fmp.Symbol,
		Name:        fmp.CompanyName,
		Exchange:    fmp.Exchange,
		Sector:      fmp.Sector,
		Industry:    fmp.Industry,
		Description: fmp.Description,
		Website:     fmp.Website,
		CEO:         fmp.CEO,
		Employees:   employees,
		Country:     fmp.Country,
	}
}

// mapQuote converts FMP Quote to internal Quote model.
func mapQuote(fmp *Quote) *models.Quote {
	return &models.Quote{
		Ticker:        fmp.Symbol,
		Price:         fmp.Price,
		Change:        fmp.Change,
		ChangePercent: fmp.ChangePercent,
		Open:          fmp.Open,
		High:          fmp.DayHigh,
		Low:           fmp.DayLow,
		PrevClose:     fmp.PreviousClose,
		Volume:        int64(fmp.Volume),
		MarketCap:     int64(fmp.MarketCap),
		AsOf:          time.Unix(fmp.Timestamp, 0),
	}
}

// mapFinancials converts FMP financial statements to internal Financials model.
func mapFinancials(income *IncomeStatement, balance *BalanceSheet, cashFlow *CashFlowStatement) *models.Financials {
	year, _ := parseYear(income.Date)

	return &models.Financials{
		Ticker:       income.Symbol,
		FiscalYear:   year,
		FiscalPeriod: income.Period,

		// Income Statement
		Revenue:         int64(income.Revenue),
		GrossProfit:     int64(income.GrossProfit),
		OperatingIncome: int64(income.OperatingIncome),
		NetIncome:       int64(income.NetIncome),
		EPS:             income.EPSDiluted,

		// Balance Sheet
		TotalAssets:      int64(balance.TotalAssets),
		TotalLiabilities: int64(balance.TotalLiabilities),
		TotalEquity:      int64(balance.TotalStockholdersEquity),
		Cash:             int64(balance.CashAndCashEquivalents),
		Debt:             int64(balance.TotalDebt),

		// Cash Flow
		OperatingCashFlow: int64(cashFlow.OperatingCashFlow),
		CapEx:             int64(cashFlow.CapitalExpenditure),
		FreeCashFlow:      int64(cashFlow.FreeCashFlow),

		ReportDate: parseDate(income.Date),
	}
}

// mapRatios converts FMP Ratios and KeyMetrics to internal Ratios model.
func mapRatios(fmpRatios *Ratios, fmpMetrics *KeyMetrics) *models.Ratios {
	ratios := &models.Ratios{
		Ticker: fmpRatios.Symbol,
		AsOf:   parseDate(fmpRatios.Date),

		// Valuation (from Ratios)
		PE:         fmpRatios.PriceToEarningsRatio,
		PEG:        fmpRatios.PriceToEarningsGrowthRatio,
		PB:         fmpRatios.PriceToBookRatio,
		PS:         fmpRatios.PriceToSalesRatio,
		PriceToFCF: fmpRatios.PriceToFreeCashFlowRatio,

		// Profitability (from Ratios)
		GrossMargin:     fmpRatios.GrossProfitMargin * 100,
		OperatingMargin: fmpRatios.OperatingProfitMargin * 100,
		NetMargin:       fmpRatios.NetProfitMargin * 100,

		// Efficiency (from Ratios)
		AssetTurnover:     fmpRatios.AssetTurnover,
		InventoryTurnover: fmpRatios.InventoryTurnover,

		// Solvency (from Ratios)
		DebtToEquity:     fmpRatios.DebtToEquityRatio,
		CurrentRatio:     fmpRatios.CurrentRatio,
		QuickRatio:       fmpRatios.QuickRatio,
		InterestCoverage: fmpRatios.InterestCoverageRatio,
	}

	// Add metrics from KeyMetrics
	if fmpMetrics != nil {
		ratios.EVToEBITDA = fmpMetrics.EVToEBITDA
		ratios.ROE = fmpMetrics.ReturnOnEquity * 100
		ratios.ROIC = fmpMetrics.ReturnOnInvestedCapital * 100
		ratios.ROA = fmpMetrics.ReturnOnAssets * 100
	}

	return ratios
}

// mapRatiosTTM converts FMP TTM ratios and metrics to internal Ratios model.
func mapRatiosTTM(fmpRatios *RatiosTTM, fmpMetrics *KeyMetricsTTM) *models.Ratios {
	ratios := &models.Ratios{
		Ticker: fmpRatios.Symbol,
		AsOf:   time.Now(),

		// Valuation (TTM)
		PE:         fmpRatios.PriceToEarningsRatioTTM,
		PEG:        fmpRatios.PriceToEarningsGrowthRatioTTM,
		PB:         fmpRatios.PriceToBookRatioTTM,
		PS:         fmpRatios.PriceToSalesRatioTTM,
		PriceToFCF: fmpRatios.PriceToFreeCashFlowRatioTTM,

		// Profitability (TTM) - FMP returns as decimals, convert to percentages
		GrossMargin:     fmpRatios.GrossProfitMarginTTM * 100,
		OperatingMargin: fmpRatios.OperatingProfitMarginTTM * 100,
		NetMargin:       fmpRatios.NetProfitMarginTTM * 100,

		// Efficiency (TTM)
		AssetTurnover:     fmpRatios.AssetTurnoverTTM,
		InventoryTurnover: fmpRatios.InventoryTurnoverTTM,

		// Solvency (TTM)
		DebtToEquity:     fmpRatios.DebtToEquityRatioTTM,
		CurrentRatio:     fmpRatios.CurrentRatioTTM,
		QuickRatio:       fmpRatios.QuickRatioTTM,
		InterestCoverage: fmpRatios.InterestCoverageRatioTTM,
	}

	if fmpMetrics != nil {
		ratios.EVToEBITDA = fmpMetrics.EVToEBITDATTM
		ratios.ROA = fmpMetrics.ReturnOnAssetsTTM * 100
		ratios.ROE = fmpMetrics.ReturnOnEquityTTM * 100
		ratios.ROIC = fmpMetrics.ReturnOnInvestedCapitalTTM * 100
	}

	return ratios
}

// mapInstitutionalHolder converts FMP holder to internal model.
func mapInstitutionalHolder(fmp *InstitutionalOwnershipHolder) *models.InstitutionalHolder {
	return &models.InstitutionalHolder{
		Name:          fmp.InvestorName,
		Shares:        fmp.Shares,
		Value:         fmp.Value,
		PercentOwned:  fmp.OwnershipPercent,
		ChangeShares:  fmp.SharesChange,
		ChangePercent: fmp.ChangePercentage,
		DateReported:  parseDate(fmp.Date),
	}
}

// mapInsiderTrade converts FMP insider trade to internal model.
func mapInsiderTrade(fmp *InsiderTrade) *models.InsiderTrade {
	tradeType := "sell"
	if fmp.AcquisitionOrDisp == "A" {
		tradeType = "buy"
	}

	value := int64(float64(fmp.SecuritiesTransacted) * fmp.Price)

	return &models.InsiderTrade{
		Name:        fmp.ReportingName,
		Title:       fmp.TypeOfOwner,
		TradeType:   tradeType,
		Shares:      fmp.SecuritiesTransacted,
		Price:       fmp.Price,
		Value:       value,
		SharesOwned: fmp.SecuritiesOwned,
		TradeDate:   parseDate(fmp.TransactionDate),
		FilingDate:  parseDate(fmp.FilingDate),
	}
}

// mapHistoricalPrice converts FMP historical price to internal PriceBar.
func mapHistoricalPrice(fmp *HistoricalPrice) *models.PriceBar {
	return &models.PriceBar{
		Date:   parseDate(fmp.Date),
		Open:   fmp.Open,
		High:   fmp.High,
		Low:    fmp.Low,
		Close:  fmp.Close,
		Volume: fmp.Volume,
	}
}

// mapSearchResult converts FMP search result to internal model.
func mapSearchResult(fmp *SearchResult) *models.SearchResult {
	return &models.SearchResult{
		Ticker:   fmp.Symbol,
		Name:     fmp.Name,
		Exchange: fmp.ExchangeShort,
		Type:     "stock", // FMP doesn't distinguish in search
	}
}

// parseDate parses a date string like "2024-09-30" to time.Time.
func parseDate(date string) time.Time {
	t, _ := time.Parse("2006-01-02", date)
	return t
}

// parseYear extracts the year from a date string like "2024-09-30".
func parseYear(date string) (int, error) {
	parts := strings.Split(date, "-")
	if len(parts) < 1 {
		return 0, nil
	}
	return strconv.Atoi(parts[0])
}

// mapETFData converts FMP ETF data to internal ETFData model.
func mapETFData(info *ETFInfo, holdings []ETFHolding, sectors []ETFSectorWeighting, profile *CompanyProfile) *models.ETFData {
	if info == nil {
		return nil
	}

	// Map holdings (top 10)
	modelHoldings := make([]models.ETFHolding, 0, len(holdings))
	for i, h := range holdings {
		if i >= 10 {
			break
		}
		modelHoldings = append(modelHoldings, models.ETFHolding{
			Ticker:        h.Asset,
			Name:          h.Name,
			WeightPercent: h.WeightPercentage,
		})
	}

	// Map sector weights
	sectorWeights := make([]models.ETFSectorWeight, 0, len(sectors))
	for _, s := range sectors {
		// FMP returns weight as string like "15.23%", parse it
		weightStr := strings.TrimSuffix(s.WeightPercentage, "%")
		weight, _ := strconv.ParseFloat(weightStr, 64)
		sectorWeights = append(sectorWeights, models.ETFSectorWeight{
			Sector:        s.Sector,
			WeightPercent: weight,
		})
	}

	// AUM from ETF info, fall back to profile MarketCap
	aum := int64(info.AssetsUnderManagement)
	if aum == 0 && profile != nil {
		aum = int64(profile.MarketCap)
	}

	// Get beta from profile if available
	var beta float64
	if profile != nil {
		beta = profile.Beta
	}

	// Use avgVolume from ETF info, fall back to profile
	avgVolume := info.AvgVolume
	if avgVolume == 0 && profile != nil {
		avgVolume = int64(profile.VolAvg)
	}

	// Use holdingsCount from API if available, otherwise count from holdings array
	holdingsCount := info.HoldingsCount
	if holdingsCount == 0 {
		holdingsCount = len(holdings)
	}

	return &models.ETFData{
		ExpenseRatio:  info.ExpenseRatio * 100, // Convert to percentage (0.0945 -> 9.45)
		AUM:           aum,
		NAV:           info.NAV,
		AvgVolume:     avgVolume,
		Beta:          beta,
		HoldingsCount: holdingsCount,
		Domicile:      info.Domicile,
		InceptionDate: info.InceptionDate,
		Website:       info.Website,
		ETFCompany:    info.ETFCompany,
		Holdings:      modelHoldings,
		SectorWeights: sectorWeights,
	}
}

// mapAnalystEstimates converts FMP analyst data to internal AnalystEstimates model.
func mapAnalystEstimates(ticker string, grades *GradesConsensus, targets *PriceTargetConsensus, estimates []AnalystEstimate) *models.AnalystEstimates {
	result := &models.AnalystEstimates{
		Ticker: ticker,
		AsOf:   time.Now(),
	}

	// Map pre-aggregated grades consensus
	if grades != nil {
		result.StrongBuyCount = grades.StrongBuy
		result.BuyCount = grades.Buy
		result.HoldCount = grades.Hold
		result.SellCount = grades.Sell
		result.StrongSellCount = grades.StrongSell
		result.Rating = grades.Consensus

		result.AnalystCount = grades.StrongBuy + grades.Buy + grades.Hold + grades.Sell + grades.StrongSell

		// Calculate rating score (weighted average: Strong Buy=5, Buy=4, Hold=3, Sell=2, Strong Sell=1)
		if result.AnalystCount > 0 {
			total := float64(grades.StrongBuy*5 + grades.Buy*4 + grades.Hold*3 + grades.Sell*2 + grades.StrongSell*1)
			result.RatingScore = total / float64(result.AnalystCount)
		}
	}

	// Map price targets
	if targets != nil {
		result.PriceTargetHigh = targets.TargetHigh
		result.PriceTargetLow = targets.TargetLow
		result.PriceTargetAverage = targets.TargetConsensus
		result.PriceTargetMedian = targets.TargetMedian
	}

	// Map estimates (find current and next year)
	// FMP returns estimates sorted by date, most recent first
	if len(estimates) >= 1 {
		result.EPSEstimateCurrentY = estimates[0].EstimatedEpsAvg
		result.RevenueEstimateCurrentY = estimates[0].EstimatedRevenueAvg
	}
	if len(estimates) >= 2 {
		result.EPSEstimateNextY = estimates[1].EstimatedEpsAvg
		result.RevenueEstimateNextY = estimates[1].EstimatedRevenueAvg

		// Calculate growth rates
		if result.EPSEstimateCurrentY != 0 {
			result.EPSGrowthNextY = ((result.EPSEstimateNextY - result.EPSEstimateCurrentY) / result.EPSEstimateCurrentY) * 100
		}
		if result.RevenueEstimateCurrentY != 0 {
			result.RevenueGrowthNextY = ((result.RevenueEstimateNextY - result.RevenueEstimateCurrentY) / result.RevenueEstimateCurrentY) * 100
		}
	}

	return result
}
