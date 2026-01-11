/**
 * Search domain types for the Recon API.
 *
 * These interfaces define the contract for ticker search functionality.
 */

/**
 * A single ticker search result.
 *
 * Returned when users search for stocks by ticker symbol or company name.
 * Used for autocomplete/typeahead functionality in the search bar.
 */
export interface TickerSearchResult {
  /** Stock ticker symbol (e.g., "AAPL") */
  ticker: string;
  /** Full company name (e.g., "Apple Inc.") */
  name: string;
  /** Stock exchange where the ticker is listed (e.g., "NASDAQ", "NYSE") */
  exchange: string;
  /** GICS sector classification, if available */
  sector?: string;
}

/**
 * Response for GET /api/search?q={query}.
 *
 * Returns matching tickers for the search query, ordered by relevance.
 * Results are limited (typically 10-20) for performance.
 */
export interface SearchResponse {
  /** Matching ticker results, ordered by relevance */
  results: TickerSearchResult[];
  /** The original search query (echoed back for verification) */
  query: string;
}
