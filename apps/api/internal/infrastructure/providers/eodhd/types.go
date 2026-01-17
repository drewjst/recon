package eodhd

// FundamentalsResponse represents the full response from /api/fundamentals/{ticker}.{exchange}
type FundamentalsResponse struct {
	General             General              `json:"General"`
	Highlights          Highlights           `json:"Highlights"`
	Valuation           Valuation            `json:"Valuation"`
	SharesStats         SharesStats          `json:"SharesStats"`
	Technicals          Technicals           `json:"Technicals"`
	Holders             Holders              `json:"Holders"`
	InsiderTransactions []InsiderTransaction `json:"InsiderTransactions"`
	Financials          Financials           `json:"Financials"`
}

// General contains company profile information.
type General struct {
	Code              string             `json:"Code"`
	Type              string             `json:"Type"`
	Name              string             `json:"Name"`
	Exchange          string             `json:"Exchange"`
	CurrencyCode      string             `json:"CurrencyCode"`
	CurrencyName      string             `json:"CurrencyName"`
	CountryName       string             `json:"CountryName"`
	CountryISO        string             `json:"CountryISO"`
	ISIN              string             `json:"ISIN"`
	CIK               string             `json:"CIK"`
	Sector            string             `json:"Sector"`
	Industry          string             `json:"Industry"`
	GicSector         string             `json:"GicSector"`
	GicGroup          string             `json:"GicGroup"`
	GicIndustry       string             `json:"GicIndustry"`
	GicSubIndustry    string             `json:"GicSubIndustry"`
	Description       string             `json:"Description"`
	Address           string             `json:"Address"`
	Phone             string             `json:"Phone"`
	WebURL            string             `json:"WebURL"`
	LogoURL           string             `json:"LogoURL"`
	FullTimeEmployees int                `json:"FullTimeEmployees"`
	UpdatedAt         string             `json:"UpdatedAt"`
	IPODate           string             `json:"IPODate"`
	Officers          map[string]Officer `json:"Officers"`
}

// Officer represents a company executive.
type Officer struct {
	Name     string `json:"Name"`
	Title    string `json:"Title"`
	YearBorn string `json:"YearBorn"`
}

// Highlights contains key financial metrics and highlights.
type Highlights struct {
	MarketCapitalization       float64 `json:"MarketCapitalization"`
	MarketCapitalizationMln    float64 `json:"MarketCapitalizationMln"`
	EBITDA                     float64 `json:"EBITDA"`
	PERatio                    float64 `json:"PERatio"`
	PEGRatio                   float64 `json:"PEGRatio"`
	WallStreetTargetPrice      float64 `json:"WallStreetTargetPrice"`
	BookValue                  float64 `json:"BookValue"`
	DividendShare              float64 `json:"DividendShare"`
	DividendYield              float64 `json:"DividendYield"`
	EarningsShare              float64 `json:"EarningsShare"`
	EPSEstimateCurrentYear     float64 `json:"EPSEstimateCurrentYear"`
	EPSEstimateNextYear        float64 `json:"EPSEstimateNextYear"`
	EPSEstimateNextQuarter     float64 `json:"EPSEstimateNextQuarter"`
	EPSEstimateCurrentQuarter  float64 `json:"EPSEstimateCurrentQuarter"`
	MostRecentQuarter          string  `json:"MostRecentQuarter"`
	ProfitMargin               float64 `json:"ProfitMargin"`
	OperatingMarginTTM         float64 `json:"OperatingMarginTTM"`
	ReturnOnAssetsTTM          float64 `json:"ReturnOnAssetsTTM"`
	ReturnOnEquityTTM          float64 `json:"ReturnOnEquityTTM"`
	RevenueTTM                 float64 `json:"RevenueTTM"`
	RevenuePerShareTTM         float64 `json:"RevenuePerShareTTM"`
	QuarterlyRevenueGrowthYOY  float64 `json:"QuarterlyRevenueGrowthYOY"`
	GrossProfitTTM             float64 `json:"GrossProfitTTM"`
	DilutedEpsTTM              float64 `json:"DilutedEpsTTM"`
	QuarterlyEarningsGrowthYOY float64 `json:"QuarterlyEarningsGrowthYOY"`
}

