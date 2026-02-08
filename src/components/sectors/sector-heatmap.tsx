'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useSectors, useSectorOverview } from '@/hooks/use-sector-overview';
import type { SectorSortField } from '@/lib/api';
import { useColumnVisibility } from './use-column-visibility';
import { ColumnToggle } from './column-toggle';
import { ShareButton } from '@/components/ui/share-button';
import { SummaryBar } from './summary-bar';
import { HeatmapTable, HeatmapTableSkeleton } from './heatmap-table';

const DEFAULT_SECTOR = 'Technology';
const DEFAULT_SORT: SectorSortField = 'marketcap';
const DEFAULT_LIMIT = 30;

const SORT_OPTIONS: { value: SectorSortField; label: string }[] = [
  { value: '52whigh', label: 'Near 52W High' },
  { value: 'ytd', label: 'YTD Performance' },
  { value: '1y', label: '1Y Performance' },
  { value: 'marketcap', label: 'Market Cap' },
  { value: 'ps', label: 'P/S Ratio' },
  { value: 'pe', label: 'P/E Ratio' },
];

export function SectorHeatmap() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sector = searchParams.get('sector') || DEFAULT_SECTOR;
  const sort = (searchParams.get('sort') as SectorSortField) || DEFAULT_SORT;

  const { data: sectorList } = useSectors();
  const { data, isLoading, isError, error } = useSectorOverview(
    sector,
    sort,
    DEFAULT_LIMIT
  );
  const { visibleColumns, toggleColumn } = useColumnVisibility();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.push(`/sectors?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleSectorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateParams('sector', e.target.value);
    },
    [updateParams]
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateParams('sort', e.target.value);
    },
    [updateParams]
  );

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={sector}
          onChange={handleSectorChange}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {sectorList?.sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          )) ?? (
            <option value={sector}>{sector}</option>
          )}
        </select>

        <select
          value={sort}
          onChange={handleSortChange}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1">
          <ShareButton
            ticker={sector}
            text={`${sector} sector overview on Cruxit`}
            url={`https://cruxit.finance/sectors?sector=${encodeURIComponent(sector)}`}
          />
          <ColumnToggle
            visibleColumns={visibleColumns}
            onToggle={toggleColumn}
          />
        </div>
      </div>

      {/* Summary bar */}
      {data && (
        <SummaryBar
          summary={data.summary}
          stockCount={data.stockCount}
        />
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-negative/30 bg-negative/5 p-4 text-sm text-negative">
          Failed to load sector data
          {error instanceof Error ? `: ${error.message}` : ''}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <HeatmapTableSkeleton />
      ) : data ? (
        <HeatmapTable
          stocks={data.stocks}
          visibleColumns={visibleColumns}
        />
      ) : null}
    </div>
  );
}
