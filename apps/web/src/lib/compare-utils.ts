import type { StockDetailResponse, RankingResult } from '@recon/shared';
import { formatCurrency as formatCurrencyBase, formatNumber } from './utils';

/**
 * Configuration for a comparable metric.
 */
export interface MetricConfig {
  key: string;
  label: string;
  path: string;
  higherIsBetter: boolean;
  format: (v: number) => string;
}

/**
 * Metrics configuration organized by category.
 */
export const COMPARE_METRICS: Record<string, MetricConfig[]> = {
  scores: [
    {
      key: 'piotroski',
      label: 'Piotroski F-Score',
      path: 'scores.piotroski.score',
      higherIsBetter: true,
      format: (v) => `${v}/9`,
    },
    {
      key: 'ruleOf40',
      label: 'Rule of 40',
      path: 'scores.ruleOf40.score',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(0)}%`,
    },
    {
      key: 'altmanZ',
      label: 'Altman Z-Score',
      path: 'scores.altmanZ.score',
      higherIsBetter: true,
      format: (v) => v.toFixed(2),
    },
    {
      key: 'dcf',
      label: 'DCF Upside',
      path: 'scores.dcfValuation.differencePercent',
      higherIsBetter: true,
      format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`,
    },
  ],
  valuation: [
    {
      key: 'pe',
      label: 'P/E Ratio',
      path: 'valuation.pe.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(1),
    },
    {
      key: 'forwardPe',
      label: 'Forward P/E',
      path: 'valuation.forwardPe.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(1),
    },
    {
      key: 'peg',
      label: 'PEG Ratio',
      path: 'valuation.peg.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(2),
    },
    {
      key: 'evToEbitda',
      label: 'EV/EBITDA',
      path: 'valuation.evToEbitda.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(1),
    },
    {
      key: 'priceToFcf',
      label: 'Price/FCF',
      path: 'valuation.priceToFcf.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(1),
    },
  ],
  financials: [
    {
      key: 'revenueGrowth',
      label: 'Revenue Growth',
      path: 'financials.revenueGrowthYoY',
      higherIsBetter: true,
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
    {
      key: 'grossMargin',
      label: 'Gross Margin',
      path: 'financials.grossMargin',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'netMargin',
      label: 'Net Margin',
      path: 'financials.netMargin',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'roic',
      label: 'ROIC',
      path: 'financials.roic',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'roe',
      label: 'ROE',
      path: 'financials.roe',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(1)}%`,
    },
  ],
  performance: [
    {
      key: 'ytd',
      label: 'YTD Return',
      path: 'performance.ytdChange',
      higherIsBetter: true,
      format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
    {
      key: '1y',
      label: '1Y Return',
      path: 'performance.year1Change',
      higherIsBetter: true,
      format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
  ],
  profitability: [
    {
      key: 'roic',
      label: 'ROIC',
      path: 'profitability.roic.value',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'roe',
      label: 'ROE',
      path: 'profitability.roe.value',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'operatingMargin',
      label: 'Op. Margin',
      path: 'profitability.operatingMargin.value',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(1)}%`,
    },
  ],
  financialHealth: [
    {
      key: 'debtToEquity',
      label: 'Debt/Equity',
      path: 'financialHealth.debtToEquity.value',
      higherIsBetter: false,
      format: (v) => `${v.toFixed(2)}x`,
    },
    {
      key: 'currentRatio',
      label: 'Current Ratio',
      path: 'financialHealth.currentRatio.value',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(2)}x`,
    },
    {
      key: 'assetTurnover',
      label: 'Asset Turnover',
      path: 'financialHealth.assetTurnover.value',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(2)}x`,
    },
  ],
  growth: [
    {
      key: 'revenueGrowthYoY',
      label: 'Revenue Growth YoY',
      path: 'growth.revenueGrowthYoY.value',
      higherIsBetter: true,
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
    {
      key: 'epsGrowthYoY',
      label: 'EPS Growth YoY',
      path: 'growth.epsGrowthYoY.value',
      higherIsBetter: true,
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
  ],
  earningsQuality: [
    {
      key: 'accrualRatio',
      label: 'Accrual Ratio',
      path: 'earningsQuality.accrualRatio.value',
      higherIsBetter: false, // Lower is better (more cash-based earnings)
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
    {
      key: 'buybackYield',
      label: 'Buyback Yield',
      path: 'earningsQuality.buybackYield.value',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(2)}%`,
    },
  ],
};

/**
 * Safely access a nested property using dot notation.
 */
export function getNestedValue(obj: unknown, path: string): number | null {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);

  return typeof value === 'number' && !isNaN(value) ? value : null;
}

/**
 * Find the index of the winning value in an array.
 * Returns null if all values are null.
 */
export function findWinner(
  values: (number | null)[],
  higherIsBetter: boolean
): number | null {
  const validIndices = values
    .map((v, i) => (v !== null ? i : -1))
    .filter((i) => i >= 0);

  if (validIndices.length === 0) return null;

  return validIndices.reduce((best, current) => {
    const bestVal = values[best]!;
    const currentVal = values[current]!;
    if (higherIsBetter) {
      return currentVal > bestVal ? current : best;
    }
    return currentVal < bestVal ? current : best;
  });
}

/**
 * Calculate overall rankings based on metric wins.
 */
export function calculateRankings(stocks: StockDetailResponse[]): RankingResult[] {
  const allMetrics = [
    ...COMPARE_METRICS.scores,
    ...COMPARE_METRICS.valuation,
    ...COMPARE_METRICS.financials,
    ...COMPARE_METRICS.performance,
    ...COMPARE_METRICS.profitability,
    ...COMPARE_METRICS.financialHealth,
    ...COMPARE_METRICS.growth,
    ...COMPARE_METRICS.earningsQuality,
  ];

  const wins: number[] = stocks.map(() => 0);

  allMetrics.forEach((metric) => {
    const values = stocks.map((s) => getNestedValue(s, metric.path));
    const winner = findWinner(values, metric.higherIsBetter);
    if (winner !== null) {
      wins[winner]++;
    }
  });

  return stocks
    .map((stock, index) => ({
      ticker: stock.company.ticker,
      rank: 0,
      wins: wins[index],
    }))
    .sort((a, b) => b.wins - a.wins)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

/**
 * Format market cap for display.
 */
export function formatMarketCap(cap: number): string {
  return formatCurrencyBase(cap, true);
}

/**
 * Format share count change for display.
 */
export function formatShareChange(shares: number): string {
  const sign = shares >= 0 ? '+' : '';
  return `${sign}${formatNumber(shares, true)}`;
}

/**
 * Format currency value with sign for display.
 */
export function formatSignedCurrency(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatCurrencyBase(Math.abs(value), true)}`;
}

/**
 * Determine winner between two values.
 * Returns 'left', 'right', 'tie', or null if either value is missing.
 */
export function determineWinner(
  leftVal: number | null | undefined,
  rightVal: number | null | undefined,
  higherIsBetter: boolean
): 'left' | 'right' | 'tie' | null {
  if (leftVal == null || rightVal == null) return null;
  if (leftVal === rightVal) return 'tie';

  if (higherIsBetter) {
    return leftVal > rightVal ? 'left' : 'right';
  }
  return leftVal < rightVal ? 'left' : 'right';
}
