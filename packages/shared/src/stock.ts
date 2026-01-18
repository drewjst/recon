/**
 * Stock domain types for the Recon API.
 *
 * These interfaces define the contract for GET /api/stock/{ticker}.
 * The Go backend must produce JSON that matches these types exactly.
 */

// =============================================================================
// Core Company Information
// =============================================================================

/**
 * Basic company identification and classification.
 * This data rarely changes and can be cached aggressively.
 */
export interface Company {
  /** Stock ticker symbol (e.g., "AAPL", "MSFT") */
  ticker: string;
  /** Full company name */
  name: string;
  /** Stock exchange (e.g., "NASDAQ", "NYSE") */
  exchange: string;
  /** GICS sector classification (e.g., "Technology", "Healthcare") */
  sector: string;
  /** GICS industry classification (e.g., "Software", "Semiconductors") */
  industry: string;
  /** Brief company description/business summary */
  description?: string;
}

// =============================================================================
// Real-Time Market Data
// =============================================================================

/**
 * Current market quote data.
 * Updates frequently during market hours.
 */
export interface Quote {
  /** Current stock price in USD */
  price: number;
  /** Absolute price change from previous close */
  change: number;
  /** Percentage change from previous close */
  changePercent: number;
  /** Trading volume for current session */
  volume: number;
  /** Total market capitalization in USD */
  marketCap: number;
  /** Highest price in trailing 52 weeks */
  fiftyTwoWeekHigh: number;
  /** Lowest price in trailing 52 weeks */
  fiftyTwoWeekLow: number;
  /** ISO 8601 timestamp of when quote was captured */
  asOf: string;
}

// =============================================================================
// Scoring Systems
// =============================================================================

/**
 * Piotroski F-Score breakdown.
 *
 * A value investing score (0-9) based on 9 binary tests across
 * profitability, leverage/liquidity, and operating efficiency.
 * Scores 8-9 indicate strong fundamentals, 0-2 indicate weakness.
 *
 * @see https://www.investopedia.com/terms/p/piotroski-score.asp
 */
export interface PiotroskiScore {
  /** Total score from 0-9 (sum of all binary tests) */
  score: number;
  /** Individual test results */
  breakdown: {
    // Profitability signals (4 points max)
    /** Net income > 0 in current year */
    positiveNetIncome: boolean;
    /** Return on Assets > 0 in current year */
    positiveROA: boolean;
    /** Operating cash flow > 0 in current year */
    positiveOperatingCashFlow: boolean;
    /** Operating cash flow > net income (earnings quality) */
    cashFlowGreaterThanNetIncome: boolean;

    // Leverage & Liquidity signals (3 points max)
    /** Long-term debt ratio decreased YoY */
    lowerLongTermDebt: boolean;
    /** Current ratio increased YoY */
    higherCurrentRatio: boolean;
    /** No new share issuance in past year */
    noNewShares: boolean;

    // Operating Efficiency signals (2 points max)
    /** Gross margin increased YoY */
    higherGrossMargin: boolean;
    /** Asset turnover ratio increased YoY */
    higherAssetTurnover: boolean;
  };
}

/**
 * Rule of 40 calculation for SaaS/growth companies.
 *
 * The Rule of 40 states that a healthy SaaS company's revenue growth rate
 * plus profit margin should equal or exceed 40%. This balances growth
 * against profitability.
 *
 * @see https://www.bain.com/insights/rule-of-40-for-saas-companies/
 */
export interface RuleOf40 {
  /** Combined score (revenue growth % + profit margin %) */
  score: number;
  /** Year-over-year revenue growth as percentage */
  revenueGrowthPercent: number;
  /** Profit margin (typically EBITDA or FCF margin) as percentage */
  profitMarginPercent: number;
  /** Whether the company passes the Rule of 40 (score >= 40) */
  passed: boolean;
}

/**
 * Altman Z-Score for bankruptcy prediction.
 *
 * A financial model that predicts the probability of bankruptcy.
 * Originally developed for manufacturing companies but widely applied.
 *
 * Zones:
 * - Safe (Z > 2.99): Low bankruptcy risk
 * - Gray (1.81 < Z < 2.99): Uncertain, needs monitoring
 * - Distress (Z < 1.81): High bankruptcy risk
 *
 * @see https://www.investopedia.com/terms/a/altman.asp
 */
