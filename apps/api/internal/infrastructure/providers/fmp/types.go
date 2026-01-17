package fmp

// CompanyProfile represents the FMP company profile response (stable API).
type CompanyProfile struct {
	Symbol            string  `json:"symbol"`
	CompanyName       string  `json:"companyName"`
	Exchange          string  `json:"exchange"`
	Industry          string  `json:"industry"`
	Sector            string  `json:"sector"`
	Description       string  `json:"description"`
	CEO               string  `json:"ceo"`
	Website           string  `json:"website"`
	FullTimeEmployees string  `json:"fullTimeEmployees"`
	Price             float64 `json:"price"`
	MarketCap         float64 `json:"marketCap"`
	Beta              float64 `json:"beta"`
	VolAvg            float64 `json:"averageVolume"`
	LastDiv           float64 `json:"lastDividend"`
	Range             string  `json:"range"`
	IPODate           string  `json:"ipoDate"`
	Country           string  `json:"country"`
	Change            float64 `json:"change"`
	ChangePercent     float64 `json:"changePercentage"`
	Volume            int64   `json:"volume"`
}

// Quote represents the FMP quote response (stable API).
type Quote struct {
	Symbol        string  `json:"symbol"`
	Name          string  `json:"name"`
	Price         float64 `json:"price"`
	Change        float64 `json:"change"`
	ChangePercent float64 `json:"changePercentage"`
	DayHigh       float64 `json:"dayHigh"`
	DayLow        float64 `json:"dayLow"`
	YearHigh      float64 `json:"yearHigh"`
	YearLow       float64 `json:"yearLow"`
	Volume        float64 `json:"volume"`
	MarketCap     float64 `json:"marketCap"`
	Open          float64 `json:"open"`
	PreviousClose float64 `json:"previousClose"`
	PriceAvg50    float64 `json:"priceAvg50"`
	PriceAvg200   float64 `json:"priceAvg200"`
	Timestamp     int64   `json:"timestamp"`
}

// IncomeStatement represents the FMP income statement response (stable API).
type IncomeStatement struct {
	Date                   string  `json:"date"`
	Symbol                 string  `json:"symbol"`
	FilingDate             string  `json:"filingDate"`
	FiscalYear             string  `json:"fiscalYear"`
	Period                 string  `json:"period"`
	Revenue                float64 `json:"revenue"`
	CostOfRevenue          float64 `json:"costOfRevenue"`
	GrossProfit            float64 `json:"grossProfit"`
	OperatingExpenses      float64 `json:"operatingExpenses"`
	OperatingIncome        float64 `json:"operatingIncome"`
	EBITDA                 float64 `json:"ebitda"`
	EBIT                   float64 `json:"ebit"`
	InterestExpense        float64 `json:"interestExpense"`
	InterestIncome         float64 `json:"interestIncome"`
	IncomeBeforeTax        float64 `json:"incomeBeforeTax"`
	IncomeTaxExpense       float64 `json:"incomeTaxExpense"`
	NetIncome              float64 `json:"netIncome"`
	BottomLineNetIncome    float64 `json:"bottomLineNetIncome"`
	EPS                    float64 `json:"eps"`
	EPSDiluted             float64 `json:"epsDiluted"`
	WeightedAvgSharesOut   int64   `json:"weightedAverageShsOut"`
	WeightedAvgSharesDil   int64   `json:"weightedAverageShsOutDil"`
}

