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
 * Aggregated scoring results with letter grade.
 */
export interface Scores {
  /** Piotroski F-Score (value/quality) */
  piotroski: PiotroskiScore;
  /** Rule of 40 (growth + profitability balance) */
  ruleOf40: RuleOf40;
  /** Altman Z-Score (financial health/bankruptcy risk) */
  altmanZ: AltmanZScore;
  /**
   * Overall letter grade synthesizing all scores.
   * A = Excellent, B+ = Very Good, B = Good, C = Average, D = Below Average, F = Poor
   */
  overallGrade: 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
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
// API Response
// =============================================================================

/**
 * Complete response for GET /api/stock/{ticker}.
 *
 * This is the primary API response containing all data needed
 * to render the stock detail view. It combines real-time market data
 * with fundamental analysis, scoring systems, and ownership data.
 */
export interface StockDetailResponse {
  /** Basic company information */
  company: Company;
  /** Real-time market quote */
  quote: Quote;
  /** Aggregated scoring (Piotroski, Rule of 40, Altman Z) */
  scores: Scores;
  /** Actionable signals and flags */
  signals: Signal[];
  /** Valuation metrics with sector context */
  valuation: Valuation;
  /** Institutional ownership data */
  holdings: Holdings;
  /** Recent insider transactions */
  insiderTrades: InsiderTrade[];
  /** Key financial metrics */
  financials: Financials;
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
