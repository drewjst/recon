import { useQuery } from '@tanstack/react-query';
import {
  fetchSectors,
  fetchSectorOverview,
  type SectorOverviewResponse,
  type SectorListResponse,
  type SectorSortField,
} from '@/lib/api';

const SECTOR_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const SECTOR_LIST_STALE_TIME = 10 * 60 * 1000; // 10 minutes (static list)
const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useSectors() {
  return useQuery<SectorListResponse>({
    queryKey: ['sectors'],
    queryFn: fetchSectors,
    staleTime: SECTOR_LIST_STALE_TIME,
  });
}

export function useSectorOverview(
  sector: string,
  sort: SectorSortField = '52whigh',
  limit: number = 20
) {
  return useQuery<SectorOverviewResponse>({
    queryKey: ['sector-overview', sector, sort, limit],
    queryFn: () => fetchSectorOverview(sector, sort, limit),
    staleTime: SECTOR_STALE_TIME,
    refetchInterval: isMarketOpen() ? REFETCH_INTERVAL : false,
    enabled: Boolean(sector),
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error && (error as { status: number }).status === 400) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/** Check if US stock market is likely open (Mon-Fri, 9:30-16:00 ET). */
function isMarketOpen(): boolean {
  const now = new Date();
  const etString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etString);
  const hour = etDate.getHours();
  const minute = etDate.getMinutes();
  const day = etDate.getDay();

  const isWeekday = day >= 1 && day <= 5;
  const minuteOfDay = hour * 60 + minute;
  const marketOpen = 9 * 60 + 30; // 9:30
  const marketClose = 16 * 60; // 16:00

  return isWeekday && minuteOfDay >= marketOpen && minuteOfDay < marketClose;
}
