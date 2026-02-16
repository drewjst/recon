import type { ScreenerFilters, ScreenerStock } from '@/lib/api';

// =============================================================================
// Constants
// =============================================================================

/** GICS sectors matching the screener_snapshots.sector values. */
export const SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Communication Services',
  'Industrials',
  'Consumer Defensive',
  'Energy',
  'Utilities',
  'Real Estate',
  'Basic Materials',
] as const;

export type Sector = (typeof SECTORS)[number];

export interface MarketCapRange {
  label: string;
  min?: number;
  max?: number;
}

/** Pre-defined market cap ranges for quick-select dropdowns. */
export const MARKET_CAP_RANGES: MarketCapRange[] = [
  { label: 'Mega (>$200B)', min: 200_000_000_000 },
  { label: 'Large ($10B–$200B)', min: 10_000_000_000, max: 200_000_000_000 },
  { label: 'Mid ($2B–$10B)', min: 2_000_000_000, max: 10_000_000_000 },
  { label: 'Small ($300M–$2B)', min: 300_000_000, max: 2_000_000_000 },
  { label: 'Micro (<$300M)', max: 300_000_000 },
];

// =============================================================================
// URL ↔ Filter mapping
// =============================================================================

/**
 * Map from URL param names (snake_case, matching the Go API) to ScreenerFilters keys (camelCase).
 */
export const URL_TO_FILTER_MAP: Record<string, keyof ScreenerFilters> = {
  sector: 'sectors',
  industry: 'industry',
  market_cap_min: 'marketCapMin',
  market_cap_max: 'marketCapMax',
  pe_min: 'peMin',
  pe_max: 'peMax',
  forward_pe_min: 'forwardPeMin',
  forward_pe_max: 'forwardPeMax',
  ps_min: 'psMin',
  ps_max: 'psMax',
  pb_min: 'pbMin',
  pb_max: 'pbMax',
  ev_ebitda_min: 'evEbitdaMin',
  ev_ebitda_max: 'evEbitdaMax',
  peg_min: 'pegMin',
  peg_max: 'pegMax',
  dividend_yield_min: 'dividendYieldMin',
  dividend_yield_max: 'dividendYieldMax',
  revenue_growth_min: 'revenueGrowthMin',
  revenue_growth_max: 'revenueGrowthMax',
  eps_growth_min: 'epsGrowthMin',
  eps_growth_max: 'epsGrowthMax',
  gross_margin_min: 'grossMarginMin',
  gross_margin_max: 'grossMarginMax',
  operating_margin_min: 'operatingMarginMin',
  operating_margin_max: 'operatingMarginMax',
  net_margin_min: 'netMarginMin',
  net_margin_max: 'netMarginMax',
  fcf_margin_min: 'fcfMarginMin',
  fcf_margin_max: 'fcfMarginMax',
  roe_min: 'roeMin',
  roe_max: 'roeMax',
  roic_min: 'roicMin',
  roic_max: 'roicMax',
  debt_to_equity_min: 'debtToEquityMin',
  debt_to_equity_max: 'debtToEquityMax',
  current_ratio_min: 'currentRatioMin',
  current_ratio_max: 'currentRatioMax',
  piotroski_score_min: 'piotroskiScoreMin',
  altman_z_min: 'altmanZMin',
  sort: 'sort',
  order: 'order',
  limit: 'limit',
  offset: 'offset',
};

/** Reverse: ScreenerFilters key -> URL param name. */
export const FILTER_TO_URL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(URL_TO_FILTER_MAP).map(([url, filter]) => [filter, url])
);

/** Numeric filter keys (parsed as float from URL). */
export const NUMERIC_KEYS = new Set<string>([
  'marketCapMin', 'marketCapMax',
  'peMin', 'peMax', 'forwardPeMin', 'forwardPeMax',
  'psMin', 'psMax', 'pbMin', 'pbMax',
  'evEbitdaMin', 'evEbitdaMax', 'pegMin', 'pegMax',
  'dividendYieldMin', 'dividendYieldMax',
  'revenueGrowthMin', 'revenueGrowthMax',
  'epsGrowthMin', 'epsGrowthMax',
  'grossMarginMin', 'grossMarginMax',
  'operatingMarginMin', 'operatingMarginMax',
  'netMarginMin', 'netMarginMax',
  'fcfMarginMin', 'fcfMarginMax',
  'roeMin', 'roeMax', 'roicMin', 'roicMax',
  'debtToEquityMin', 'debtToEquityMax',
  'currentRatioMin', 'currentRatioMax',
  'piotroskiScoreMin', 'altmanZMin',
  'limit', 'offset',
]);

