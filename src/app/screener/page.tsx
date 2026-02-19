'use client';

import { Suspense, useCallback, useState } from 'react';
import {
  ChevronDown,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useScreenerFilters,
  useScreenerResults,
} from '@/hooks/use-screener';
import { QuickScreens } from '@/components/screener/QuickScreens';
import { ScreenerResults } from '@/components/screener/ScreenerResults';
import type { ScreenerFilters } from '@/lib/api';
import { SECTORS } from '@/lib/screener-utils';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

// =============================================================================
// Filter category definitions
// =============================================================================

interface FilterField {
  label: string;
  minKey: keyof ScreenerFilters;
  maxKey?: keyof ScreenerFilters;
  step?: number;
  placeholder?: [string, string];
  /** If true, input accepts percentage values (user types "20" for 20%) and converts to/from decimal (0.20) for the API. */
  isPercent?: boolean;
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
      { label: 'Revenue Growth', minKey: 'revenueGrowthMin', maxKey: 'revenueGrowthMax', step: 1, isPercent: true },
      { label: 'EPS Growth', minKey: 'epsGrowthMin', maxKey: 'epsGrowthMax', step: 1, isPercent: true },
    ],
  },
  {
    label: 'Profitability',
    fields: [
      { label: 'Gross Margin', minKey: 'grossMarginMin', maxKey: 'grossMarginMax', step: 1, isPercent: true },
      { label: 'Operating Margin', minKey: 'operatingMarginMin', maxKey: 'operatingMarginMax', step: 1, isPercent: true },
      { label: 'Net Margin', minKey: 'netMarginMin', maxKey: 'netMarginMax', step: 1, isPercent: true },
      { label: 'FCF Margin', minKey: 'fcfMarginMin', maxKey: 'fcfMarginMax', step: 1, isPercent: true },
      { label: 'ROE', minKey: 'roeMin', maxKey: 'roeMax', step: 1, isPercent: true },
      { label: 'ROIC', minKey: 'roicMin', maxKey: 'roicMax', step: 1, isPercent: true },
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
      { label: 'Dividend Yield', minKey: 'dividendYieldMin', maxKey: 'dividendYieldMax', step: 0.1, isPercent: true },
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
// Filter sub-components
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

      {isOpen && (
        <div className="border-t px-4 py-4 space-y-6">
          <SectorFilter
            selected={filters.sectors || []}
            onChange={(sectors) => onUpdate('sectors', sectors.length > 0 ? sectors : undefined)}
          />

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
                    isPercent={field.isPercent}
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
        {SECTORS.map((sector) => {
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
  isPercent,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  minValue?: number;
  maxValue?: number;
  step?: number;
  placeholder?: [string, string];
  isPercent?: boolean;
  onMinChange: (v: number | undefined) => void;
  onMaxChange?: (v: number | undefined) => void;
}) {
  // For percent fields: display value * 100 (decimal → %), store input / 100 (% → decimal)
  const toDisplay = (v: number | undefined) =>
    v !== undefined && isPercent ? parseFloat((v * 100).toPrecision(10)) : v;

  const fromInput = (raw: string): number | undefined => {
    if (raw === '') return undefined;
    const num = Number(raw);
    if (isNaN(num)) return undefined;
    return isPercent ? num / 100 : num;
  };

  const inputClass = "w-full rounded-md border bg-background px-2.5 py-1.5 text-xs tabular-nums placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">
        {label}{isPercent ? ' (%)' : ''}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={step || 'any'}
          value={toDisplay(minValue) ?? ''}
          onChange={(e) => onMinChange(fromInput(e.target.value))}
          placeholder={placeholder?.[0] || 'Min'}
          className={inputClass}
        />
        {onMaxChange && (
          <>
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="number"
              step={step || 'any'}
              value={toDisplay(maxValue) ?? ''}
              onChange={(e) => onMaxChange(fromInput(e.target.value))}
              placeholder={placeholder?.[1] || 'Max'}
              className={inputClass}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
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
// Main page
// =============================================================================

function ScreenerContent() {
  const { filters, setFilters, updateFilter, clearFilters, activeFilterCount } =
    useScreenerFilters();
  const { data, isLoading, isFetching } = useScreenerResults(filters);

  const handleSort = useCallback(
    (field: string, order: 'asc' | 'desc') => {
      setFilters({ ...filters, sort: field, order, offset: undefined });
    },
    [filters, setFilters]
  );

  const handlePageChange = useCallback(
    (newOffset: number) => {
      updateFilter('offset', newOffset > 0 ? newOffset : undefined);
    },
    [updateFilter]
  );

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
        <ShareButton />
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

      {/* Active sector pills */}
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

      {/* Results */}
      <ScreenerResults
        data={data}
        isLoading={isLoading}
        isFetching={isFetching}
        filters={filters}
        onSort={handleSort}
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
