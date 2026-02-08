import { useQueries } from '@tanstack/react-query';
import { fetchStock, ApiError } from '@/lib/api';
import { STALE_TIME } from '@/lib/constants';
import type { StockDetailResponse } from '@recon/shared';

export function useStocks(tickers: string[]) {
  const queries = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: ['stock', ticker.toUpperCase()],
      queryFn: () => fetchStock(ticker),
      staleTime: STALE_TIME,
      enabled: Boolean(ticker),
      retry: (failureCount: number, error: Error) => {
        if (error instanceof ApiError && error.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const data = queries.map((q) => q.data as StockDetailResponse | undefined);
  const errors = queries.map((q) => q.error);

  return {
    queries,
    data,
    errors,
    isLoading,
    isError,
    isAllLoaded: queries.every((q) => q.isSuccess),
  };
}
