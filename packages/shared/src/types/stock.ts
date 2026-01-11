/**
 * Stock entity with basic information.
 */
export interface Stock {
  id: number;
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Financial fundamentals for a stock.
 */
export interface Fundamentals {
  stockId: number;
  fiscalYear: number;
  revenue: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  operatingCash: number;
  sharesOutstanding: number;
  updatedAt: string;
}

/**
 * Computed financial ratios.
 */
export interface FinancialRatios {
  /** Return on Assets */
  roa: number;
  /** Return on Equity */
  roe: number;
  /** Current Ratio */
  currentRatio: number;
  /** Debt to Equity */
  debtToEquity: number;
  /** Gross Margin */
  grossMargin: number;
  /** Operating Margin */
  operatingMargin: number;
  /** Net Margin */
  netMargin: number;
}

/**
 * Stock with all associated data.
 */
export interface StockWithFundamentals extends Stock {
  fundamentals: Fundamentals;
  ratios: FinancialRatios;
}
