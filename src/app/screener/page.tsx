'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useScreenerFilters,
  useScreenerResults,
} from '@/hooks/use-screener';
import { QuickScreens } from '@/components/screener/QuickScreens';
import type { ScreenerFilters, ScreenerStock } from '@/lib/api';
import { formatCurrency, formatPercent, formatGrowth, formatRatio, formatDate, getGrowthColor } from '@/lib/format';
import { cn } from '@/lib/utils';

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
    align: 'right',
    minWidth: 'min-w-[70px]',
  },
  {
    key: 'altmanZ',
    label: 'Altman Z',
    sortKey: 'altman_z',
    format: (s) => formatRatio(s.altmanZ),
    align: 'right',
    minWidth: 'min-w-[70px]',
  },
];

/** Default visible columns for the table. */
const DEFAULT_VISIBLE = new Set([
  'ticker', 'name', 'marketCap', 'price', 'changePct',
  'pe', 'revenueGrowth', 'roe', 'piotroskiScore',
]);

// =============================================================================
// Filter category definitions (for the expandable filter panel)
// =============================================================================

interface FilterField {
  label: string;
  minKey: keyof ScreenerFilters;
  maxKey?: keyof ScreenerFilters;
  step?: number;
  placeholder?: [string, string];
}

interface FilterCategory {
  label: string;
  fields: FilterField[];
}

const FILTER_CATEGORIES: FilterCategory[] = [
  {
    label: 'Valuation',
    fields: [
      { label: 'P/E Ratio', minKey: 'peMin', maxKey: 'peMax' },
      { label: 'P/S Ratio', minKey: 'psMin', maxKey: 'psMax' },
      { label: 'P/B Ratio', minKey: 'pbMin', maxKey: 'pbMax' },
      { label: 'EV/EBITDA', minKey: 'evEbitdaMin', maxKey: 'evEbitdaMax' },
      { label: 'PEG Ratio', minKey: 'pegMin', maxKey: 'pegMax' },
      { label: 'Forward P/E', minKey: 'forwardPeMin', maxKey: 'forwardPeMax' },
    ],
  },
  {
    label: 'Growth',
    fields: [
      { label: 'Revenue Growth', minKey: 'revenueGrowthMin', maxKey: 'revenueGrowthMax', step: 0.01 },
      { label: 'EPS Growth', minKey: 'epsGrowthMin', maxKey: 'epsGrowthMax', step: 0.01 },
    ],
  },
  {
    label: 'Profitability',
    fields: [
      { label: 'Gross Margin', minKey: 'grossMarginMin', maxKey: 'grossMarginMax', step: 0.01 },
      { label: 'Operating Margin', minKey: 'operatingMarginMin', maxKey: 'operatingMarginMax', step: 0.01 },
      { label: 'Net Margin', minKey: 'netMarginMin', maxKey: 'netMarginMax', step: 0.01 },
      { label: 'FCF Margin', minKey: 'fcfMarginMin', maxKey: 'fcfMarginMax', step: 0.01 },
      { label: 'ROE', minKey: 'roeMin', maxKey: 'roeMax', step: 0.01 },
      { label: 'ROIC', minKey: 'roicMin', maxKey: 'roicMax', step: 0.01 },
    ],
  },
  {
    label: 'Financial Health',
    fields: [
      { label: 'Debt/Equity', minKey: 'debtToEquityMin', maxKey: 'debtToEquityMax' },
      { label: 'Current Ratio', minKey: 'currentRatioMin', maxKey: 'currentRatioMax' },
      { label: 'Piotroski Score', minKey: 'piotroskiScoreMin' },
      { label: 'Altman Z-Score', minKey: 'altmanZMin' },
    ],
  },
  {
    label: 'Dividends',
    fields: [
      { label: 'Dividend Yield', minKey: 'dividendYieldMin', maxKey: 'dividendYieldMax', step: 0.01 },
    ],
  },
  {
    label: 'Size',
    fields: [
      {
        label: 'Market Cap',
        minKey: 'marketCapMin',
        maxKey: 'marketCapMax',
        placeholder: ['e.g. 1000000000', 'e.g. 100000000000'],
      },
    ],
  },
];

