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
	Date                 string  `json:"date"`
	Symbol               string  `json:"symbol"`
	FilingDate           string  `json:"filingDate"`
	FiscalYear           string  `json:"fiscalYear"`
	Period               string  `json:"period"`
	Revenue              float64 `json:"revenue"`
	CostOfRevenue        float64 `json:"costOfRevenue"`
	GrossProfit          float64 `json:"grossProfit"`
	// Operating expense breakdown
	ResearchAndDevelopment float64 `json:"researchAndDevelopmentExpenses"`
	SellingGeneralAdmin    float64 `json:"sellingGeneralAndAdministrativeExpenses"`
	OperatingExpenses      float64 `json:"operatingExpenses"`
	OperatingIncome        float64 `json:"operatingIncome"`
	// EBITDA components
	DepreciationAmortization float64 `json:"depreciationAndAmortization"`
	EBITDA                   float64 `json:"ebitda"`
	EBIT                     float64 `json:"ebit"`
	// Non-operating
	InterestExpense         float64 `json:"interestExpense"`
	InterestIncome          float64 `json:"interestIncome"`
	OtherIncomeExpenseNet   float64 `json:"totalOtherIncomeExpensesNet"`
	IncomeBeforeTax         float64 `json:"incomeBeforeTax"`
	IncomeTaxExpense        float64 `json:"incomeTaxExpense"`
	// Net income
	NetIncome            float64 `json:"netIncome"`
	BottomLineNetIncome  float64 `json:"bottomLineNetIncome"`
	// Per share
	EPS                  float64 `json:"eps"`
	EPSDiluted           float64 `json:"epsDiluted"`
	WeightedAvgSharesOut int64   `json:"weightedAverageShsOut"`
	WeightedAvgSharesDil int64   `json:"weightedAverageShsOutDil"`
}

