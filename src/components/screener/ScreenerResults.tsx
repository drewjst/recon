'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent, formatGrowth, formatRatio, formatDate, getGrowthColor } from '@/lib/format';
import { SCORE_THRESHOLDS } from '@/lib/constants';
import type { ScreenerFilters, ScreenerResponse, ScreenerStock } from '@/lib/api';

// =============================================================================
// Column definitions
// =============================================================================

interface ColumnDef {
  key: string;
  label: string;
  shortLabel?: string;
  sortKey?: string;
  format: (stock: ScreenerStock) => string;
  colorFn?: (stock: ScreenerStock) => string;
  align?: 'left' | 'right';
  minWidth?: string;
}

function piotroskiColor(stock: ScreenerStock): string {
  const v = stock.piotroskiScore;
  if (v == null) return 'text-muted-foreground';
  if (v >= SCORE_THRESHOLDS.piotroski.strong) return 'text-positive';
  if (v < SCORE_THRESHOLDS.piotroski.moderate) return 'text-negative';
  return '';
}

function altmanZColor(stock: ScreenerStock): string {
  const v = stock.altmanZ;
  if (v == null) return 'text-muted-foreground';
  if (v >= SCORE_THRESHOLDS.altmanZ.safe) return 'text-positive';
  if (v < SCORE_THRESHOLDS.altmanZ.gray) return 'text-negative';
  return '';
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'ticker',
    label: 'Ticker',
    sortKey: 'ticker',
    format: (s) => s.ticker,
    align: 'left',
    minWidth: 'min-w-[60px]',
  },
  {
    key: 'name',
    label: 'Company',
    sortKey: 'name',
    format: (s) => s.name || '—',
    align: 'left',
    minWidth: 'min-w-[140px]',
  },
  {
    key: 'sector',
    label: 'Sector',
    format: (s) => s.sector || '—',
    align: 'left',
    minWidth: 'min-w-[100px]',
  },
  {
    key: 'marketCap',
    label: 'Market Cap',
    shortLabel: 'Mkt Cap',
    sortKey: 'market_cap',
    format: (s) => formatCurrency(s.marketCap),
    align: 'right',
    minWidth: 'min-w-[90px]',
  },
  {
    key: 'price',
    label: 'Price',
    sortKey: 'price',
    format: (s) => s.price != null ? `$${s.price.toFixed(2)}` : '—',
    align: 'right',
    minWidth: 'min-w-[70px]',
  },
  {
    key: 'changePct',
    label: 'Chg %',
    sortKey: 'change_pct',
    format: (s) => formatGrowth(s.changePct),
    colorFn: (s) => getGrowthColor(s.changePct),
    align: 'right',
    minWidth: 'min-w-[60px]',
  },
  {
    key: 'pe',
    label: 'P/E',
    sortKey: 'pe',
    format: (s) => formatRatio(s.pe),
    align: 'right',
    minWidth: 'min-w-[60px]',
  },
  {
    key: 'ps',
    label: 'P/S',
    sortKey: 'ps',
    format: (s) => formatRatio(s.ps),
    align: 'right',
    minWidth: 'min-w-[60px]',
  },
  {
    key: 'pb',
    label: 'P/B',
    sortKey: 'pb',
    format: (s) => formatRatio(s.pb),
    align: 'right',
    minWidth: 'min-w-[60px]',
  },
  {
    key: 'evEbitda',
    label: 'EV/EBITDA',
    sortKey: 'ev_ebitda',
    format: (s) => formatRatio(s.evEbitda),
    align: 'right',
    minWidth: 'min-w-[80px]',
  },
  {
    key: 'dividendYield',
    label: 'Div Yield',
    sortKey: 'dividend_yield',
    format: (s) => formatPercent(s.dividendYield, 1, true),
    align: 'right',
    minWidth: 'min-w-[70px]',
  },
  {
    key: 'revenueGrowth',
    label: 'Rev Growth',
    sortKey: 'revenue_growth',
    format: (s) => formatPercent(s.revenueGrowth, 1, true),
    colorFn: (s) => getGrowthColor(s.revenueGrowth),
    align: 'right',
    minWidth: 'min-w-[80px]',
  },
  {
    key: 'epsGrowth',
    label: 'EPS Growth',
    sortKey: 'eps_growth',
    format: (s) => formatPercent(s.epsGrowth, 1, true),
    colorFn: (s) => getGrowthColor(s.epsGrowth),
    align: 'right',
    minWidth: 'min-w-[80px]',
  },
  {
    key: 'grossMargin',
    label: 'Gross Margin',
    sortKey: 'gross_margin',
    format: (s) => formatPercent(s.grossMargin, 1, true),
    align: 'right',
    minWidth: 'min-w-[90px]',
  },
  {
    key: 'roe',
    label: 'ROE',
    sortKey: 'roe',
    format: (s) => formatPercent(s.roe, 1, true),
    align: 'right',
    minWidth: 'min-w-[60px]',
  },
  {
    key: 'roic',
    label: 'ROIC',
    sortKey: 'roic',
    format: (s) => formatPercent(s.roic, 1, true),
    align: 'right',
    minWidth: 'min-w-[60px]',
  },
  {
    key: 'debtToEquity',
    label: 'D/E',
    sortKey: 'debt_to_equity',
    format: (s) => formatRatio(s.debtToEquity),
    align: 'right',
    minWidth: 'min-w-[50px]',
  },
  {
    key: 'piotroskiScore',
    label: 'Piotroski',
    sortKey: 'piotroski_score',
    format: (s) => s.piotroskiScore != null ? `${s.piotroskiScore}/9` : '—',
    colorFn: piotroskiColor,
    align: 'right',
    minWidth: 'min-w-[70px]',
  },
  {
    key: 'altmanZ',
    label: 'Altman Z',
    sortKey: 'altman_z',
    format: (s) => formatRatio(s.altmanZ),
    colorFn: altmanZColor,
    align: 'right',
    minWidth: 'min-w-[70px]',
  },
];