// Valuation contains valuation ratios and multiples.
type Valuation struct {
	TrailingPE             float64 `json:"TrailingPE"`
	ForwardPE              float64 `json:"ForwardPE"`
	PriceSalesTTM          float64 `json:"PriceSalesTTM"`
	PriceBookMRQ           float64 `json:"PriceBookMRQ"`
	EnterpriseValue        float64 `json:"EnterpriseValue"`
	EnterpriseValueRevenue float64 `json:"EnterpriseValueRevenue"`
	EnterpriseValueEbitda  float64 `json:"EnterpriseValueEbitda"`
}

// SharesStats contains ownership statistics.
type SharesStats struct {
	SharesOutstanding       float64 `json:"SharesOutstanding"`
	SharesFloat             float64 `json:"SharesFloat"`
	PercentInsiders         float64 `json:"PercentInsiders"`
	PercentInstitutions     float64 `json:"PercentInstitutions"`
	SharesShort             float64 `json:"SharesShort"`
	SharesShortPriorMonth   float64 `json:"SharesShortPriorMonth"`
	ShortRatio              float64 `json:"ShortRatio"`
	ShortPercentOutstanding float64 `json:"ShortPercentOutstanding"`
	ShortPercentFloat       float64 `json:"ShortPercentFloat"`
}

// Technicals contains technical analysis metrics.
type Technicals struct {
	Beta       float64 `json:"Beta"`
	High52Week float64 `json:"52WeekHigh"`
	Low52Week  float64 `json:"52WeekLow"`
	MA50Day    float64 `json:"50DayMA"`
	MA200Day   float64 `json:"200DayMA"`
}

// Holders contains institutional and fund holder information.
type Holders struct {
	Institutions []InstitutionalHolder `json:"Institutions"`
	Funds        []InstitutionalHolder `json:"Funds"`
}

// InstitutionalHolder represents a holder (institution or fund).
type InstitutionalHolder struct {
	Name          string  `json:"name"`
	Date          string  `json:"date"`
	TotalShares   float64 `json:"totalShares"`
	TotalAssets   float64 `json:"totalAssets"`
	CurrentShares float64 `json:"currentShares"`
	Change        float64 `json:"change"`
	ChangePercent float64 `json:"change_p"`
}

// InsiderTransaction represents an insider trading transaction.
type InsiderTransaction struct {
	Date                        string  `json:"date"`
	OwnerCIK                    string  `json:"ownerCik"`
	OwnerName                   string  `json:"ownerName"`
	TransactionDate             string  `json:"transactionDate"`
	TransactionCode             string  `json:"transactionCode"`
	TransactionAmount           float64 `json:"transactionAmount"`
	TransactionPrice            float64 `json:"transactionPrice"`
	TransactionAcquiredDisposed string  `json:"transactionAcquiredDisposed"`
	PostTransactionAmount       float64 `json:"postTransactionAmount"`
	SECLink                     string  `json:"secLink"`
}

// Financials contains financial statements data.
type Financials struct {
	BalanceSheet    FinancialStatementSet `json:"Balance_Sheet"`
	IncomeStatement FinancialStatementSet `json:"Income_Statement"`
	CashFlow        FinancialStatementSet `json:"Cash_Flow"`
}

// FinancialStatementSet contains quarterly and yearly financial data.
type FinancialStatementSet struct {
	CurrencySymbol string                     `json:"currency_symbol"`
	Quarterly      map[string]FinancialPeriod `json:"quarterly"`
	Yearly         map[string]FinancialPeriod `json:"yearly"`
}