// BalanceSheet represents the FMP balance sheet response (stable API).
type BalanceSheet struct {
	Date       string `json:"date"`
	Symbol     string `json:"symbol"`
	FilingDate string `json:"filingDate"`
	FiscalYear string `json:"fiscalYear"`
	Period     string `json:"period"`

	// Current Assets
	CashAndCashEquivalents    float64 `json:"cashAndCashEquivalents"`
	ShortTermInvestments      float64 `json:"shortTermInvestments"`
	CashAndShortTermInvest    float64 `json:"cashAndShortTermInvestments"`
	AccountsReceivables       float64 `json:"accountsReceivables"`
	NetReceivables            float64 `json:"netReceivables"`
	Inventory                 float64 `json:"inventory"`
	OtherCurrentAssets        float64 `json:"otherCurrentAssets"`
	TotalCurrentAssets        float64 `json:"totalCurrentAssets"`

	// Non-current Assets
	PropertyPlantEquipmentNet float64 `json:"propertyPlantEquipmentNet"`
	Goodwill                  float64 `json:"goodwill"`
	IntangibleAssets          float64 `json:"intangibleAssets"`
	GoodwillAndIntangibles    float64 `json:"goodwillAndIntangibleAssets"`
	LongTermInvestments       float64 `json:"longTermInvestments"`
	TaxAssets                 float64 `json:"taxAssets"`
	OtherNonCurrentAssets     float64 `json:"otherNonCurrentAssets"`
	TotalNonCurrentAssets     float64 `json:"totalNonCurrentAssets"`
	TotalAssets               float64 `json:"totalAssets"`

	// Current Liabilities
	AccountPayables              float64 `json:"accountPayables"`
	ShortTermDebt                float64 `json:"shortTermDebt"`
	DeferredRevenue              float64 `json:"deferredRevenue"`
	TaxPayables                  float64 `json:"taxPayables"`
	OtherCurrentLiabilities      float64 `json:"otherCurrentLiabilities"`
	TotalCurrentLiabilities      float64 `json:"totalCurrentLiabilities"`

	// Non-current Liabilities
	LongTermDebt                 float64 `json:"longTermDebt"`
	DeferredRevenueNonCurrent    float64 `json:"deferredRevenueNonCurrent"`
	DeferredTaxLiabilitiesNonCur float64 `json:"deferredTaxLiabilitiesNonCurrent"`
	OtherNonCurrentLiabilities   float64 `json:"otherNonCurrentLiabilities"`
	TotalNonCurrentLiab          float64 `json:"totalNonCurrentLiabilities"`
	CapitalLeaseObligations      float64 `json:"capitalLeaseObligations"`
	TotalLiabilities             float64 `json:"totalLiabilities"`

	// Equity
	PreferredStock                    float64 `json:"preferredStock"`
	CommonStock                       float64 `json:"commonStock"`
	RetainedEarnings                  float64 `json:"retainedEarnings"`
	AccumulatedOtherComprehensive     float64 `json:"accumulatedOtherComprehensiveIncomeLoss"`
	TreasuryStock                     float64 `json:"treasuryStock"`
	TotalStockholdersEquity           float64 `json:"totalStockholdersEquity"`
	MinorityInterest                  float64 `json:"minorityInterest"`
	TotalEquity                       float64 `json:"totalEquity"`
	TotalLiabilitiesAndEquity         float64 `json:"totalLiabilitiesAndTotalEquity"`

	// Computed/Derived
	TotalInvestments float64 `json:"totalInvestments"`
	TotalDebt        float64 `json:"totalDebt"`
	NetDebt          float64 `json:"netDebt"`
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
	Date                          string  `json:"date"`
	Symbol                        string  `json:"symbol"`
	FiscalYear                    string  `json:"fiscalYear"`
	Period                        string  `json:"period"`
	CurrentRatio                  float64 `json:"currentRatio"`
	QuickRatio                    float64 `json:"quickRatio"`
	CashRatio                     float64 `json:"cashRatio"`
	GrossProfitMargin             float64 `json:"grossProfitMargin"`
	OperatingProfitMargin         float64 `json:"operatingProfitMargin"`
	PretaxProfitMargin            float64 `json:"pretaxProfitMargin"`
	NetProfitMargin               float64 `json:"netProfitMargin"`
	EffectiveTaxRate              float64 `json:"effectiveTaxRate"`
	AssetTurnover                 float64 `json:"assetTurnover"`
	FixedAssetTurnover            float64 `json:"fixedAssetTurnover"`
	InventoryTurnover             float64 `json:"inventoryTurnover"`
	ReceivablesTurnover           float64 `json:"receivablesTurnover"`
	PayablesTurnover              float64 `json:"payablesTurnover"`
	DebtToAssetsRatio             float64 `json:"debtToAssetsRatio"`
	DebtToEquityRatio             float64 `json:"debtToEquityRatio"`
	DebtToCapitalRatio            float64 `json:"debtToCapitalRatio"`
	InterestCoverageRatio         float64 `json:"interestCoverageRatio"`
	FreeCashFlowPerShare          float64 `json:"freeCashFlowPerShare"`
	BookValuePerShare             float64 `json:"bookValuePerShare"`
	PriceToEarningsRatio          float64 `json:"priceToEarningsRatio"`
	PriceToEarningsGrowthRatio    float64 `json:"priceToEarningsGrowthRatio"`
	PriceToBookRatio              float64 `json:"priceToBookRatio"`
	PriceToSalesRatio             float64 `json:"priceToSalesRatio"`
	PriceToFreeCashFlowRatio      float64 `json:"priceToFreeCashFlowRatio"`
	PriceToOperatingCashFlowRatio float64 `json:"priceToOperatingCashFlowRatio"`
	EnterpriseValueMultiple       float64 `json:"enterpriseValueMultiple"`
	DividendYield                 float64 `json:"dividendYield"`
	DividendPerShare              float64 `json:"dividendPerShare"`
}