export interface AltmanZScore {
  /** The calculated Z-Score value */
  score: number;
  /** Risk classification based on score thresholds */
  zone: 'distress' | 'gray' | 'safe';
  /** Individual components of the Z-Score formula */
  components: {
    /** Working Capital / Total Assets (liquidity) */
    workingCapitalToAssets: number;
    /** Retained Earnings / Total Assets (cumulative profitability) */
    retainedEarningsToAssets: number;
    /** EBIT / Total Assets (operating efficiency) */
    ebitToAssets: number;
    /** Market Cap / Total Liabilities (solvency) */
    marketCapToLiabilities: number;
    /** Sales / Total Assets (asset efficiency) */
    salesToAssets: number;
  };
}

/**
 * DCF (Discounted Cash Flow) valuation analysis.
 *
 * Compares intrinsic value calculated from projected cash flows
 * against current market price to determine if stock is fairly valued.
 */
export interface DCFValuation {
  /** Calculated intrinsic value per share based on DCF model */
  intrinsicValue: number;
  /** Current market price per share */
  currentPrice: number;
  /** Percentage difference: ((intrinsicValue - currentPrice) / currentPrice) * 100 */
  differencePercent: number;
  /** Valuation assessment based on difference threshold (±15%) */
  assessment: 'Undervalued' | 'Fairly Valued' | 'Overvalued' | 'N/A';
}

/**
 * Aggregated scoring results with DCF valuation.
 */
export interface Scores {
  /** Piotroski F-Score (value/quality) */
  piotroski: PiotroskiScore;
  /** Rule of 40 (growth + profitability balance) */
  ruleOf40: RuleOf40;
  /** Altman Z-Score (financial health/bankruptcy risk) */
  altmanZ: AltmanZScore;
  /** DCF valuation analysis */
  dcfValuation: DCFValuation;
}

// =============================================================================
// Signal System
// =============================================================================

/**
 * Signal sentiment classification.
 * - bullish: Positive indicator, potential buy signal
 * - bearish: Negative indicator, potential sell signal
 * - warning: Risk flag that requires attention
 */
export type SignalType = 'bullish' | 'bearish' | 'warning';

/**
 * Signal source category for filtering and grouping.
 */
export type SignalCategory =
  | 'insider' // Insider buying/selling activity
  | 'institutional' // Institutional ownership changes
  | 'fundamental' // Earnings, revenue, margin changes
  | 'valuation' // P/E, P/B, relative value metrics
  | 'technical'; // Price action, momentum indicators

/**
 * A discrete signal or flag surfaced to the user.
 *
 * Signals are actionable insights derived from data analysis.
 * They're sorted by priority and grouped by category in the UI.
 */
export interface Signal {
  /** Sentiment classification */
  type: SignalType;
  /** Source category for grouping */
  category: SignalCategory;
  /** Human-readable signal description */
  message: string;
  /** Importance ranking (1-5, higher = more important) */
  priority: number;
  /** Optional supporting data points */
  data?: Record<string, number | string>;
}

// =============================================================================
// Valuation Metrics
// =============================================================================

/**
 * A single valuation metric with sector context.
 *
 * Comparing raw valuation numbers is meaningless without context.
 * Each metric includes the sector median and percentile ranking
 * to show whether the stock is cheap/expensive relative to peers.
 */
export interface ValuationMetric {
  /** The stock's metric value (null if not calculable) */
  value: number | null;
  /** Median value for stocks in the same sector */
  sectorMedian: number | null;
  /** Percentile rank within sector (0-100, lower = cheaper) */
  percentile?: number;
}

/**
 * Comprehensive valuation metrics with sector comparisons.
 */
export interface Valuation {
  /** Price-to-Earnings ratio (trailing twelve months) */
  pe: ValuationMetric;
  /** Forward P/E based on analyst estimates */
  forwardPe: ValuationMetric;
  /** PEG ratio (P/E divided by earnings growth rate) */
  peg: ValuationMetric;
  /** Enterprise Value to EBITDA */
  evToEbitda: ValuationMetric;
  /** Price to Free Cash Flow */
  priceToFcf: ValuationMetric;
  /** Price to Book Value */
  priceToBook: ValuationMetric;
}

