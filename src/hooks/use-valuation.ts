import { useQuery } from '@tanstack/react-query';
import { fetchValuation } from '@/lib/api';
import { STALE_TIME } from '@/lib/constants';
import type { ValuationDeepDive } from '@recon/shared';

export function useValuation(ticker: string) {
  return useQuery<ValuationDeepDive>({
    queryKey: ['valuation', ticker.toUpperCase()],
    queryFn: () => fetchValuation(ticker),
    staleTime: STALE_TIME,
    enabled: Boolean(ticker),
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error && error.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
