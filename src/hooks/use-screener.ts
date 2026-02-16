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

const SCREENER_STALE_TIME = 5 * 60 * 1000; // 5 minutes (data is nightly)
const FILTER_OPTIONS_STALE_TIME = 10 * 60 * 1000; // 10 minutes (rarely changes)

const DEFAULT_LIMIT = 25;

/**
 * Map from URL param names (snake_case, matching the Go API) to ScreenerFilters keys (camelCase).
 */
const URL_TO_FILTER_MAP: Record<string, keyof ScreenerFilters> = {
  sector: 'sectors',
  industry: 'industry',
  market_cap_min: 'marketCapMin',
  market_cap_max: 'marketCapMax',
  pe_min: 'peMin',
  pe_max: 'peMax',
  forward_pe_min: 'forwardPeMin',
  forward_pe_max: 'forwardPeMax',
  ps_min: 'psMin',
  ps_max: 'psMax',
  pb_min: 'pbMin',
  pb_max: 'pbMax',
  ev_ebitda_min: 'evEbitdaMin',
  ev_ebitda_max: 'evEbitdaMax',
  peg_min: 'pegMin',
  peg_max: 'pegMax',
  dividend_yield_min: 'dividendYieldMin',
  dividend_yield_max: 'dividendYieldMax',
  revenue_growth_min: 'revenueGrowthMin',
  revenue_growth_max: 'revenueGrowthMax',
  eps_growth_min: 'epsGrowthMin',
  eps_growth_max: 'epsGrowthMax',
  gross_margin_min: 'grossMarginMin',
  gross_margin_max: 'grossMarginMax',
  operating_margin_min: 'operatingMarginMin',
  operating_margin_max: 'operatingMarginMax',
  net_margin_min: 'netMarginMin',
  net_margin_max: 'netMarginMax',
  fcf_margin_min: 'fcfMarginMin',
  fcf_margin_max: 'fcfMarginMax',
  roe_min: 'roeMin',
  roe_max: 'roeMax',
  roic_min: 'roicMin',
  roic_max: 'roicMax',
  debt_to_equity_min: 'debtToEquityMin',
  debt_to_equity_max: 'debtToEquityMax',
  current_ratio_min: 'currentRatioMin',
  current_ratio_max: 'currentRatioMax',
  piotroski_score_min: 'piotroskiScoreMin',
  altman_z_min: 'altmanZMin',
  sort: 'sort',
  order: 'order',
  limit: 'limit',
  offset: 'offset',
};

/** Reverse: ScreenerFilters key → URL param name */
const FILTER_TO_URL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(URL_TO_FILTER_MAP).map(([url, filter]) => [filter, url])
);

/** Numeric filter keys (parsed as float from URL). */
const NUMERIC_KEYS = new Set<string>([
  'marketCapMin', 'marketCapMax',
  'peMin', 'peMax', 'forwardPeMin', 'forwardPeMax',
  'psMin', 'psMax', 'pbMin', 'pbMax',
  'evEbitdaMin', 'evEbitdaMax', 'pegMin', 'pegMax',
  'dividendYieldMin', 'dividendYieldMax',
  'revenueGrowthMin', 'revenueGrowthMax',
  'epsGrowthMin', 'epsGrowthMax',
  'grossMarginMin', 'grossMarginMax',
  'operatingMarginMin', 'operatingMarginMax',
  'netMarginMin', 'netMarginMax',
  'fcfMarginMin', 'fcfMarginMax',
  'roeMin', 'roeMax', 'roicMin', 'roicMax',
  'debtToEquityMin', 'debtToEquityMax',
  'currentRatioMin', 'currentRatioMax',
  'piotroskiScoreMin', 'altmanZMin',
  'limit', 'offset',
]);

/** Parse URL search params into a ScreenerFilters object. */
function parseFiltersFromURL(searchParams: URLSearchParams): ScreenerFilters {
  const filters: ScreenerFilters = {};

  for (const [urlKey, filterKey] of Object.entries(URL_TO_FILTER_MAP)) {
    const value = searchParams.get(urlKey);
    if (value == null || value === '') continue;

    if (filterKey === 'sectors') {
      filters.sectors = value.split(',').filter(Boolean);
    } else if (filterKey === 'order') {
      filters.order = value === 'asc' ? 'asc' : 'desc';
    } else if (NUMERIC_KEYS.has(filterKey)) {
      const num = Number(value);
      if (!isNaN(num)) {
        (filters as Record<string, unknown>)[filterKey] = num;
      }
    } else {
      (filters as Record<string, unknown>)[filterKey] = value;
    }
  }

  return filters;
}

/** Convert ScreenerFilters to URL search params string. */
function filtersToURLParams(filters: ScreenerFilters): string {
  const params = new URLSearchParams();

  for (const [filterKey, urlKey] of Object.entries(FILTER_TO_URL_MAP)) {
    const value = (filters as Record<string, unknown>)[filterKey];
    if (value == null) continue;

    if (filterKey === 'sectors') {
      const sectors = value as string[];
      if (sectors.length > 0) params.set(urlKey, sectors.join(','));
    } else {
      params.set(urlKey, String(value));
    }
  }

  return params.toString();
}

/** Count active filters (excluding sort/order/pagination). */
export function countActiveFilters(filters: ScreenerFilters): number {
  let count = 0;
  if (filters.sectors?.length) count++;
  if (filters.industry) count++;

  const rangeKeys: (keyof ScreenerFilters)[] = [
    'marketCapMin', 'marketCapMax', 'peMin', 'peMax',
    'forwardPeMin', 'forwardPeMax', 'psMin', 'psMax',
    'pbMin', 'pbMax', 'evEbitdaMin', 'evEbitdaMax',
    'pegMin', 'pegMax', 'dividendYieldMin', 'dividendYieldMax',
    'revenueGrowthMin', 'revenueGrowthMax', 'epsGrowthMin', 'epsGrowthMax',
    'grossMarginMin', 'grossMarginMax', 'operatingMarginMin', 'operatingMarginMax',
    'netMarginMin', 'netMarginMax', 'fcfMarginMin', 'fcfMarginMax',
    'roeMin', 'roeMax', 'roicMin', 'roicMax',
    'debtToEquityMin', 'debtToEquityMax', 'currentRatioMin', 'currentRatioMax',
    'piotroskiScoreMin', 'altmanZMin',
  ];

  for (const key of rangeKeys) {
    if (filters[key] != null) count++;
  }

  return count;
}

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
