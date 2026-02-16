import type { StockDetailResponse, SearchResponse, ValuationDeepDive } from '@recon/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const headers: HeadersInit = {};

  // Server-side requests don't include an Origin header, so authenticate with API key
  if (typeof window === 'undefined') {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { headers });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      throw new ApiError('UNKNOWN_ERROR', `Request failed: ${response.statusText}`, response.status);
    }
    throw new ApiError(
      errorData.code || 'API_ERROR',
      errorData.message || 'An error occurred',
      response.status
    );
  }

  return response.json();
}

export async function fetchStock(ticker: string): Promise<StockDetailResponse> {
  return fetchApi<StockDetailResponse>(`/api/stock/${ticker.toUpperCase()}`);
}

export async function searchTickers(query: string): Promise<SearchResponse> {
  if (!query || query.length < 1) {
    return { results: [], query: '' };
  }
  return fetchApi<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`);
}

export async function fetchValuation(ticker: string): Promise<ValuationDeepDive> {
  return fetchApi<ValuationDeepDive>(`/api/stock/${ticker.toUpperCase()}/valuation`);
}

// CruxAI Insight types
export type InsightSection = 'valuation-summary' | 'position-summary' | 'news-sentiment' | 'smart-money-summary';

export interface InsightResponse {
  ticker: string;
  section: InsightSection;
  insight: string;
  generatedAt: string;
  expiresAt: string;
  cached: boolean;
}

export interface NewsLink {
  title: string;
  url: string;
  site: string;
  publishedAt?: string; // ISO 8601 format
}

export interface NewsSentiment {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  themes: string[];
  summary: string;
  articleCount: number;
  daysCovered: number;
  topArticles?: NewsLink[];
}

export async function fetchInsight(
  ticker: string,
  section: InsightSection
): Promise<InsightResponse> {
  return fetchApi<InsightResponse>(
    `/api/v1/insights/${section}?ticker=${ticker.toUpperCase()}`
  );
}

// Institutional Detail types
export interface OwnershipHistoryPoint {
  date: string; // "2024-Q4" format
  year: number;
  quarter: number;
  ownershipPercent: number;
  holderCount: number;
  totalShares: number;
}

export interface HolderTypeBreakdown {
  holderType: string; // "Investment Advisor", "Hedge Fund", etc.
  investorCount: number;
  ownershipPercent: number;
  totalShares: number;
  totalValue: number;
  sharesChange: number;
  changePercent: number;
}

export interface InstitutionalHolderDetail {
  rank?: number;
  name: string;
  cik?: string;
  shares: number;
  value: number;
  percentOwned: number;
  changeShares: number;
  changePercent: number;
  isNew: boolean;
  isSoldOut: boolean;
  dateReported?: string;
}

export interface InstitutionalSignal {
  type: 'bullish' | 'bearish' | 'neutral';
  title: string;
  description: string;
}

export interface InstitutionalDetail {
  ticker: string;
  ownershipPercent: number;
  ownershipPercentChange: number;
  totalHolders: number;
  holdersIncreased: number;
  holdersDecreased: number;
  holdersNew: number;
  holdersClosed: number;
  ownershipHistory: OwnershipHistoryPoint[];
  holderTypeBreakdown: HolderTypeBreakdown[];
  topHolders: InstitutionalHolderDetail[];
  newPositions: InstitutionalHolderDetail[];
  closedPositions: InstitutionalHolderDetail[];
  biggestIncreases: InstitutionalHolderDetail[];
  biggestDecreases: InstitutionalHolderDetail[];
  signals: InstitutionalSignal[];
}

export async function fetchInstitutionalDetail(ticker: string): Promise<InstitutionalDetail> {
  return fetchApi<InstitutionalDetail>(`/api/stock/${ticker.toUpperCase()}/institutional`);
}

// =============================================================================
// Financial Statements Types
// =============================================================================

export type FinancialsPeriodType = 'annual' | 'quarterly' | 'ttm';

export interface IncomeStatementPeriod {
  periodEnd: string;
  fiscalYear: number;
  fiscalQuarter: number | null;
  filingDate?: string;
  // Revenue
  revenue: number;
  revenueFormatted: string;
  costOfRevenue: number;
  grossProfit: number;
  grossMargin: number;
  // Operating Expenses Breakdown
  researchAndDevelopment: number;
  sellingGeneralAdmin: number;
  operatingExpenses: number;
  // Operating Income
  operatingIncome: number;
  operatingMargin: number;
  // Non-Operating
  interestIncome: number;
  interestExpense: number;
  incomeBeforeTax: number;
  incomeTaxExpense: number;
  // Net Income
  netIncome: number;
  netIncomeFormatted: string;
  netMargin: number;
  // Per Share
  epsBasic: number;
  epsDiluted: number;
  // Shares Outstanding
  sharesOutstandingBasic: number;
  sharesOutstandingDiluted: number;
  // Other
  ebitda: number;
  ebitdaMargin: number;
  // Effective Tax Rate
  effectiveTaxRate: number;
  // YoY Growth
  revenueGrowth?: number;
  grossProfitGrowth?: number;
  operatingIncomeGrowth?: number;
  netIncomeGrowth?: number;
  epsGrowth?: number;
}

export interface IncomeStatementResponse {
  ticker: string;
  currency: string;
  periodType: string;
  periods: IncomeStatementPeriod[];
}

export interface BalanceSheetPeriod {
  periodEnd: string;
  fiscalYear: number;
  fiscalQuarter: number | null;
  filingDate?: string;
  // Current Assets
  cashAndEquivalents: number;
  shortTermInvestments: number;
  accountsReceivable: number;
  inventory: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  // Non-Current Assets
  propertyPlantEquipment: number;
  goodwill: number;
  intangibleAssets: number;
  longTermInvestments: number;
  otherNonCurrentAssets: number;
  totalNonCurrentAssets: number;
  // Total Assets
  totalAssets: number;
  totalAssetsFormatted: string;
  // Current Liabilities
  accountsPayable: number;
  shortTermDebt: number;
  deferredRevenue: number;
  otherCurrentLiabilities: number;
  totalCurrentLiabilities: number;
  // Non-Current Liabilities
  longTermDebt: number;
  deferredTaxLiabilities: number;
  otherNonCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  // Total Liabilities
  totalLiabilities: number;
  totalLiabilitiesFormatted: string;
  // Debt Summary
  totalDebt: number;
  netDebt: number;
  // Equity
  commonStock: number;
  retainedEarnings: number;
  accumulatedOtherComprehensive: number;
  treasuryStock: number;
  totalStockholdersEquity: number;
  minorityInterest: number;
  totalEquity: number;
  totalEquityFormatted: string;
  // Computed Metrics
  workingCapital: number;
  // Ratios
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  debtToAssets: number;
  // YoY Growth
  totalAssetsGrowth?: number;
  totalLiabilitiesGrowth?: number;
  totalEquityGrowth?: number;
}

export interface BalanceSheetResponse {
  ticker: string;
  currency: string;
  periodType: string;
  periods: BalanceSheetPeriod[];
}

export interface CashFlowPeriod {
  periodEnd: string;
  fiscalYear: number;
  fiscalQuarter: number | null;
  filingDate?: string;
  // Operating Activities
  netIncome: number;
  depreciationAmortization: number;
  stockBasedCompensation: number;
  changeInWorkingCapital: number;
  operatingCashFlow: number;
  operatingCashFlowFormatted: string;
  // Investing Activities
  capitalExpenditures: number;
  acquisitions: number;
  investingCashFlow: number;
  // Financing Activities
  debtRepayment: number;
  debtIssuance: number;
  stockBuybacks: number;
  dividendsPaid: number;
  financingCashFlow: number;
  // Summary
  netChangeInCash: number;
  freeCashFlow: number;
  freeCashFlowFormatted: string;
  // FCF Conversion
  fcfConversion: number;
  // YoY Growth
  operatingCashFlowGrowth?: number;
  freeCashFlowGrowth?: number;
  capexGrowth?: number;
}

export interface CashFlowResponse {
  ticker: string;
  currency: string;
  periodType: string;
  periods: CashFlowPeriod[];
}

export interface FinancialsOptions {
  period?: FinancialsPeriodType;
  limit?: number;
}

export async function fetchIncomeStatements(
  ticker: string,
  options?: FinancialsOptions
): Promise<IncomeStatementResponse> {
  const params = new URLSearchParams();
  if (options?.period) params.set('period', options.period);
  if (options?.limit) params.set('limit', options.limit.toString());
  const query = params.toString();
  return fetchApi<IncomeStatementResponse>(
    `/api/stock/${ticker.toUpperCase()}/financials/income${query ? `?${query}` : ''}`
  );
}

export async function fetchBalanceSheets(
  ticker: string,
  options?: FinancialsOptions
): Promise<BalanceSheetResponse> {
  const params = new URLSearchParams();
  if (options?.period) params.set('period', options.period);
  if (options?.limit) params.set('limit', options.limit.toString());
  const query = params.toString();
  return fetchApi<BalanceSheetResponse>(
    `/api/stock/${ticker.toUpperCase()}/financials/balance-sheet${query ? `?${query}` : ''}`
  );
}

export async function fetchCashFlowStatements(
  ticker: string,
  options?: FinancialsOptions
): Promise<CashFlowResponse> {
  const params = new URLSearchParams();
  if (options?.period) params.set('period', options.period);
  if (options?.limit) params.set('limit', options.limit.toString());
  const query = params.toString();
  return fetchApi<CashFlowResponse>(
    `/api/stock/${ticker.toUpperCase()}/financials/cash-flow${query ? `?${query}` : ''}`
  );
}

// =============================================================================
// Health / Status Types
// =============================================================================

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latency?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: string;
  checks: HealthCheck[];
}

// =============================================================================
// Sector Heatmap Types
// =============================================================================

export interface SectorStock {
  ticker: string;
  name: string;
  logoUrl?: string;
  price: number;
  marketCap: number;
  ps: number | null;
  pe: number | null;
  roic: number | null;
  ytdChange: number | null;
  oneMonthChange: number | null;
  oneYearChange: number | null;
  from52wHigh: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  sma20: boolean | null;
  sma50: boolean | null;
  sma200: boolean | null;
  rsRank: number | null;
  sparkline: number[];
  chartData1Y: number[];
}

export interface SectorSummary {
  avgPs: number | null;
  avgPe: number | null;
  medianYtd: number | null;
  median1y: number | null;
  totalMarketCap: number | null;
  medianPs: number | null;
  medianPe: number | null;
  avgRoic: number | null;
  median1m: number | null;
  medianFrom52wHigh: number | null;
  pctAboveSma20: number | null;
  pctAboveSma50: number | null;
  pctAboveSma200: number | null;
}

export interface SectorOverviewResponse {
  sector: string;
  stockCount: number;
  updatedAt: string;
  summary: SectorSummary;
  stocks: SectorStock[];
}

export interface SectorListResponse {
  sectors: string[];
}

export type SectorSortField = '52whigh' | 'ytd' | '1y' | 'marketcap' | 'ps' | 'pe';

export async function fetchSectors(): Promise<SectorListResponse> {
  return fetchApi<SectorListResponse>('/api/sectors');
}

export async function fetchSectorOverview(
  sector: string,
  sort: SectorSortField = '52whigh',
  limit: number = 20
): Promise<SectorOverviewResponse> {
  const encodedSector = encodeURIComponent(sector.replace(/ /g, '-'));
  const params = new URLSearchParams();
  params.set('sort', sort);
  params.set('limit', limit.toString());
  return fetchApi<SectorOverviewResponse>(
    `/api/sectors/${encodedSector}/overview?${params.toString()}`
  );
}

// =============================================================================
// Health / Status Types
// =============================================================================

// =============================================================================
// Screener Types
// =============================================================================

export interface ScreenerStock {
  ticker: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  price: number | null;
  changePct: number | null;
  pe: number | null;
  forwardPE: number | null;
  ps: number | null;
  pb: number | null;
  evEbitda: number | null;
  peg: number | null;
  dividendYield: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  roic: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  fcfMargin: number | null;
  piotroskiScore: number | null;
  altmanZ: number | null;
  syncedAt: string;
  updatedAt: string;
}

export interface ScreenerResponse {
  total: number;
  limit: number;
  offset: number;
  synced_at?: string;
  stocks: ScreenerStock[];
}

export interface ScreenerFilters {
  sectors?: string[];
  industry?: string;
  marketCapMin?: number;
  marketCapMax?: number;
  peMin?: number;
  peMax?: number;
  forwardPeMin?: number;
  forwardPeMax?: number;
  psMin?: number;
  psMax?: number;
  pbMin?: number;
  pbMax?: number;
  evEbitdaMin?: number;
  evEbitdaMax?: number;
  pegMin?: number;
  pegMax?: number;
  dividendYieldMin?: number;
  dividendYieldMax?: number;
  revenueGrowthMin?: number;
  revenueGrowthMax?: number;
  epsGrowthMin?: number;
  epsGrowthMax?: number;
  grossMarginMin?: number;
  grossMarginMax?: number;
  operatingMarginMin?: number;
  operatingMarginMax?: number;
  netMarginMin?: number;
  netMarginMax?: number;
  fcfMarginMin?: number;
  fcfMarginMax?: number;
  roeMin?: number;
  roeMax?: number;
  roicMin?: number;
  roicMax?: number;
  debtToEquityMin?: number;
  debtToEquityMax?: number;
  currentRatioMin?: number;
  currentRatioMax?: number;
  piotroskiScoreMin?: number;
  altmanZMin?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface MetricRange {
  min: number | null;
  max: number | null;
}

export interface ScreenerFilterOptions {
  sectors: string[];
  industries: string[];
  metrics: Record<string, [number | null, number | null]>;
  totalCount: number;
}

export interface ScreenerPreset {
  name: string;
  description: string;
  filters: Record<string, string>;
}

export interface ScreenerPresetsResponse {
  presets: ScreenerPreset[];
}

/** Map ScreenerFilters to URL query params matching the Go API. */
function screenerFiltersToParams(filters: ScreenerFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.sectors?.length) params.set('sector', filters.sectors.join(','));
  if (filters.industry) params.set('industry', filters.industry);

  const numericMap: [keyof ScreenerFilters, string][] = [
    ['marketCapMin', 'market_cap_min'],
    ['marketCapMax', 'market_cap_max'],
    ['peMin', 'pe_min'],
    ['peMax', 'pe_max'],
    ['forwardPeMin', 'forward_pe_min'],
    ['forwardPeMax', 'forward_pe_max'],
    ['psMin', 'ps_min'],
    ['psMax', 'ps_max'],
    ['pbMin', 'pb_min'],
    ['pbMax', 'pb_max'],
    ['evEbitdaMin', 'ev_ebitda_min'],
    ['evEbitdaMax', 'ev_ebitda_max'],
    ['pegMin', 'peg_min'],
    ['pegMax', 'peg_max'],
    ['dividendYieldMin', 'dividend_yield_min'],
    ['dividendYieldMax', 'dividend_yield_max'],
    ['revenueGrowthMin', 'revenue_growth_min'],
    ['revenueGrowthMax', 'revenue_growth_max'],
    ['epsGrowthMin', 'eps_growth_min'],
    ['epsGrowthMax', 'eps_growth_max'],
    ['grossMarginMin', 'gross_margin_min'],
    ['grossMarginMax', 'gross_margin_max'],
    ['operatingMarginMin', 'operating_margin_min'],
    ['operatingMarginMax', 'operating_margin_max'],
    ['netMarginMin', 'net_margin_min'],
    ['netMarginMax', 'net_margin_max'],
    ['fcfMarginMin', 'fcf_margin_min'],
    ['fcfMarginMax', 'fcf_margin_max'],
    ['roeMin', 'roe_min'],
    ['roeMax', 'roe_max'],
    ['roicMin', 'roic_min'],
    ['roicMax', 'roic_max'],
    ['debtToEquityMin', 'debt_to_equity_min'],
    ['debtToEquityMax', 'debt_to_equity_max'],
    ['currentRatioMin', 'current_ratio_min'],
    ['currentRatioMax', 'current_ratio_max'],
    ['piotroskiScoreMin', 'piotroski_score_min'],
    ['altmanZMin', 'altman_z_min'],
  ];

  for (const [key, param] of numericMap) {
    const value = filters[key];
    if (value != null) params.set(param, String(value));
  }

  if (filters.sort) params.set('sort', filters.sort);
  if (filters.order) params.set('order', filters.order);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  return params;
}

export async function fetchScreener(filters: ScreenerFilters): Promise<ScreenerResponse> {
  const params = screenerFiltersToParams(filters);
  const query = params.toString();
  return fetchApi<ScreenerResponse>(`/api/screener${query ? `?${query}` : ''}`);
}

export async function fetchScreenerFilterOptions(): Promise<ScreenerFilterOptions> {
  return fetchApi<ScreenerFilterOptions>('/api/screener/filters');
}

export async function fetchScreenerPresets(): Promise<ScreenerPresetsResponse> {
  return fetchApi<ScreenerPresetsResponse>('/api/screener/presets');
}

// =============================================================================
// Health / Status Types
// =============================================================================

export async function fetchHealth(): Promise<HealthResponse> {
  const url = '/health';
  const response = await fetch(`${API_BASE}${url}`);
  if (!response.ok) {
    throw new ApiError('HEALTH_ERROR', `Health check failed: ${response.statusText}`, response.status);
  }
  return response.json();
}