// BalanceSheet represents the FMP balance sheet response (stable API).
type BalanceSheet struct {
	Date                    string  `json:"date"`
	Symbol                  string  `json:"symbol"`
	FilingDate              string  `json:"filingDate"`
	FiscalYear              string  `json:"fiscalYear"`
	Period                  string  `json:"period"`
	TotalAssets             float64 `json:"totalAssets"`
	TotalCurrentAssets      float64 `json:"totalCurrentAssets"`
	TotalNonCurrentAssets   float64 `json:"totalNonCurrentAssets"`
	TotalLiabilities        float64 `json:"totalLiabilities"`
	TotalCurrentLiabilities float64 `json:"totalCurrentLiabilities"`
	TotalNonCurrentLiab     float64 `json:"totalNonCurrentLiabilities"`
	LongTermDebt            float64 `json:"longTermDebt"`
	ShortTermDebt           float64 `json:"shortTermDebt"`
	TotalDebt               float64 `json:"totalDebt"`
	NetDebt                 float64 `json:"netDebt"`
	TotalStockholdersEquity float64 `json:"totalStockholdersEquity"`
	TotalEquity             float64 `json:"totalEquity"`
	RetainedEarnings        float64 `json:"retainedEarnings"`
	CommonStock             float64 `json:"commonStock"`
	CashAndCashEquivalents  float64 `json:"cashAndCashEquivalents"`
	Inventory               float64 `json:"inventory"`
	AccountsReceivables     float64 `json:"accountsReceivables"`
	AccountPayables         float64 `json:"accountPayables"`
}

// CashFlowStatement represents the FMP cash flow statement response (stable API).
type CashFlowStatement struct {
	Date                   string  `json:"date"`
	Symbol                 string  `json:"symbol"`
	FilingDate             string  `json:"filingDate"`
	FiscalYear             string  `json:"fiscalYear"`
	Period                 string  `json:"period"`
	NetIncome              float64 `json:"netIncome"`
	OperatingCashFlow      float64 `json:"operatingCashFlow"`
	CapitalExpenditure     float64 `json:"capitalExpenditure"`
	FreeCashFlow           float64 `json:"freeCashFlow"`
	DividendsPaid          float64 `json:"commonDividendsPaid"`
	CommonStockRepurchased float64 `json:"commonStockRepurchased"`
	NetCashFromOperating   float64 `json:"netCashProvidedByOperatingActivities"`
	NetCashFromInvesting   float64 `json:"netCashProvidedByInvestingActivities"`
	NetCashFromFinancing   float64 `json:"netCashProvidedByFinancingActivities"`
}

// SearchResult represents a ticker search result.
type SearchResult struct {
	Symbol        string `json:"symbol"`
	Name          string `json:"name"`
	Currency      string `json:"currency"`
	StockExchange string `json:"stockExchange"`
	ExchangeShort string `json:"exchangeShortName"`
}

// Ratios represents the FMP ratios response (stable API).
type Ratios struct {
	Date                   string  `json:"date"`
	Symbol                 string  `json:"symbol"`
	FiscalYear             string  `json:"fiscalYear"`
	Period                 string  `json:"period"`
	CurrentRatio           float64 `json:"currentRatio"`
	QuickRatio             float64 `json:"quickRatio"`
	CashRatio              float64 `json:"cashRatio"`
	GrossProfitMargin      float64 `json:"grossProfitMargin"`
	OperatingProfitMargin  float64 `json:"operatingProfitMargin"`
	PretaxProfitMargin     float64 `json:"pretaxProfitMargin"`
	NetProfitMargin        float64 `json:"netProfitMargin"`
	EffectiveTaxRate       float64 `json:"effectiveTaxRate"`
	AssetTurnover          float64 `json:"assetTurnover"`
	FixedAssetTurnover     float64 `json:"fixedAssetTurnover"`
	InventoryTurnover      float64 `json:"inventoryTurnover"`
	ReceivablesTurnover    float64 `json:"receivablesTurnover"`
	PayablesTurnover       float64 `json:"payablesTurnover"`
	DebtToAssetsRatio      float64 `json:"debtToAssetsRatio"`
	DebtToEquityRatio      float64 `json:"debtToEquityRatio"`
	DebtToCapitalRatio     float64 `json:"debtToCapitalRatio"`
	InterestCoverageRatio  float64 `json:"interestCoverageRatio"`
	FreeCashFlowPerShare   float64 `json:"freeCashFlowPerShare"`
	BookValuePerShare      float64 `json:"bookValuePerShare"`
	PriceToEarningsRatio   float64 `json:"priceToEarningsRatio"`
	PriceToEarningsGrowthRatio float64 `json:"priceToEarningsGrowthRatio"`
	PriceToBookRatio       float64 `json:"priceToBookRatio"`
	PriceToSalesRatio      float64 `json:"priceToSalesRatio"`
	PriceToFreeCashFlowRatio float64 `json:"priceToFreeCashFlowRatio"`
	PriceToOperatingCashFlowRatio float64 `json:"priceToOperatingCashFlowRatio"`
	EnterpriseValueMultiple float64 `json:"enterpriseValueMultiple"`
	DividendYield          float64 `json:"dividendYield"`
	DividendPerShare       float64 `json:"dividendPerShare"`
}