// FinancialPeriod represents a single period's financial data.
// Fields vary by statement type (balance sheet, income, cash flow).
type FinancialPeriod struct {
	Date           string `json:"date"`
	FilingDate     string `json:"filing_date"`
	CurrencySymbol string `json:"currency_symbol"`

	// Income Statement fields
	TotalRevenue          float64 `json:"totalRevenue"`
	GrossProfit           float64 `json:"grossProfit"`
	OperatingIncome       float64 `json:"operatingIncome"`
	NetIncome             float64 `json:"netIncome"`
	NetIncomeCommonShares float64 `json:"netIncomeApplicableToCommonShares"`
	EBITDA                float64 `json:"ebitda"`
	CostOfRevenue         float64 `json:"costOfRevenue"`

	// Balance Sheet fields
	TotalAssets             float64 `json:"totalAssets"`
	TotalCurrentAssets      float64 `json:"totalCurrentAssets"`
	TotalLiabilities        float64 `json:"totalLiab"`
	TotalCurrentLiabilities float64 `json:"totalCurrentLiabilities"`
	TotalStockholderEquity  float64 `json:"totalStockholderEquity"`
	Cash                    float64 `json:"cash"`
	CashAndShortTermInv     float64 `json:"cashAndShortTermInvestments"`
	ShortTermDebt           float64 `json:"shortTermDebt"`
	LongTermDebt            float64 `json:"longTermDebt"`
	TotalDebt               float64 `json:"shortLongTermDebt"`
	Inventory               float64 `json:"inventory"`

	// Cash Flow fields
	OperatingCashFlow    float64 `json:"totalCashFromOperatingActivities"`
	CapitalExpenditures  float64 `json:"capitalExpenditures"`
	FreeCashFlow         float64 `json:"freeCashFlow"`
	CashFromInvestingAct float64 `json:"totalCashflowsFromInvestingActivities"`
	CashFromFinancingAct float64 `json:"totalCashFromFinancingActivities"`
	DividendsPaid        float64 `json:"dividendsPaid"`
}

// QuoteResponse represents the response from real-time quote endpoint.
type QuoteResponse struct {
	Code          string  `json:"code"`
	Timestamp     int64   `json:"timestamp"`
	GMTOFFSET     int     `json:"gmtoffset"`
	Open          float64 `json:"open"`
	High          float64 `json:"high"`
	Low           float64 `json:"low"`
	Close         float64 `json:"close"`
	Volume        int64   `json:"volume"`
	PreviousClose float64 `json:"previousClose"`
	Change        float64 `json:"change"`
	ChangePercent float64 `json:"change_p"`
}

// HistoricalPrice represents a single day's price data from EOD endpoint.
type HistoricalPrice struct {
	Date          string  `json:"date"`
	Open          float64 `json:"open"`
	High          float64 `json:"high"`
	Low           float64 `json:"low"`
	Close         float64 `json:"close"`
	AdjustedClose float64 `json:"adjusted_close"`
	Volume        int64   `json:"volume"`
}

// SearchResult represents a ticker search result.
type SearchResult struct {
	Code     string `json:"Code"`
	Name     string `json:"Name"`
	Country  string `json:"Country"`
	Exchange string `json:"Exchange"`
	Currency string `json:"Currency"`
	Type     string `json:"Type"`
	ISIN     string `json:"ISIN"`
}

// InsiderTransactionResponse represents the response from insider-transactions endpoint.
type InsiderTransactionResponse struct {
	Code                        string  `json:"code"`
	Date                        string  `json:"date"`
	OwnerCIK                    string  `json:"ownerCik"`
	OwnerName                   string  `json:"ownerName"`
	OwnerTitle                  string  `json:"ownerTitle"`
	TransactionDate             string  `json:"transactionDate"`
	TransactionCode             string  `json:"transactionCode"`
	TransactionAmount           float64 `json:"transactionAmount"`
	TransactionPrice            float64 `json:"transactionPrice"`
	TransactionAcquiredDisposed string  `json:"transactionAcquiredDisposed"`
	PostTransactionAmount       float64 `json:"postTransactionAmount"`
	SECLink                     string  `json:"secLink"`
}