// KeyMetrics represents the FMP key metrics response (stable API).
type KeyMetrics struct {
	Date                    string  `json:"date"`
	Symbol                  string  `json:"symbol"`
	FiscalYear              string  `json:"fiscalYear"`
	Period                  string  `json:"period"`
	MarketCap               float64 `json:"marketCap"`
	EnterpriseValue         float64 `json:"enterpriseValue"`
	EVToSales               float64 `json:"evToSales"`
	EVToOperatingCashFlow   float64 `json:"evToOperatingCashFlow"`
	EVToFreeCashFlow        float64 `json:"evToFreeCashFlow"`
	EVToEBITDA              float64 `json:"evToEBITDA"`
	CurrentRatio            float64 `json:"currentRatio"`
	ReturnOnAssets          float64 `json:"returnOnAssets"`
	ReturnOnEquity          float64 `json:"returnOnEquity"`
	ReturnOnInvestedCapital float64 `json:"returnOnInvestedCapital"`
	ReturnOnCapitalEmployed float64 `json:"returnOnCapitalEmployed"`
	EarningsYield           float64 `json:"earningsYield"`
	FreeCashFlowYield       float64 `json:"freeCashFlowYield"`
	CapexToRevenue          float64 `json:"capexToRevenue"`
	WorkingCapital          float64 `json:"workingCapital"`
	TangibleAssetValue      float64 `json:"tangibleAssetValue"`
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

// SenateTrade represents a Senate member's stock trade from FMP API.
type SenateTrade struct {
	Symbol            string `json:"symbol"`
	FirstName         string `json:"firstName"`
	LastName          string `json:"lastName"`
	Office            string `json:"office"`
	District          string `json:"district"` // State code (e.g., "TX")
	TransactionDate   string `json:"transactionDate"`
	DisclosureDate    string `json:"disclosureDate"`
	Type              string `json:"type"`   // "Purchase", "Sale", "Sale (Full)", "Sale (Partial)"
	Amount            string `json:"amount"` // Value range (e.g., "$100,001 - $250,000")
	Owner             string `json:"owner"`  // "Self", "Spouse", "Joint", "Child"
	AssetType         string `json:"assetType"`
	AssetDescription  string `json:"assetDescription"`
	CapitalGains      string `json:"capitalGainsOver200USD"`
	Comment           string `json:"comment"`
	Link              string `json:"link"`
}

// HouseTrade represents a House member's stock trade from FMP API.
type HouseTrade struct {
	Symbol            string `json:"symbol"`
	FirstName         string `json:"firstName"`
	LastName          string `json:"lastName"`
	Office            string `json:"office"`
	District          string `json:"district"` // Congressional district (e.g., "CA17")
	TransactionDate   string `json:"transactionDate"`
	DisclosureDate    string `json:"disclosureDate"`
	Type              string `json:"type"`   // "Purchase", "Sale", "Exchange"
	Amount            string `json:"amount"` // Value range
	Owner             string `json:"owner"`  // "Self", "Spouse", "Joint"
	AssetType         string `json:"assetType"`
	AssetDescription  string `json:"assetDescription"`
	CapitalGains      string `json:"capitalGainsOver200USD"`
	Comment           string `json:"comment"`
	Link              string `json:"link"`
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
	DebtToEquityRatioTTM     float64 `json:"debtToEquityRatioTTM"`
	CurrentRatioTTM          float64 `json:"currentRatioTTM"`
	QuickRatioTTM            float64 `json:"quickRatioTTM"`
	InterestCoverageRatioTTM float64 `json:"interestCoverageTTM"`
}

// KeyMetricsTTM represents trailing twelve month key metrics from FMP API.
type KeyMetricsTTM struct {
	Symbol                     string  `json:"symbol"`
	EVToEBITDATTM              float64 `json:"evToEBITDATTM"`
	EVToSalesTTM               float64 `json:"evToSalesTTM"`
	MarketCap                  float64 `json:"marketCap"`
	ReturnOnAssetsTTM          float64 `json:"returnOnAssetsTTM"`
	ReturnOnEquityTTM          float64 `json:"returnOnEquityTTM"`
	ReturnOnInvestedCapitalTTM float64 `json:"returnOnInvestedCapitalTTM"`
	// Additional fields for ETF valuations
	PERatioTTM        float64 `json:"peRatioTTM"`
	PriceToSalesTTM   float64 `json:"priceToSalesRatioTTM"`
	PBRatioTTM        float64 `json:"pbRatioTTM"`
	PriceToCashFlowTTM float64 `json:"priceToFreeCashFlowsRatioTTM"`
	DividendYieldTTM  float64 `json:"dividendYieldTTM"`
}

// DCF represents the FMP discounted cash flow response.
type DCF struct {
	Symbol     string  `json:"symbol"`
	Date       string  `json:"date"`
	DCF        float64 `json:"dcf"`
	StockPrice float64 `json:"stockPrice"`
}

// ETFInfo represents the FMP ETF information response.
// From GET /stable/etf/info?symbol={ticker}
type ETFInfo struct {
	Symbol                 string  `json:"symbol"`
	Name                   string  `json:"name"`
	ExpenseRatio           float64 `json:"expenseRatio"`           // Gross expense ratio as decimal
	NetExpenseRatio        float64 `json:"netExpenseRatio"`        // Net expense ratio as decimal (preferred)
	AssetsUnderManagement  float64 `json:"assetsUnderManagement"`  // AUM in USD
	NAV                    float64 `json:"nav"`
	HoldingsCount          int     `json:"holdingsCount"`
	AvgVolume              int64   `json:"avgVolume"`
	InceptionDate          string  `json:"inceptionDate"`
	Domicile               string  `json:"domicile"`
	Website                string  `json:"website"`
	ETFCompany             string  `json:"etfCompany"`
	Description            string  `json:"description"`
	AssetClass             string  `json:"assetClass"`
}

// ETFHolding represents a single holding in an ETF.
type ETFHolding struct {
	Asset            string  `json:"asset"`
	Name             string  `json:"name"`
	SharesNumber     float64 `json:"sharesNumber"`
	WeightPercentage float64 `json:"weightPercentage"`
	MarketValue      float64 `json:"marketValue"`
}

// ETFSectorWeighting represents sector allocation in an ETF.
type ETFSectorWeighting struct {
	Sector           string  `json:"sector"`
	WeightPercentage float64 `json:"weightPercentage"`
}

// ETFCountryWeighting represents country/region allocation in an ETF.
// Note: FMP returns weightPercentage as a string with % suffix for this endpoint
type ETFCountryWeighting struct {
	Country          string `json:"country"`
	WeightPercentage string `json:"weightPercentage"`
}


// InstitutionalOwnershipHolder represents an institutional holder's position from 13F filings.
// Field names match the FMP stable API /institutional-ownership/extract-analytics/holder endpoint.
type InstitutionalOwnershipHolder struct {
	InvestorName string `json:"investorName"`
	CIK          string `json:"cik"`
	Date         string `json:"date"`
	// Shares data
	Shares           int64 `json:"sharesNumber"`
	LastShares       int64 `json:"lastSharesNumber"`
	SharesChange     int64 `json:"changeInSharesNumber"`
	ChangePercentage float64 `json:"changeInSharesNumberPercentage"`
	// Value/market data
	Value            int64   `json:"marketValue"`
	LastValue        int64   `json:"lastMarketValue"`
	ValueChange      int64   `json:"changeInMarketValue"`
	Weight           float64 `json:"weight"` // Portfolio weight percentage
	// Ownership data
	OwnershipPercent     float64 `json:"ownership"`
	LastOwnershipPercent float64 `json:"lastOwnership"`
	OwnershipChange      float64 `json:"changeInOwnership"`
	// Position flags
	IsNewPosition bool `json:"isNew"`
	IsSoldOut     bool `json:"isSoldOut"`
}

// InstitutionalPositionsSummary represents aggregated institutional ownership data.
// From GET /stable/institutional-ownership/symbol-positions-summary
type InstitutionalPositionsSummary struct {
	Symbol               string  `json:"symbol"`
	Year                 int     `json:"year"`
	Quarter              int     `json:"quarter"`
	InvestorsHolding     int     `json:"investorsHolding"`
	LastInvestorsHolding int     `json:"lastInvestorsHolding"`
	InvestorsHoldingChan int     `json:"investorsHoldingChange"`
	TotalShares          int64   `json:"totalShares"`
	LastTotalShares      int64   `json:"lastTotalShares"`
	TotalSharesChange    int64   `json:"totalSharesChange"`
	OwnershipPercent     float64 `json:"ownershipPercent"`
	LastOwnershipPercent float64 `json:"lastOwnershipPercent"`
}

// InstitutionalHolderBreakdown represents holder type breakdown from 13F filings.
// From GET /stable/institutional-ownership/holder-industry-breakdown
type InstitutionalHolderBreakdown struct {
	Symbol               string  `json:"symbol"`
	Year                 int     `json:"year"`
	Quarter              int     `json:"quarter"`
	HolderType           string  `json:"holderType"` // "Investment Advisor", "Hedge Fund", "Pension Fund", etc.
	InvestorCount        int     `json:"investorCount"`
	TotalShares          int64   `json:"totalShares"`
	TotalValue           int64   `json:"totalValue"`
	OwnershipPercent     float64 `json:"ownershipPercent"`
	SharesChange         int64   `json:"sharesChange"`
	SharesChangePercent  float64 `json:"sharesChangePercent"`
}

// =============================================================================
// Analyst Estimates Types
// =============================================================================

// GradesConsensus represents FMP /grades-consensus response with pre-aggregated counts.
type GradesConsensus struct {
	Symbol     string `json:"symbol"`
	StrongBuy  int    `json:"strongBuy"`
	Buy        int    `json:"buy"`
	Hold       int    `json:"hold"`
	Sell       int    `json:"sell"`
	StrongSell int    `json:"strongSell"`
	Consensus  string `json:"consensus"`
}

// PriceTargetConsensus represents FMP price target consensus response.
type PriceTargetConsensus struct {
	Symbol          string  `json:"symbol"`
	TargetHigh      float64 `json:"targetHigh"`
	TargetLow       float64 `json:"targetLow"`
	TargetConsensus float64 `json:"targetConsensus"`
	TargetMedian    float64 `json:"targetMedian"`
}

// AnalystEstimate represents FMP analyst estimates response for EPS and revenue.
// Note: FMP stable API uses different field names than the legacy v3 API.
type AnalystEstimate struct {
	Symbol string `json:"symbol"`
	Date   string `json:"date"`
	// Revenue estimates
	RevenueLow  float64 `json:"revenueLow"`
	RevenueHigh float64 `json:"revenueHigh"`
	RevenueAvg  float64 `json:"revenueAvg"`
	// EPS estimates
	EPSLow  float64 `json:"epsLow"`
	EPSHigh float64 `json:"epsHigh"`
	EPSAvg  float64 `json:"epsAvg"`
	// Net Income estimates
	NetIncomeLow  float64 `json:"netIncomeLow"`
	NetIncomeHigh float64 `json:"netIncomeHigh"`
	NetIncomeAvg  float64 `json:"netIncomeAvg"`
	// EBITDA estimates
	EBITDALow  float64 `json:"ebitdaLow"`
	EBITDAHigh float64 `json:"ebitdaHigh"`
	EBITDAAvg  float64 `json:"ebitdaAvg"`
	// Number of analysts
	NumberAnalystEstimatedRevenue int `json:"numberAnalystEstimatedRevenue"`
	NumberAnalystsEstimatedEps    int `json:"numberAnalystsEstimatedEps"`
}

// =============================================================================
// Stock Peers Types
// =============================================================================

// StockPeer represents a single peer company from FMP stock-peers endpoint.
type StockPeer struct {
	Symbol      string  `json:"symbol"`
	CompanyName string  `json:"companyName"`
	Price       float64 `json:"price"`
	MktCap      int64   `json:"mktCap"`
}

// StockPeersResponse is deprecated - FMP now returns []StockPeer directly.
type StockPeersResponse struct {
	Symbol    string   `json:"symbol"`
	PeersList []string `json:"peersList"`
}

// =============================================================================
// Owner Earnings Types
// =============================================================================

// OwnerEarnings represents the FMP owner earnings response.
// Owner earnings = net income + D&A - maintenance capex
type OwnerEarnings struct {
	Symbol                 string  `json:"symbol"`
	ReportedCurrency       string  `json:"reportedCurrency"`
	FiscalYear             string  `json:"fiscalYear"` // API returns string, not int
	Period                 string  `json:"period"`
	Date                   string  `json:"date"`
	AveragePPE             float64 `json:"averagePPE"`
	MaintenanceCapex       float64 `json:"maintenanceCapex"`
	OwnersEarnings         float64 `json:"ownersEarnings"`         // Note: API uses "owners" with 's'
	GrowthCapex            float64 `json:"growthCapex"`
	OwnersEarningsPerShare float64 `json:"ownersEarningsPerShare"` // Note: API uses "owners" with 's'
}

// FinancialGrowth represents growth metrics from FMP's financial-growth endpoint.
// These are pre-calculated YoY growth rates for key financial metrics.
type FinancialGrowth struct {
	Symbol                string  `json:"symbol"`
	Date                  string  `json:"date"`
	Period                string  `json:"period"`
	RevenueGrowth         float64 `json:"revenueGrowth"`             // Revenue growth rate (decimal, e.g., 0.15 = 15%)
	GrossProfitGrowth     float64 `json:"grossProfitGrowth"`         // Gross profit growth rate
	EBITGrowth            float64 `json:"ebitGrowth"`                // EBIT growth rate
	OperatingIncomeGrowth float64 `json:"operatingIncomeGrowth"`     // Operating income growth rate
	NetIncomeGrowth       float64 `json:"netIncomeGrowth"`           // Net income growth rate
	EPSGrowth             float64 `json:"epsgrowth"`                 // EPS growth rate (note: lowercase in API)
	EPSDilutedGrowth      float64 `json:"epsdilutedGrowth"`          // Diluted EPS growth rate
	FreeCashFlowGrowth    float64 `json:"freeCashFlowGrowth"`        // FCF growth rate
	DividendsGrowth       float64 `json:"dividendsperShareGrowth"`   // Dividends per share growth (note: lowercase)
	OperatingCFGrowth     float64 `json:"operatingCashFlowGrowth"`   // Operating cash flow growth
	TenYRevenueGrowthPSh  float64 `json:"tenYRevenueGrowthPerShare"` // 10Y revenue growth per share
}

// =============================================================================
// Screener Types
// =============================================================================

// ScreenerResult represents a single result from FMP's company screener endpoint.
type ScreenerResult struct {
	Symbol    string  `json:"symbol"`
	Name      string  `json:"companyName"`
	MarketCap float64 `json:"marketCap"`
	Sector    string  `json:"sector"`
	Industry  string  `json:"industry"`
	Exchange  string  `json:"exchange"`
	Price     float64 `json:"price"`
	Beta      float64 `json:"beta"`
	Volume    int64   `json:"volume"`
	Country   string  `json:"country"`
	Image     string  `json:"image"`
}

// =============================================================================
// News Types
// =============================================================================

// NewsArticle represents a news article from FMP's stock news endpoint.
type NewsArticle struct {
	Symbol        string `json:"symbol"`
	PublishedDate string `json:"publishedDate"`
	Title         string `json:"title"`
	Text          string `json:"text"`
	URL           string `json:"url"`
	Site          string `json:"site"`
}
