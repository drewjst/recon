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
  const response = await fetch(`${API_BASE}${endpoint}`);

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

export async function fetchNewsSentiment(ticker: string): Promise<NewsSentiment | null> {
  try {
    const response = await fetchApi<InsightResponse>(
      `/api/v1/insights/news-sentiment?ticker=${ticker.toUpperCase()}`
    );
    // Parse the JSON insight string into NewsSentiment
    return JSON.parse(response.insight) as NewsSentiment;
  } catch {
    // Fail silently - news sentiment is optional
    return null;
  }
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