// =============================================================================
// Filter parsing / serialization
// =============================================================================

/** Parse URL search params into a ScreenerFilters object. */
export function parseFiltersFromURL(searchParams: URLSearchParams): ScreenerFilters {
  const filters: ScreenerFilters = {};

  for (const [urlKey, filterKey] of Object.entries(URL_TO_FILTER_MAP)) {
    const value = searchParams.get(urlKey);
    if (value == null || value === '') continue;

    if (filterKey === 'sectors') {
      filters.sectors = value.split(',').filter(Boolean);
    } else if (filterKey === 'order') {
      filters.order = value === 'asc' ? 'asc' : 'desc';
    } else if (NUMERIC_KEYS.has(filterKey)) {
      const num = Number(value);
      if (!isNaN(num)) {
        (filters as Record<string, unknown>)[filterKey] = num;
      }
    } else {
      (filters as Record<string, unknown>)[filterKey] = value;
    }
  }

  return filters;
}

/** Convert ScreenerFilters to URL search params string. */
export function filtersToURLParams(filters: ScreenerFilters): string {
  const params = new URLSearchParams();

  for (const [filterKey, urlKey] of Object.entries(FILTER_TO_URL_MAP)) {
    const value = (filters as Record<string, unknown>)[filterKey];
    if (value == null) continue;

    if (filterKey === 'sectors') {
      const sectors = value as string[];
      if (sectors.length > 0) params.set(urlKey, sectors.join(','));
    } else {
      params.set(urlKey, String(value));
    }
  }

  return params.toString();
}

// =============================================================================
// Filter counting & inspection
// =============================================================================

/** All range/threshold filter keys (excludes sort/order/limit/offset). */
const RANGE_KEYS: (keyof ScreenerFilters)[] = [
  'marketCapMin', 'marketCapMax', 'peMin', 'peMax',
  'forwardPeMin', 'forwardPeMax', 'psMin', 'psMax',
  'pbMin', 'pbMax', 'evEbitdaMin', 'evEbitdaMax',
  'pegMin', 'pegMax', 'dividendYieldMin', 'dividendYieldMax',
  'revenueGrowthMin', 'revenueGrowthMax', 'epsGrowthMin', 'epsGrowthMax',
  'grossMarginMin', 'grossMarginMax', 'operatingMarginMin', 'operatingMarginMax',
  'netMarginMin', 'netMarginMax', 'fcfMarginMin', 'fcfMarginMax',
  'roeMin', 'roeMax', 'roicMin', 'roicMax',
  'debtToEquityMin', 'debtToEquityMax', 'currentRatioMin', 'currentRatioMax',
  'piotroskiScoreMin', 'altmanZMin',
];

/** Count active filters (excluding sort/order/pagination). */
export function countActiveFilters(filters: ScreenerFilters): number {
  let count = 0;
  if (filters.sectors?.length) count++;
  if (filters.industry) count++;

  for (const key of RANGE_KEYS) {
    if (filters[key] != null) count++;
  }

  return count;
}

/** Human-readable labels for ScreenerFilters keys. */
const FILTER_LABELS: Partial<Record<keyof ScreenerFilters, string>> = {
  sectors: 'Sector',
  industry: 'Industry',
  marketCapMin: 'Market Cap (min)',
  marketCapMax: 'Market Cap (max)',
  peMin: 'P/E (min)',
  peMax: 'P/E (max)',
  forwardPeMin: 'Forward P/E (min)',
  forwardPeMax: 'Forward P/E (max)',
  psMin: 'P/S (min)',
  psMax: 'P/S (max)',
  pbMin: 'P/B (min)',
  pbMax: 'P/B (max)',
  evEbitdaMin: 'EV/EBITDA (min)',
  evEbitdaMax: 'EV/EBITDA (max)',
  pegMin: 'PEG (min)',
  pegMax: 'PEG (max)',
  dividendYieldMin: 'Div Yield (min)',
  dividendYieldMax: 'Div Yield (max)',
  revenueGrowthMin: 'Rev Growth (min)',
  revenueGrowthMax: 'Rev Growth (max)',
  epsGrowthMin: 'EPS Growth (min)',
  epsGrowthMax: 'EPS Growth (max)',
  grossMarginMin: 'Gross Margin (min)',
  grossMarginMax: 'Gross Margin (max)',
  operatingMarginMin: 'Operating Margin (min)',
  operatingMarginMax: 'Operating Margin (max)',
  netMarginMin: 'Net Margin (min)',
  netMarginMax: 'Net Margin (max)',
  fcfMarginMin: 'FCF Margin (min)',
  fcfMarginMax: 'FCF Margin (max)',
  roeMin: 'ROE (min)',
  roeMax: 'ROE (max)',
  roicMin: 'ROIC (min)',
  roicMax: 'ROIC (max)',
  debtToEquityMin: 'D/E (min)',
  debtToEquityMax: 'D/E (max)',
  currentRatioMin: 'Current Ratio (min)',
  currentRatioMax: 'Current Ratio (max)',
  piotroskiScoreMin: 'Piotroski (min)',
  altmanZMin: 'Altman Z (min)',
};