// =============================================================================
// Institutional Holdings
// =============================================================================

/**
 * A single institutional holder's position.
 *
 * Data sourced from 13F filings, which are reported quarterly
 * with a 45-day delay. Position changes indicate smart money flow.
 */
export interface InstitutionalHolder {
  /** Institution/fund name */
  fundName: string;
  /** SEC Central Index Key for the fund */
  fundCik: string;
  /** Number of shares held */
  shares: number;
  /** Market value of position in USD */
  value: number;
  /** Position size as percentage of fund's portfolio */
  portfolioPercent: number;
  /** Change in shares from previous quarter */
  changeShares: number;
  /** Percentage change in position size */
  changePercent: number;
  /** Quarter end date for this filing (ISO 8601) */
  quarterDate: string;
}

/**
 * Aggregated institutional holdings data.
 */
export interface Holdings {
  /** Top institutional holders by position size */
  topInstitutional: InstitutionalHolder[];
  /** Total percentage of shares held by institutions */
  totalInstitutionalOwnership: number;
  /** Net change in institutional shares (positive = accumulation) */
  netChangeShares: number;
  /**
   * Consecutive quarters of accumulation (positive) or distribution (negative).
   * e.g., 3 means institutions have been buying for 3 quarters straight.
   */
  netChangeQuarters: number;
}

// =============================================================================
// Performance Metrics
// =============================================================================

/**
 * Price performance over various time periods.
 */
export interface Performance {
  /** 1-day price change percentage */
  day1Change: number;
  /** 1-week price change percentage */
  week1Change: number;
  /** 1-month price change percentage */
  month1Change: number;
  /** Year-to-date price change percentage */
  ytdChange: number;
  /** 1-year price change percentage */
  year1Change: number;
  /** Current price as percentage of 52-week high */
  percentOf52WeekHigh: number;
}

// =============================================================================
// Insider Transactions
// =============================================================================

/**
 * A single insider transaction from Form 4 filings.
 *
 * Insider buying is often considered a bullish signal since insiders
 * have the best view into company prospects. Selling is less meaningful
 * as insiders sell for many non-bearish reasons (diversification, taxes).
 */
export interface InsiderTrade {
  /** Name of the insider */
  insiderName: string;
  /** Insider's title/role (e.g., "CEO", "Director", "CFO") */
  title: string;
  /** Transaction type */
  tradeType: 'buy' | 'sell';
  /** Number of shares transacted */
  shares: number;
  /** Price per share in USD */
  price: number;
  /** Total transaction value in USD */
  value: number;
  /** Date of transaction (ISO 8601) */
  tradeDate: string;
}

/**
 * Aggregated insider trading activity over 90 days.
 */
export interface InsiderActivity {
  /** Recent insider trades */
  trades: InsiderTrade[];
  /** Number of buy transactions in last 90 days */
  buyCount90d: number;
  /** Number of sell transactions in last 90 days */
  sellCount90d: number;
  /** Net dollar value (positive = net buying) */
  netValue90d: number;
}

// =============================================================================
// Sector Metrics (used across Profitability, Financial Health, Growth, Earnings Quality)
// =============================================================================

/**
 * A single metric with sector context for comparison.
 *
 * Each metric includes the sector range (min, median, max) and a percentile
 * ranking showing where the stock falls within its sector.
 */
export interface SectorMetric {
  /** The stock's metric value */
  value: number;
  /** Minimum value typically seen in this sector */
  sectorMin: number;
  /** Median value for stocks in the same sector */
  sectorMedian: number;
  /** Maximum value typically seen in this sector */
  sectorMax: number;
  /** Percentile rank within sector (0-100, higher = better) */
  percentile: number;
}

// =============================================================================
// Profitability Metrics
// =============================================================================

/**
 * Profitability metrics with sector comparisons.
 *
 * These metrics measure how efficiently a company generates profits.
 */