// KeyMetrics represents the FMP key metrics response (stable API).
type KeyMetrics struct {
	Date                     string  `json:"date"`
	Symbol                   string  `json:"symbol"`
	FiscalYear               string  `json:"fiscalYear"`
	Period                   string  `json:"period"`
	MarketCap                float64 `json:"marketCap"`
	EnterpriseValue          float64 `json:"enterpriseValue"`
	EVToSales                float64 `json:"evToSales"`
	EVToOperatingCashFlow    float64 `json:"evToOperatingCashFlow"`
	EVToFreeCashFlow         float64 `json:"evToFreeCashFlow"`
	EVToEBITDA               float64 `json:"evToEBITDA"`
	CurrentRatio             float64 `json:"currentRatio"`
	ReturnOnAssets           float64 `json:"returnOnAssets"`
	ReturnOnEquity           float64 `json:"returnOnEquity"`
	ReturnOnInvestedCapital  float64 `json:"returnOnInvestedCapital"`
	ReturnOnCapitalEmployed  float64 `json:"returnOnCapitalEmployed"`
	EarningsYield            float64 `json:"earningsYield"`
	FreeCashFlowYield        float64 `json:"freeCashFlowYield"`
	CapexToRevenue           float64 `json:"capexToRevenue"`
	WorkingCapital           float64 `json:"workingCapital"`
	TangibleAssetValue       float64 `json:"tangibleAssetValue"`
}

// HistoricalPrice represents a single day's price data.
type HistoricalPrice struct {
	Symbol        string  `json:"symbol"`
	Date          string  `json:"date"`
	Open          float64 `json:"open"`
	High          float64 `json:"high"`
	Low           float64 `json:"low"`
	Close         float64 `json:"close"`
	Volume        int64   `json:"volume"`
	Change        float64 `json:"change"`
	ChangePercent float64 `json:"changePercent"`
}

// InsiderTrade represents an insider trading transaction from the search endpoint.
type InsiderTrade struct {
	Symbol               string  `json:"symbol"`
	FilingDate           string  `json:"filingDate"`
	TransactionDate      string  `json:"transactionDate"`
	ReportingName        string  `json:"reportingName"`
	TypeOfOwner          string  `json:"typeOfOwner"`
	TransactionType      string  `json:"transactionType"`
	AcquisitionOrDisp    string  `json:"acquisitionOrDisposition"`
	SecuritiesOwned      int64   `json:"securitiesOwned"`
	SecuritiesTransacted int64   `json:"securitiesTransacted"`
	Price                float64 `json:"price"`
	SecurityName         string  `json:"securityName"`
}

// InsiderStatistics represents aggregated insider trading statistics by quarter.
type InsiderStatistics struct {
	Symbol               string  `json:"symbol"`
	Year                 int     `json:"year"`
	Quarter              int     `json:"quarter"`
	AcquiredTransactions int     `json:"acquiredTransactions"`
	DisposedTransactions int     `json:"disposedTransactions"`
	TotalAcquired        int64   `json:"totalAcquired"`
	TotalDisposed        int64   `json:"totalDisposed"`
	TotalPurchases       float64 `json:"totalPurchases"`
	TotalSales           float64 `json:"totalSales"`
}