// =============================================================================
// Sub-components
// =============================================================================

function FilterPanel({
  filters,
  onUpdate,
  onClear,
  activeCount,
}: {
  filters: ScreenerFilters;
  onUpdate: (key: keyof ScreenerFilters, value: unknown) => void;
  onClear: () => void;
  activeCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card">
      {/* Toggle bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Filter grid */}
      {isOpen && (
        <div className="border-t px-4 py-4 space-y-6">
          {/* Sector chips */}
          <SectorFilter
            selected={filters.sectors || []}
            onChange={(sectors) => onUpdate('sectors', sectors.length > 0 ? sectors : undefined)}
          />

          {/* Metric ranges */}
          {FILTER_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {cat.label}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                {cat.fields.map((field) => (
                  <RangeInput
                    key={field.label}
                    label={field.label}
                    minValue={(filters[field.minKey] as number) ?? undefined}
                    maxValue={field.maxKey ? (filters[field.maxKey] as number) ?? undefined : undefined}
                    step={field.step}
                    placeholder={field.placeholder}
                    onMinChange={(v) => onUpdate(field.minKey, v)}
                    onMaxChange={field.maxKey ? (v) => onUpdate(field.maxKey!, v) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const GICS_SECTORS = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Communication Services', 'Industrials', 'Consumer Defensive', 'Energy',
  'Utilities', 'Real Estate', 'Basic Materials',
];

function SectorFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (sectors: string[]) => void;
}) {
  const toggle = (sector: string) => {
    if (selected.includes(sector)) {
      onChange(selected.filter((s) => s !== sector));
    } else {
      onChange([...selected, sector]);
    }
  };

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Sector
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {GICS_SECTORS.map((sector) => {
          const isActive = selected.includes(sector);
          return (
            <button
              key={sector}
              onClick={() => toggle(sector)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60'
              )}
            >
              {sector}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RangeInput({
  label,
  minValue,
  maxValue,
  step,
  placeholder,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  minValue?: number;
  maxValue?: number;
  step?: number;
  placeholder?: [string, string];
  onMinChange: (v: number | undefined) => void;
  onMaxChange?: (v: number | undefined) => void;
}) {
  const parseInput = (raw: string): number | undefined => {
    if (raw === '') return undefined;
    const num = Number(raw);
    return isNaN(num) ? undefined : num;
  };

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={step || 'any'}
          value={minValue ?? ''}
          onChange={(e) => onMinChange(parseInput(e.target.value))}
          placeholder={placeholder?.[0] || 'Min'}
          className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs tabular-nums placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {onMaxChange && (
          <>
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="number"
              step={step || 'any'}
              value={maxValue ?? ''}
              onChange={(e) => onMaxChange(parseInput(e.target.value))}
              placeholder={placeholder?.[1] || 'Max'}
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs tabular-nums placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </>
        )}
      </div>
    </div>
  );
}

function ResultsTable({
  stocks,
  isLoading,
  sort,
  order,
  onSort,
  visibleColumns,
}: {
  stocks: ScreenerStock[];
  isLoading: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
  onSort: (sortKey: string) => void;
  visibleColumns: Set<string>;
}) {
  const columns = useMemo(
    () => COLUMNS.filter((col) => visibleColumns.has(col.key)),
    [visibleColumns]
  );

  const handleSort = (col: ColumnDef) => {
    if (col.sortKey) onSort(col.sortKey);
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap',
                  col.align === 'right' ? 'text-right' : 'text-left',
                  col.minWidth,
                  col.sortKey && 'cursor-pointer select-none hover:text-foreground transition-colors'
                )}
                onClick={() => handleSort(col)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.shortLabel || col.label}
                  {col.sortKey && sort === col.sortKey && (
                    <ArrowUpDown className={cn('h-3 w-3', order === 'asc' && 'rotate-180')} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading && stocks.length === 0 ? (
            Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b last:border-b-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : stocks.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="font-medium">No stocks match your filters</p>
                <p className="text-xs mt-1">Try adjusting your criteria</p>
              </td>
            </tr>
          ) : (
            stocks.map((stock) => (
              <tr
                key={stock.ticker}
                className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3 py-2.5 whitespace-nowrap tabular-nums',
                      col.align === 'right' ? 'text-right' : 'text-left',
                      col.colorFn ? col.colorFn(stock) : ''
                    )}
                  >
                    {col.key === 'ticker' ? (
                      <Link
                        href={`/stock/${stock.ticker}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {stock.ticker}
                      </Link>
                    ) : col.key === 'name' ? (
                      <span className="text-foreground max-w-[200px] truncate block">
                        {col.format(stock)}
                      </span>
                    ) : (
                      col.format(stock)
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
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
        Showing {offset + 1}–{Math.min(offset + limit, total)} of {total.toLocaleString()} stocks
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
      // Don't allow removing ticker
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

function ShareButton({ filters }: { filters: ScreenerFilters }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className="h-8 text-xs">
      <Share2 className="h-3 w-3 mr-1" />
      {copied ? 'Copied!' : 'Share'}
    </Button>
  );
}

// =============================================================================
// Main page (wrapped in Suspense for useSearchParams)
// =============================================================================

function ScreenerContent() {
  const { filters, setFilters, updateFilter, clearFilters, activeFilterCount } = useScreenerFilters();
  const { data, isLoading, isFetching } = useScreenerResults(filters);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE);

  const handleSort = useCallback(
    (sortKey: string) => {
      const newOrder: 'asc' | 'desc' =
        filters.sort === sortKey && filters.order !== 'asc' ? 'asc' : 'desc';
      setFilters({ ...filters, sort: sortKey, order: newOrder, offset: undefined });
    },
    [filters, setFilters]
  );

  const handlePageChange = useCallback(
    (newOffset: number) => {
      updateFilter('offset', newOffset > 0 ? newOffset : undefined);
    },
    [updateFilter]
  );

  const stocks = data?.stocks || [];
  const total = data?.total || 0;
  const limit = data?.limit || 25;
  const offset = filters.offset || 0;

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock Screener</h1>
          {data?.synced_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Data as of {formatDate(data.synced_at)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShareButton filters={filters} />
          <ColumnPicker visible={visibleColumns} onChange={setVisibleColumns} />
        </div>
      </div>

      {/* Quick Screens */}
      <QuickScreens onSelect={setFilters} activeFilters={filters} />

      {/* Filters */}
      <FilterPanel
        filters={filters}
        onUpdate={updateFilter}
        onClear={clearFilters}
        activeCount={activeFilterCount}
      />

      {/* Active filter pills */}
      {filters.sectors && filters.sectors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.sectors.map((sector) => (
            <span
              key={sector}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {sector}
              <button
                onClick={() =>
                  updateFilter(
                    'sectors',
                    filters.sectors!.filter((s) => s !== sector)
                  )
                }
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Results count + loading indicator */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-4 w-32 inline-block" />
          ) : (
            <>{total.toLocaleString()} stocks found</>
          )}
        </p>
        {isFetching && !isLoading && (
          <div className="h-1 w-16 rounded-full bg-primary/20 overflow-hidden">
            <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Results Table */}
      <ResultsTable
        stocks={stocks}
        isLoading={isLoading}
        sort={filters.sort}
        order={filters.order}
        onSort={handleSort}
        visibleColumns={visibleColumns}
      />

      {/* Pagination */}
      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default function ScreenerPage() {
  return (
    <Suspense fallback={null}>
      <ScreenerContent />
    </Suspense>
  );
}