export interface Profitability {
  /** Return on Invested Capital - measures efficiency of capital deployment (higher is better) */
  roic: SectorMetric;
  /** Return on Equity - measures return to shareholders (higher is better) */
  roe: SectorMetric;
  /** Operating Margin percentage - measures operational efficiency (higher is better) */
  operatingMargin: SectorMetric;
  /** Gross Margin percentage - measures production efficiency (higher is better) */
  grossMargin?: SectorMetric;
  /** Net Margin percentage - bottom line profitability (higher is better) */
  netMargin?: SectorMetric;
}

// =============================================================================
// Financial Health Metrics
// =============================================================================

/**
 * Financial health metrics with sector comparisons.
 *
 * These metrics assess the company's balance sheet strength and liquidity.
 */
export interface FinancialHealth {
  /** Debt to Equity ratio - measures leverage (lower is better for most sectors) */
  debtToEquity: SectorMetric;
  /** Current Ratio - measures short-term liquidity (higher is better) */
  currentRatio: SectorMetric;
  /** Asset Turnover - measures efficiency of asset utilization (higher is better) */
  assetTurnover: SectorMetric;
}

// =============================================================================
// Growth Metrics
// =============================================================================

/**
 * Growth metrics with sector comparisons.
 *
 * These metrics show how fast the company is growing.
 */
export interface Growth {
  /** Year-over-year revenue growth rate percentage */
  revenueGrowthYoY: SectorMetric;
  /** Year-over-year earnings per share growth rate percentage */
  epsGrowthYoY: SectorMetric;
  /** Projected EPS growth based on analyst estimates */
  projectedEpsGrowth?: SectorMetric;
  /** Free Cash Flow (TTM) in millions */
  freeCashFlowTTM?: SectorMetric;
  /** Year-over-year operating cash flow growth rate percentage */
  cashFlowGrowthYoY?: SectorMetric;
}

// =============================================================================
// Earnings Quality Metrics
// =============================================================================

/**
 * Operating metrics and earnings quality with sector comparisons.
 *
 * These metrics assess operational efficiency and the quality/sustainability of earnings.
 */
export interface EarningsQuality {
  /**
   * Accrual Ratio = (Net Income - Operating Cash Flow) / Total Assets
   * Lower values indicate higher quality earnings (more cash-based)
   */
  accrualRatio: SectorMetric;
  /**
   * Share Buyback Yield = Shares Repurchased / Market Cap
   * Higher values indicate shareholder-friendly capital return
   */
  buybackYield: SectorMetric;
  /**
   * Revenue per Employee = Revenue TTM / Full-time Employees
   * Higher values indicate better workforce productivity
   */
  revenuePerEmployee?: SectorMetric;
  /**
   * Income per Employee = Net Income TTM / Full-time Employees
   * Higher values indicate better workforce profitability
   */
  incomePerEmployee?: SectorMetric;
}

// =============================================================================
// Financial Metrics
// =============================================================================

/**
 * Key financial metrics derived from financial statements.
 *
 * These metrics provide a snapshot of the company's financial health,
 * profitability, and capital efficiency. All percentages are decimals
 * (e.g., 0.25 for 25%).
 */
export interface Financials {
  /** Year-over-year revenue growth rate */
  revenueGrowthYoY: number;
  /** Gross profit / Revenue */
  grossMargin: number;
  /** Operating income / Revenue */
  operatingMargin: number;
  /** Net income / Revenue */
  netMargin: number;
  /** Free cash flow / Revenue */
  fcfMargin: number;
  /** Return on Equity (Net Income / Shareholders' Equity) */
  roe: number;
  /** Return on Invested Capital */
  roic: number;
  /** Total Debt / Total Equity */
  debtToEquity: number;
  /** Current Assets / Current Liabilities */
  currentRatio: number;
  /** EBIT / Interest Expense (null if no debt) */
  interestCoverage: number | null;
}

// =============================================================================
// Metadata
// =============================================================================

/**
 * Data freshness metadata.
 *
 * Different data sources update at different frequencies.
 * This metadata helps users understand how current each section is.
 */
