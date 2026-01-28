import { useQuery } from '@tanstack/react-query';
import { fetchStock } from '@/lib/api';
import { STALE_TIME } from '@/lib/constants';
import type { StockDetailResponse } from '@recon/shared';

export function useStock(ticker: string, initialData?: StockDetailResponse | null) {
  return useQuery<StockDetailResponse>({
    queryKey: ['stock', ticker.toUpperCase()],
    queryFn: () => fetchStock(ticker),
    initialData: initialData || undefined,
    staleTime: STALE_TIME,
    enabled: Boolean(ticker),
    retry: (failureCount, error) => {
      // Don't retry on 404s
      if (error instanceof Error && 'status' in error && error.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
