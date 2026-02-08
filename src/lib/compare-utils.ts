import type { StockDetailResponse, RankingResult } from '@recon/shared';
import { formatCurrency as formatCurrencyBase } from './utils';

/**
 * Configuration for a comparable metric.
 */
export interface MetricConfig {
  key: string;
  label: string;
  path: string;
  higherIsBetter: boolean;
  format: (v: number) => string;
  /** If true, values <= 0 are treated as invalid/missing data and excluded from winner calculation */
  excludeNonPositive?: boolean;
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
  ],
  valuation: [
    {
      key: 'pe',
      label: 'P/E Ratio',
      path: 'valuation.pe.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(1),
      excludeNonPositive: true,
    },
    {
      key: 'forwardPe',
      label: 'Forward P/E',
      path: 'valuation.forwardPe.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(1),
      excludeNonPositive: true,
    },
    {
      key: 'peg',
      label: 'PEG Ratio',
      path: 'valuation.peg.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(2),
      excludeNonPositive: true,
    },
    {
      key: 'ntmPs',
      label: 'NTM P/S',
      path: 'valuation.ntmPs.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(2),
      excludeNonPositive: true,
    },
    {
      key: 'evToEbitda',
      label: 'EV/EBITDA',
      path: 'valuation.evToEbitda.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(1),
      excludeNonPositive: true,
    },
    {
      key: 'priceToFcf',
      label: 'Price/FCF',
      path: 'valuation.priceToFcf.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(1),
      excludeNonPositive: true,
    },
    {
      key: 'priceToBook',
      label: 'Price/Book',
      path: 'valuation.priceToBook.value',
      higherIsBetter: false,
      format: (v) => v.toFixed(2),
      excludeNonPositive: true,
    },
  ],
  performance: [
    {
      key: '1d',
      label: '1D Change',
      path: 'performance.day1Change',
      higherIsBetter: true,
      format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
    {
      key: '1w',
      label: '1W Change',
      path: 'performance.week1Change',
      higherIsBetter: true,
      format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
    {
      key: '1m',
      label: '1M Change',
      path: 'performance.month1Change',
      higherIsBetter: true,
      format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
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
    {
      key: 'pctOf52High',
      label: '% of 52W High',
      path: 'performance.percentOf52WeekHigh',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(0)}%`,
    },
  ],
  profitability: [
    {
      key: 'grossMargin',
      label: 'Gross Margin',
      path: 'profitability.grossMargin.value',
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
    {
      key: 'netMargin',
      label: 'Net Margin',
      path: 'profitability.netMargin.value',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'fcfMargin',
      label: 'FCF Margin',
      path: 'financials.fcfMargin',
      higherIsBetter: true,
      format: (v) => `${(v * 100).toFixed(1)}%`,
    },
    {
      key: 'roe',
      label: 'ROE',
      path: 'profitability.roe.value',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'roic',
      label: 'ROIC',
      path: 'profitability.roic.value',
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
    {
      key: 'interestCoverage',
      label: 'Interest Coverage',
      path: 'financials.interestCoverage',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(1)}x`,
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
    {
      key: 'projectedEpsGrowth',
      label: 'Projected EPS Growth',
      path: 'growth.projectedEPSGrowth.value',
      higherIsBetter: true,
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
    {
      key: 'cashFlowGrowthYoY',
      label: 'Cash Flow Growth YoY',
      path: 'growth.cashFlowGrowthYoY.value',
      higherIsBetter: true,
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
  ],
  earningsQuality: [
    {
      key: 'revenuePerEmployee',
      label: 'Revenue/Employee',
      path: 'earningsQuality.revenuePerEmployee.value',
      higherIsBetter: true,
      format: (v) => formatCurrencyBase(v, true),
    },
    {
      key: 'incomePerEmployee',
      label: 'Income/Employee',
      path: 'earningsQuality.incomePerEmployee.value',
      higherIsBetter: true,
      format: (v) => formatCurrencyBase(v, true),
    },
    {
      key: 'accrualRatio',
      label: 'Accrual Ratio',
      path: 'earningsQuality.accrualRatio.value',
      higherIsBetter: false,
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
  smartMoney: [
    {
      key: 'institutionalOwnership',
      label: 'Institutional %',
      path: 'holdings.totalInstitutionalOwnership',
      higherIsBetter: true,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'netChangeQuarters',
      label: 'Accum. Quarters',
      path: 'holdings.netChangeQuarters',
      higherIsBetter: true,
      format: (v) => `${v > 0 ? '+' : ''}${v}`,
    },
    {
      key: 'insiderBuys',
      label: 'Insider Buys (90d)',
      path: 'insiderActivity.buyCount90d',
      higherIsBetter: true,
      format: (v) => v.toFixed(0),
    },
    {
      key: 'insiderSells',
      label: 'Insider Sells (90d)',
      path: 'insiderActivity.sellCount90d',
      higherIsBetter: false,
      format: (v) => v.toFixed(0),
    },
  ],
  analyst: [
    {
      key: 'ratingScore',
      label: 'Analyst Rating',
      path: 'analystEstimates.ratingScore',
      higherIsBetter: true,
      format: (v) => v.toFixed(1),
    },
    {
      key: 'analystCount',
      label: 'Analyst Count',
      path: 'analystEstimates.analystCount',
      higherIsBetter: true,
      format: (v) => v.toFixed(0),
    },
    {
      key: 'epsGrowthNextY',
      label: 'EPS Growth (Est)',
      path: 'analystEstimates.epsGrowthNextYear',
      higherIsBetter: true,
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
    {
      key: 'revenueGrowthNextY',
      label: 'Revenue Growth (Est)',
      path: 'analystEstimates.revenueGrowthNextYear',
      higherIsBetter: true,
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
    {
      key: 'priceTargetAvg',
      label: 'Price Target',
      path: 'analystEstimates.priceTargetAverage',
      higherIsBetter: true,
      format: (v) => `$${v.toFixed(0)}`,
    },
  ],
  shortInterest: [
    {
      key: 'shortPercentFloat',
      label: 'Short % of Float',
      path: 'shortInterest.shortPercentFloat',
      higherIsBetter: false,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      key: 'daysToCover',
      label: 'Days to Cover',
      path: 'shortInterest.daysToCover',
      higherIsBetter: false,
      format: (v) => v.toFixed(1),
    },
    {
      key: 'shortRatio',
      label: 'Short Ratio',
      path: 'shortInterest.shortRatio',
      higherIsBetter: false,
      format: (v) => v.toFixed(2),
    },
  ],
  dcfValuation: [
    {
      key: 'dcfUpside',
      label: 'DCF Upside',
      path: 'scores.dcfValuation.differencePercent',
      higherIsBetter: true,
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    },
  ],
};

const pathCache = new Map<string, string[]>();
const MAX_CACHE_SIZE = 1000;

/**
 * Safely access a nested property using dot notation.
 */
export function getNestedValue(obj: unknown, path: string): number | null {
  let parts = pathCache.get(path);
  if (!parts) {
    if (pathCache.size >= MAX_CACHE_SIZE) {
      pathCache.clear();
    }
    parts = path.split('.');
    pathCache.set(path, parts);
  }

  let current: any = obj;
  for (const key of parts) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return null;
    }
  }

  return typeof current === 'number' && !isNaN(current) ? current : null;
}

/**
 * Find the index of the winning value in an array.
 * Returns null if all values are null or invalid.
 *
 * @param values - Array of values to compare
 * @param higherIsBetter - If true, highest value wins; if false, lowest wins
 * @param excludeNonPositive - If true, values <= 0 are treated as invalid (useful for valuation ratios)
 */
export function findWinner(
  values: (number | null)[],
  higherIsBetter: boolean,
  excludeNonPositive?: boolean
): number | null {
  const validIndices = values
    .map((v, i) => {
      if (v === null) return -1;
      // Exclude non-positive values if specified (for valuation ratios where 0 means missing data)
      if (excludeNonPositive && v <= 0) return -1;
      return i;
    })
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
    ...COMPARE_METRICS.performance,
    ...COMPARE_METRICS.profitability,
    ...COMPARE_METRICS.financialHealth,
    ...COMPARE_METRICS.growth,
    ...COMPARE_METRICS.earningsQuality,
    ...COMPARE_METRICS.smartMoney,
    ...COMPARE_METRICS.analyst,
    ...COMPARE_METRICS.shortInterest,
    ...COMPARE_METRICS.dcfValuation,
  ];

  const wins: number[] = stocks.map(() => 0);

  allMetrics.forEach((metric) => {
    const values = stocks.map((s) => getNestedValue(s, metric.path));
    const winner = findWinner(values, metric.higherIsBetter, metric.excludeNonPositive);
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