export interface ActiveFilter {
  key: keyof ScreenerFilters;
  label: string;
  value: string;
}

/** Return a labeled list of all active (non-sort/pagination) filters. */
export function getActiveFiltersList(filters: ScreenerFilters): ActiveFilter[] {
  const result: ActiveFilter[] = [];

  if (filters.sectors?.length) {
    result.push({
      key: 'sectors',
      label: 'Sector',
      value: filters.sectors.join(', '),
    });
  }

  if (filters.industry) {
    result.push({
      key: 'industry',
      label: 'Industry',
      value: filters.industry,
    });
  }

  for (const key of RANGE_KEYS) {
    const value = filters[key];
    if (value == null) continue;
    result.push({
      key,
      label: FILTER_LABELS[key] || key,
      value: String(value),
    });
  }

  return result;
}

// =============================================================================
// Filter comparison
// =============================================================================

/** Keys compared when checking filter equality (ignores sort/pagination). */
const FILTER_COMPARE_KEYS: (keyof ScreenerFilters)[] = [
  'sectors', 'industry',
  ...RANGE_KEYS,
];

function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  const sorted1 = [...a].sort();
  const sorted2 = [...b].sort();
  return sorted1.every((v, i) => v === sorted2[i]);
}

/**
 * Check if two filter sets are equivalent (ignoring sort/order/pagination).
 * Useful for detecting active preset screens.
 */
export function filtersMatch(a: ScreenerFilters, b: ScreenerFilters): boolean {
  for (const key of FILTER_COMPARE_KEYS) {
    const av = a[key];
    const bv = b[key];

    const aSet = av != null && (Array.isArray(av) ? av.length > 0 : true);
    const bSet = bv != null && (Array.isArray(bv) ? bv.length > 0 : true);

    if (aSet !== bSet) return false;
    if (!aSet) continue;

    if (Array.isArray(av) && Array.isArray(bv)) {
      if (!arraysEqual(av, bv)) return false;
    } else if (av !== bv) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// CSV export
// =============================================================================

interface CSVColumn {
  key: keyof ScreenerStock;
  header: string;
}

const CSV_COLUMNS: CSVColumn[] = [
  { key: 'ticker', header: 'Ticker' },
  { key: 'name', header: 'Company' },
  { key: 'sector', header: 'Sector' },
  { key: 'industry', header: 'Industry' },
  { key: 'marketCap', header: 'Market Cap' },
  { key: 'price', header: 'Price' },
  { key: 'changePct', header: 'Change %' },
  { key: 'pe', header: 'P/E' },
  { key: 'forwardPE', header: 'Forward P/E' },
  { key: 'ps', header: 'P/S' },
  { key: 'pb', header: 'P/B' },
  { key: 'evEbitda', header: 'EV/EBITDA' },
  { key: 'peg', header: 'PEG' },
  { key: 'dividendYield', header: 'Div Yield' },
  { key: 'revenueGrowth', header: 'Rev Growth' },
  { key: 'epsGrowth', header: 'EPS Growth' },
  { key: 'grossMargin', header: 'Gross Margin' },
  { key: 'operatingMargin', header: 'Operating Margin' },
  { key: 'netMargin', header: 'Net Margin' },
  { key: 'roe', header: 'ROE' },
  { key: 'roic', header: 'ROIC' },
  { key: 'debtToEquity', header: 'D/E' },
  { key: 'currentRatio', header: 'Current Ratio' },
  { key: 'fcfMargin', header: 'FCF Margin' },
  { key: 'piotroskiScore', header: 'Piotroski' },
  { key: 'altmanZ', header: 'Altman Z' },
];

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Convert screener stocks to a CSV string. */
export function convertToCSV(stocks: ScreenerStock[]): string {
  const header = CSV_COLUMNS.map((col) => col.header).join(',');
  const rows = stocks.map((stock) =>
    CSV_COLUMNS.map((col) => {
      const val = stock[col.key];
      if (val == null) return '';
      return escapeCSV(String(val));
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

/** Trigger a CSV file download in the browser. */
export function exportScreenerCSV(stocks: ScreenerStock[], filename = 'screener-results.csv') {
  const csv = convertToCSV(stocks);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