export interface DataMeta {
  /** Quarter end date for fundamental data (e.g., "2024-03-31") */
  fundamentalsAsOf: string;
  /** Quarter end date for holdings data (from 13F filings) */
  holdingsAsOf: string;
  /** Timestamp of price quote */
  priceAsOf: string;
  /** Timestamp when this response was generated */
  generatedAt: string;
}

// =============================================================================
// Asset Type
// =============================================================================

/**
 * Discriminator for stock vs ETF responses.
 * Determines which view to render and which fields are populated.
 */
export type AssetType = 'stock' | 'etf';

// =============================================================================
// ETF-Specific Types
// =============================================================================

/**
 * A single holding within an ETF portfolio.
 */
export interface ETFHolding {
  /** Ticker symbol of the holding */
  ticker: string;
  /** Company/security name */
  name: string;
  /** Sector classification of the holding */
  sector?: string;
  /** Number of shares held */
  shares: number;
  /** Weight as percentage of total ETF (e.g., 7.5 for 7.5%) */
  weightPercent: number;
  /** Market value in USD */
  marketValue: number;
}

/**
 * Sector allocation within an ETF.
 */
export interface ETFSectorWeight {
  /** Sector name (e.g., "Technology", "Healthcare") */
  sector: string;
  /** Weight as percentage (e.g., 28.5 for 28.5%) */
  weightPercent: number;
}

/**
 * Geographic allocation within an ETF.
 */
export interface ETFRegionWeight {
  /** Region name (e.g., "North America", "Europe Developed") */
  region: string;
  /** Weight as percentage (e.g., 65.0 for 65%) */
  weightPercent: number;
}

/**
 * Market cap distribution of ETF holdings.
 */
export interface ETFMarketCap {
  /** Mega cap holdings percentage (>$200B) */
  mega: number;
  /** Big cap holdings percentage ($10B-$200B) */
  big: number;
  /** Medium cap holdings percentage ($2B-$10B) */
  medium: number;
  /** Small cap holdings percentage ($300M-$2B) */
  small: number;
  /** Micro cap holdings percentage (<$300M) */
  micro: number;
}

/**
 * Aggregate valuation metrics for ETF holdings.
 */
export interface ETFValuations {
  /** Weighted average Price/Earnings ratio of holdings */
  pe: number;
  /** Weighted average Price/Book ratio of holdings */
  pb: number;
  /** Weighted average Price/Sales ratio of holdings */
  ps: number;
  /** Weighted average Price/Cash Flow ratio of holdings */
  pcf: number;
  /** Dividend yield of the ETF */
  dividendYield: number;
}

/**
 * Historical performance of an ETF.
 */
export interface ETFPerformance {
  /** Year-to-date return percentage */
  ytd: number;
  /** 1-year return percentage */
  y1: number;
  /** 3-year annualized return percentage */
  y3: number;
  /** 5-year annualized return percentage */
  y5: number;
  /** 10-year annualized return percentage (optional, may not be available for newer ETFs) */
  y10?: number;
}

/**
 * ETF-specific data not applicable to individual stocks.
 */
export interface ETFData {
  /** Annual expense ratio as percentage (e.g., 0.09 for 0.09%) */
  expenseRatio: number;
  /** Assets under management / Net assets in USD */
  aum: number;
  /** Net Asset Value per share */
  nav: number;
  /** Average daily trading volume */
  avgVolume: number;
  /** Beta relative to market (1.0 = market) */
  beta: number;
  /** Total number of holdings in the ETF */
  holdingsCount: number;
  /** Fund domicile country (e.g., "US", "IE") */
  domicile: string;
  /** Fund inception date (ISO 8601) */
  inceptionDate: string;
  /** Top holdings by weight */
  holdings: ETFHolding[];
  /** Sector allocation breakdown */
  sectorWeights: ETFSectorWeight[];
  /** Geographic allocation breakdown */
  regions?: ETFRegionWeight[];
  /** Market cap distribution */
  marketCapBreakdown?: ETFMarketCap;
  /** Aggregate valuation metrics */
  valuations?: ETFValuations;
  /** Historical performance */
  performance?: ETFPerformance;
}

// =============================================================================
// Analyst Estimates
// =============================================================================