/** Default visible columns. */
const DEFAULT_VISIBLE = new Set([
  'ticker', 'name', 'marketCap', 'price', 'changePct',
  'pe', 'revenueGrowth', 'roe', 'piotroskiScore',
]);

// =============================================================================
// Sub-components
// =============================================================================

function ColumnPicker({
  visible,
  onChange,
}: {
  visible: Set<string>;
  onChange: (cols: Set<string>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = (key: string) => {
    const next = new Set(visible);
    if (next.has(key)) {
      if (key === 'ticker') return;
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 text-xs"
      >
        Columns
        <ChevronDown className={cn('ml-1 h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
      </Button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border bg-popover shadow-lg p-2 space-y-0.5">
            {COLUMNS.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visible.has(col.key)}
                  onChange={() => toggle(col.key)}
                  disabled={col.key === 'ticker'}
                  className="rounded border-border"
                />
                {col.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Pagination({
  total,
  limit,
  offset,
  onPageChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {offset + 1}–{Math.min(offset + limit, total)} of{' '}
        {total.toLocaleString()} stocks
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={() => onPageChange(offset - limit)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 text-xs tabular-nums text-muted-foreground">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(offset + limit)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ScreenerResultsSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="overflow-hidden rounded-lg border">
        {/* Header row */}
        <div className="flex items-center gap-4 bg-muted/30 px-3 py-2.5 border-b">
          {Array.from({ length: columnCount }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-16" />
          ))}
        </div>
        {/* Body rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-3 py-3 border-b last:border-b-0"
          >
            {Array.from({ length: columnCount }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-16" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenerEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
      <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
      <h3 className="text-base font-medium mb-1">No stocks match your filters</h3>
      <p className="text-sm text-muted-foreground max-w-[280px]">
        Try adjusting your criteria or start with a preset screen
      </p>
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

interface ScreenerResultsProps {
  data?: ScreenerResponse;
  isLoading: boolean;
  isFetching: boolean;
  filters: ScreenerFilters;
  onSort: (field: string, order: 'asc' | 'desc') => void;
  onPageChange: (offset: number) => void;
}

export function ScreenerResults({
  data,
  isLoading,
  isFetching,
  filters,
  onSort,
  onPageChange,
}: ScreenerResultsProps) {
  const router = useRouter();
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE);

  const columns = useMemo(
    () => COLUMNS.filter((col) => visibleColumns.has(col.key)),
    [visibleColumns]
  );

  const handleHeaderSort = (sortKey: string) => {
    const newOrder: 'asc' | 'desc' =
      filters.sort === sortKey && filters.order !== 'asc' ? 'asc' : 'desc';
    onSort(sortKey, newOrder);
  };

  const stocks = data?.stocks ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 25;
  const offset = filters.offset ?? 0;

  // Full skeleton when loading with no previous data
  if (isLoading && !data) {
    return <ScreenerResultsSkeleton columnCount={columns.length} />;
  }

  return (
    <div className="space-y-4">
      {/* Header row: count + sync time + column picker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} stocks found
          </p>
          {data?.synced_at && (
            <span className="text-xs text-muted-foreground/60">
              Updated {formatDate(data.synced_at)}
            </span>
          )}
          {isFetching && !isLoading && (
            <div className="h-1 w-12 rounded-full bg-primary/20 overflow-hidden">
              <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
            </div>
          )}
        </div>
        <ColumnPicker visible={visibleColumns} onChange={setVisibleColumns} />
      </div>

      {/* Empty state */}
      {!isLoading && stocks.length === 0 ? (
        <ScreenerEmptyState />
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {columns.map((col) => {
                    const isSorted = col.sortKey && filters.sort === col.sortKey;
                    return (
                      <th
                        key={col.key}
                        className={cn(
                          'px-3 py-2.5 text-xs font-medium uppercase tracking-wide whitespace-nowrap',
                          col.align === 'right' ? 'text-right' : 'text-left',
                          col.minWidth,
                          col.sortKey
                            ? 'cursor-pointer select-none transition-colors hover:text-foreground'
                            : '',
                          isSorted ? 'text-foreground' : 'text-muted-foreground'
                        )}
                        onClick={() => col.sortKey && handleHeaderSort(col.sortKey)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.shortLabel || col.label}
                          {isSorted && (
                            <ArrowUpDown
                              className={cn(
                                'h-3 w-3',
                                filters.order === 'asc' && 'rotate-180'
                              )}
                            />
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {isLoading && stocks.length === 0
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        {columns.map((col) => (
                          <td key={col.key} className="px-3 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : stocks.map((stock) => (
                      <tr
                        key={stock.ticker}
                        onClick={() => router.push(`/stock/${stock.ticker}`)}
                        className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={cn(
                              'px-3 py-3 whitespace-nowrap tabular-nums',
                              col.align === 'right' ? 'text-right' : 'text-left',
                              col.colorFn ? col.colorFn(stock) : ''
                            )}
                          >
                            {col.key === 'ticker' ? (
                              <Link
                                href={`/stock/${stock.ticker}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-mono font-semibold text-primary hover:underline"
                              >
                                {stock.ticker}
                              </Link>
                            ) : col.key === 'name' ? (
                              <div>
                                <span className="text-foreground max-w-[180px] truncate block">
                                  {col.format(stock)}
                                </span>
                                {stock.sector && (
                                  <span className="text-[11px] text-muted-foreground/60 truncate block max-w-[180px]">
                                    {stock.sector}
                                  </span>
                                )}
                              </div>
                            ) : (
                              col.format(stock)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            total={total}
            limit={limit}
            offset={offset}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}
