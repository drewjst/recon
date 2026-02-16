'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchScreener,
  fetchScreenerFilterOptions,
  fetchScreenerPresets,
  type ScreenerFilters,
  type ScreenerResponse,
  type ScreenerFilterOptions,
  type ScreenerPresetsResponse,
} from '@/lib/api';
import {
  parseFiltersFromURL,
  filtersToURLParams,
  countActiveFilters,
} from '@/lib/screener-utils';

const SCREENER_STALE_TIME = 5 * 60 * 1000; // 5 minutes (data is nightly)
const FILTER_OPTIONS_STALE_TIME = 10 * 60 * 1000; // 10 minutes (rarely changes)

const DEFAULT_LIMIT = 25;

/**
 * Hook to sync screener filter state with URL search params.
 * URL is the single source of truth — filters are parsed from URL and updates push new URLs.
 */
export function useScreenerFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => parseFiltersFromURL(searchParams),
    [searchParams]
  );

  const setFilters = useCallback(
    (newFilters: ScreenerFilters) => {
      const params = filtersToURLParams(newFilters);
      router.push(`${pathname}${params ? `?${params}` : ''}`, { scroll: false });
    },
    [router, pathname]
  );

  const updateFilter = useCallback(
    (key: keyof ScreenerFilters, value: unknown) => {
      const next = { ...filters, [key]: value };
      // Reset offset when filters change (not when paginating)
      if (key !== 'offset') {
        delete next.offset;
      }
      setFilters(next);
    },
    [filters, setFilters]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters]
  );

  return { filters, setFilters, updateFilter, clearFilters, activeFilterCount };
}

/** Fetch screener results with React Query. Uses filters as query key for automatic refetching. */
export function useScreenerResults(filters: ScreenerFilters) {
  const queryFilters = useMemo(
    () => ({ ...filters, limit: filters.limit || DEFAULT_LIMIT }),
    [filters]
  );

  return useQuery<ScreenerResponse>({
    queryKey: ['screener', queryFilters],
    queryFn: () => fetchScreener(queryFilters),
    staleTime: SCREENER_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

/** Fetch available filter options (sectors, industries, metric ranges). */
export function useScreenerFilterOptions() {
  return useQuery<ScreenerFilterOptions>({
    queryKey: ['screener-filter-options'],
    queryFn: fetchScreenerFilterOptions,
    staleTime: FILTER_OPTIONS_STALE_TIME,
  });
}

/** Fetch screener presets. */
export function useScreenerPresets() {
  return useQuery<ScreenerPresetsResponse>({
    queryKey: ['screener-presets'],
    queryFn: fetchScreenerPresets,
    staleTime: FILTER_OPTIONS_STALE_TIME,
  });
}