/**
 * Analyst estimates, ratings, and price targets.
 *
 * This data is primarily available when using the FMP provider.
 * Contains Wall Street analyst consensus data for buy/sell ratings,
 * price targets, and EPS/revenue forecasts.
 */
export interface AnalystEstimates {
  // Consensus Rating
  /** Consensus rating label (e.g., "Strong Buy", "Buy", "Hold", "Sell", "Strong Sell") */
  rating: string;
  /** Rating score from 1.0 (Strong Sell) to 5.0 (Strong Buy) */
  ratingScore: number;
  /** Total number of analysts covering this stock */
  analystCount: number;
  /** Number of Strong Buy ratings */
  strongBuyCount: number;
  /** Number of Buy ratings */
  buyCount: number;
  /** Number of Hold ratings */
  holdCount: number;
  /** Number of Sell ratings */
  sellCount: number;
  /** Number of Strong Sell ratings */
  strongSellCount: number;

  // Price Targets
  /** Highest analyst price target */
  priceTargetHigh: number;
  /** Lowest analyst price target */
  priceTargetLow: number;
  /** Average (consensus) price target */
  priceTargetAverage: number;
  /** Median price target */
  priceTargetMedian?: number;

  // EPS Estimates
  /** Estimated EPS for current fiscal year */
  epsEstimateCurrentYear: number;
  /** Estimated EPS for next fiscal year */
  epsEstimateNextYear: number;
  /** Projected EPS growth percentage (next year vs current year) */
  epsGrowthNextYear: number;

  // Revenue Estimates
  /** Estimated revenue for current fiscal year */
  revenueEstimateCurrentYear: number;
  /** Estimated revenue for next fiscal year */
  revenueEstimateNextYear: number;
  /** Projected revenue growth percentage (next year vs current year) */
  revenueGrowthNextYear: number;
}

// =============================================================================
// API Response
// =============================================================================

/**
 * Complete response for GET /api/stock/{ticker}.
 *
 * This is the primary API response containing all data needed
 * to render the stock detail view. It combines real-time market data
 * with fundamental analysis, scoring systems, and ownership data.
 *
 * For ETFs (assetType === 'etf'), stock-specific fields (scores, valuation,
 * holdings, insiderActivity, financials, profitability, etc.) will be null/undefined,
 * and etfData will be populated instead.
 */
export interface StockDetailResponse {
  /** Asset type discriminator - determines which view to render */
  assetType: AssetType;
  /** Basic company/fund information */
  company: Company;
  /** Real-time market quote */
  quote: Quote;
  /** Price performance over time periods */
  performance: Performance;
  /** Aggregated scoring (only for stocks) */
  scores?: Scores;
  /** Actionable signals and flags */
  signals: Signal[];
  /** Valuation metrics with sector context (only for stocks) */
  valuation?: Valuation;
  /** Institutional ownership data (only for stocks) */
  holdings?: Holdings;
  /** Recent insider transactions */
  insiderTrades: InsiderTrade[];
  /** Aggregated insider activity (only for stocks) */
  insiderActivity?: InsiderActivity;
  /** Key financial metrics (only for stocks) */
  financials?: Financials;
  /** Profitability metrics with sector comparisons (only for stocks) */
  profitability?: Profitability;
  /** Financial health metrics with sector comparisons (only for stocks) */
  financialHealth?: FinancialHealth;
  /** Growth metrics with sector comparisons (only for stocks) */
  growth?: Growth;
  /** Earnings quality metrics with sector comparisons (only for stocks) */
  earningsQuality?: EarningsQuality;
  /** Analyst estimates, ratings, and price targets (only for stocks, primarily FMP provider) */
  analystEstimates?: AnalystEstimates;
  /** ETF-specific data (only for ETFs) */
  etfData?: ETFData;
  /** Data freshness timestamps */
  meta: DataMeta;
}

// =============================================================================
// Error Response
// =============================================================================

/**
 * Standard API error response format.
 *
 * All API errors follow this structure for consistent error handling
 * on the frontend.
 */
export interface ApiError {
  /** Machine-readable error code (e.g., "TICKER_NOT_FOUND") */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error context */
  details?: Record<string, string>;
}
