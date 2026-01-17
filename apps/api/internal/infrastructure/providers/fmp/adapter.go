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
	}

	if fmpMetrics != nil {
		ratios.EVToEBITDA = fmpMetrics.EVToEBITDATTM
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
