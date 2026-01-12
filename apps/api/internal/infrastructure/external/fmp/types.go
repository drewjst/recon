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