// RatiosTTM represents trailing twelve month ratios from FMP API.
type RatiosTTM struct {
	Symbol                        string  `json:"symbol"`
	PriceToEarningsRatioTTM       float64 `json:"priceToEarningsRatioTTM"`
	PriceToEarningsGrowthRatioTTM float64 `json:"priceToEarningsGrowthRatioTTM"`
	PriceToBookRatioTTM           float64 `json:"priceToBookRatioTTM"`
	PriceToSalesRatioTTM          float64 `json:"priceToSalesRatioTTM"`
	PriceToFreeCashFlowRatioTTM   float64 `json:"priceToFreeCashFlowRatioTTM"`
	DividendYieldTTM              float64 `json:"dividendYieldTTM"`
	// Profitability
	GrossProfitMarginTTM     float64 `json:"grossProfitMarginTTM"`
	OperatingProfitMarginTTM float64 `json:"operatingProfitMarginTTM"`
	NetProfitMarginTTM       float64 `json:"netProfitMarginTTM"`
	// Efficiency
	AssetTurnoverTTM     float64 `json:"assetTurnoverTTM"`
	InventoryTurnoverTTM float64 `json:"inventoryTurnoverTTM"`
	// Solvency
	DebtToEquityRatioTTM  float64 `json:"debtToEquityRatioTTM"`
	CurrentRatioTTM       float64 `json:"currentRatioTTM"`
	QuickRatioTTM         float64 `json:"quickRatioTTM"`
	InterestCoverageRatioTTM float64 `json:"interestCoverageTTM"`
}

// KeyMetricsTTM represents trailing twelve month key metrics from FMP API.
type KeyMetricsTTM struct {
	Symbol                      string  `json:"symbol"`
	EVToEBITDATTM               float64 `json:"evToEBITDATTM"`
	EVToSalesTTM                float64 `json:"evToSalesTTM"`
	MarketCap                   float64 `json:"marketCap"`
	ReturnOnAssetsTTM           float64 `json:"returnOnAssetsTTM"`
	ReturnOnEquityTTM           float64 `json:"returnOnEquityTTM"`
	ReturnOnInvestedCapitalTTM  float64 `json:"returnOnInvestedCapitalTTM"`
}

// DCF represents the FMP discounted cash flow response.
type DCF struct {
	Symbol     string  `json:"symbol"`
	Date       string  `json:"date"`
	DCF        float64 `json:"dcf"`
	StockPrice float64 `json:"stockPrice"`
}

// ETFInfo represents the FMP ETF information response.
type ETFInfo struct {
	Symbol        string  `json:"symbol"`
	Name          string  `json:"name"`
	ExpenseRatio  float64 `json:"expenseRatio"`
	AUM           float64 `json:"aum"`
	InceptionDate string  `json:"inceptionDate"`
	Description   string  `json:"description"`
	AssetClass    string  `json:"assetClass"`
	Exchange      string  `json:"exchange"`
}

// ETFHolding represents a single holding in an ETF.
type ETFHolding struct {
	Asset            string  `json:"asset"`
	Name             string  `json:"name"`
	Shares           float64 `json:"shares"`
	WeightPercentage float64 `json:"weightPercentage"`
	MarketValue      float64 `json:"marketValue"`
}

// ETFSectorWeighting represents sector allocation in an ETF.
type ETFSectorWeighting struct {
	Sector           string `json:"sector"`
	WeightPercentage string `json:"weightPercentage"`
}

// InstitutionalOwnershipHolder represents an institutional holder's position from 13F filings.
type InstitutionalOwnershipHolder struct {
	InvestorName     string  `json:"investorName"`
	CIK              string  `json:"cik"`
	Shares           int64   `json:"shares"`
	Value            int64   `json:"value"`
	Weight           float64 `json:"weight"` // Portfolio weight percentage
	SharesChange     int64   `json:"sharesChange"`
	ChangePercentage float64 `json:"changePercentage"`
	Date             string  `json:"date"`
	// Additional fields that FMP may include
	TotalHoldings      int     `json:"totalHoldings,omitempty"`
	IsNewPosition      bool    `json:"isNewPosition,omitempty"`
	IsSoldOut          bool    `json:"isSoldOut,omitempty"`
	OwnershipPercent   float64 `json:"ownershipPercent,omitempty"`
	LastOwnershipRatio float64 `json:"lastOwnershipRatio,omitempty"`
}
