import type { Stock, StockWithFundamentals } from './stock';
import type { SignalResult } from './signal';

/**
 * Standard API error response.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// ============================================
// Stock Endpoints
// ============================================

/**
 * GET /api/v1/stocks/:ticker
 */
export interface GetStockResponse {
  stock: StockWithFundamentals;
}

/**
 * GET /api/v1/stocks/:ticker/signals
 */
export interface GetSignalsResponse {
  result: SignalResult;
}

/**
 * GET /api/v1/stocks/search?q=:query
 */
export interface SearchStocksResponse {
  stocks: Stock[];
}

// ============================================
// Health Endpoints
// ============================================

/**
 * GET /health
 */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  version?: string;
  timestamp?: string;
}
