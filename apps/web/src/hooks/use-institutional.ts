import { useQuery } from '@tanstack/react-query';
import { fetchInstitutionalDetail, InstitutionalDetail } from '@/lib/api';
import { STALE_TIME } from '@/lib/constants';

export function useInstitutionalDetail(ticker: string) {
  return useQuery<InstitutionalDetail>({
    queryKey: ['institutional', ticker.toUpperCase()],
    queryFn: () => fetchInstitutionalDetail(ticker),
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
