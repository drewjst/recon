'use client';

import { memo, useState, useMemo } from 'react';
import { SectionCard } from '@/components/dashboard/sections/section-card';
import { cn } from '@/lib/utils';
import type { ValuationDeepDive, PeerValuation, SectorMedians } from '@recon/shared';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';

interface PeerComparisonSectionProps {
  data: ValuationDeepDive;
}

type MetricKey = 'pe' | 'evToEbitda' | 'ps' | 'growth' | 'peg';
type SortDirection = 'asc' | 'desc';

interface SortState {
  key: MetricKey | 'ticker';
  direction: SortDirection;
}

const METRIC_CONFIG: Record<MetricKey, { label: string; format: (v: number | null) => string; lowerIsBetter: boolean }> = {
  pe: { label: 'P/E', format: (v) => v !== null ? `${v.toFixed(1)}x` : 'N/A', lowerIsBetter: true },
  evToEbitda: { label: 'EV/EBITDA', format: (v) => v !== null ? `${v.toFixed(1)}x` : 'N/A', lowerIsBetter: true },
  ps: { label: 'P/S', format: (v) => v !== null ? `${v.toFixed(1)}x` : 'N/A', lowerIsBetter: true },
  growth: { label: 'Growth', format: (v) => v !== null ? `${v.toFixed(1)}%` : 'N/A', lowerIsBetter: false },
  peg: { label: 'PEG', format: (v) => v !== null ? `${v.toFixed(2)}` : 'N/A', lowerIsBetter: true },
};

function HorizontalBarChart({
  data,
  targetTicker,
  targetValue,
  metric,
  medianValue,
}: {
  data: PeerValuation[];
  targetTicker: string;
  targetValue: number | null;
  metric: MetricKey;
  medianValue: number | null;
}) {
  const config = METRIC_CONFIG[metric];

  // Combine target with peers for the chart
  const allItems = useMemo(() => {
    const items: { ticker: string; value: number | null; isTarget: boolean }[] = [
      { ticker: targetTicker, value: targetValue, isTarget: true },
      ...data.map((p) => ({ ticker: p.ticker, value: p[metric], isTarget: false })),
    ];

    // Sort by value descending (nulls at end)
    return items.sort((a, b) => {
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return b.value - a.value;
    });
  }, [data, targetTicker, targetValue, metric]);

  const maxValue = useMemo(() => {
    const values = allItems.map((i) => i.value).filter((v): v is number => v !== null);
    return Math.max(...values, 1);
  }, [allItems]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span className="font-medium">{config.label} Comparison</span>
        {medianValue !== null && (
          <span>Sector Median: {config.format(medianValue)}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {allItems.map((item) => {
          const width = item.value !== null ? (item.value / maxValue) * 100 : 0;
          const medianPosition = medianValue !== null ? (medianValue / maxValue) * 100 : null;

          return (
            <div key={item.ticker} className="flex items-center gap-2">
              <span className={cn(
                'w-12 text-xs font-mono shrink-0',
                item.isTarget && 'font-bold text-primary'
              )}>
                {item.ticker}
              </span>
              <div className="flex-1 h-6 bg-muted/30 rounded relative overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded transition-all duration-300',
                    item.isTarget
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                      : 'bg-muted-foreground/30'
                  )}
                  style={{ width: `${width}%` }}
                />
                {/* Median line */}
                {medianPosition !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary/60"
                    style={{ left: `${medianPosition}%` }}
                  />
                )}
              </div>
              <span className={cn(
                'w-16 text-xs font-mono text-right shrink-0',
                item.isTarget && 'font-bold'
              )}>
                {config.format(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonTable({
  data,
  targetTicker,
  targetName,
  targetRatios,
  medians,
  sort,
  onSort,
}: {
  data: PeerValuation[];
  targetTicker: string;
  targetName: string;
  targetRatios: { pe: number | null; evToEbitda: number | null; ps: number | null; growth: number | null; peg: number | null };
  medians: SectorMedians | null;
  sort: SortState;
  onSort: (key: MetricKey | 'ticker') => void;
}) {
  // Sort data
  const sortedData = useMemo(() => {
    const items = [...data];
    items.sort((a, b) => {
      if (sort.key === 'ticker') {
        return sort.direction === 'asc'
          ? a.ticker.localeCompare(b.ticker)
          : b.ticker.localeCompare(a.ticker);
      }

      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return items;
  }, [data, sort]);

  const SortIcon = ({ columnKey }: { columnKey: MetricKey | 'ticker' }) => {
    if (sort.key !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sort.direction === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const getCellColor = (value: number | null, median: number | null, lowerIsBetter: boolean) => {
    if (value === null || median === null) return '';
    const ratio = value / median;
    if (lowerIsBetter) {
      if (ratio < 0.85) return 'text-success';
      if (ratio > 1.15) return 'text-destructive';
    } else {
      if (ratio > 1.15) return 'text-success';
      if (ratio < 0.85) return 'text-destructive';
    }
    return '';
  };

  const columns: (MetricKey | 'ticker')[] = ['ticker', 'pe', 'evToEbitda', 'ps', 'growth', 'peg'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            {columns.map((col) => (
              <th
                key={col}
                onClick={() => onSort(col)}
                className={cn(
                  'py-2 px-3 text-xs text-muted-foreground uppercase tracking-wider font-medium cursor-pointer hover:text-foreground transition-colors',
                  col === 'ticker' ? 'text-left' : 'text-right'
                )}
              >
                <span className="inline-flex items-center">
                  {col === 'ticker' ? 'Company' : METRIC_CONFIG[col].label}
                  <SortIcon columnKey={col} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Target stock row - highlighted */}
          <tr className="border-b border-border/50 bg-primary/5">
            <td className="py-2 px-3">
              <span className="font-mono font-bold">{targetTicker}</span>
              <span className="text-muted-foreground text-xs ml-2 hidden sm:inline">{targetName}</span>
            </td>
            <td className={cn('py-2 px-3 text-right font-mono font-bold', getCellColor(targetRatios.pe, medians?.pe ?? null, true))}>
              {METRIC_CONFIG.pe.format(targetRatios.pe)}
            </td>
            <td className={cn('py-2 px-3 text-right font-mono font-bold', getCellColor(targetRatios.evToEbitda, medians?.evToEbitda ?? null, true))}>
              {METRIC_CONFIG.evToEbitda.format(targetRatios.evToEbitda)}
            </td>
            <td className={cn('py-2 px-3 text-right font-mono font-bold', getCellColor(targetRatios.ps, medians?.ps ?? null, true))}>
              {METRIC_CONFIG.ps.format(targetRatios.ps)}
            </td>
            <td className={cn('py-2 px-3 text-right font-mono font-bold', getCellColor(targetRatios.growth, medians?.growth ?? null, false))}>
              {METRIC_CONFIG.growth.format(targetRatios.growth)}
            </td>
            <td className={cn('py-2 px-3 text-right font-mono font-bold', getCellColor(targetRatios.peg, medians?.peg ?? null, true))}>
              {METRIC_CONFIG.peg.format(targetRatios.peg)}
            </td>
          </tr>

          {/* Peer rows */}
          {sortedData.map((peer) => (
            <tr key={peer.ticker} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
              <td className="py-2 px-3">
                <span className="font-mono">{peer.ticker}</span>
                <span className="text-muted-foreground text-xs ml-2 hidden sm:inline truncate max-w-[150px]">{peer.name}</span>
              </td>
              <td className={cn('py-2 px-3 text-right font-mono', getCellColor(peer.pe, medians?.pe ?? null, true))}>
                {METRIC_CONFIG.pe.format(peer.pe)}
              </td>
              <td className={cn('py-2 px-3 text-right font-mono', getCellColor(peer.evToEbitda, medians?.evToEbitda ?? null, true))}>
                {METRIC_CONFIG.evToEbitda.format(peer.evToEbitda)}
              </td>
              <td className={cn('py-2 px-3 text-right font-mono', getCellColor(peer.ps, medians?.ps ?? null, true))}>
                {METRIC_CONFIG.ps.format(peer.ps)}
              </td>
              <td className={cn('py-2 px-3 text-right font-mono', getCellColor(peer.growth, medians?.growth ?? null, false))}>
                {METRIC_CONFIG.growth.format(peer.growth)}
              </td>
              <td className={cn('py-2 px-3 text-right font-mono', getCellColor(peer.peg, medians?.peg ?? null, true))}>
                {METRIC_CONFIG.peg.format(peer.peg)}
              </td>
            </tr>
          ))}

          {/* Median row */}
          {medians && (
            <tr className="border-t-2 border-border bg-muted/20">
              <td className="py-2 px-3 font-medium text-muted-foreground">Sector Median</td>
              <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                {METRIC_CONFIG.pe.format(medians.pe)}
              </td>
              <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                {METRIC_CONFIG.evToEbitda.format(medians.evToEbitda)}
              </td>
              <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                {METRIC_CONFIG.ps.format(medians.ps)}
              </td>
              <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                {METRIC_CONFIG.growth.format(medians.growth)}
              </td>
              <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                {METRIC_CONFIG.peg.format(medians.peg)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PeerComparisonSectionComponent({ data }: PeerComparisonSectionProps) {
  const { sectorContext, historicalContext, keyMetrics } = data;
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('evToEbitda');
  const [sort, setSort] = useState<SortState>({ key: 'evToEbitda', direction: 'desc' });

  // Get target stock's ratios from keyMetrics - must be called before early return
  const targetRatios = useMemo(() => {
    const getMetric = (key: string): number | null => {
      const metric = keyMetrics?.find((m) => m.key === key);
      return metric?.current ?? null;
    };

    return {
      pe: historicalContext?.currentPE ?? null,
      evToEbitda: getMetric('evToEbitda'),
      ps: getMetric('ps'),
      growth: null as number | null,
      peg: getMetric('peg'),
    };
  }, [keyMetrics, historicalContext]);

  // Get target growth from growth context
  const targetGrowth = data.growthContext?.epsGrowth ?? null;
  const targetRatiosWithGrowth = useMemo(
    () => ({ ...targetRatios, growth: targetGrowth }),
    [targetRatios, targetGrowth]
  );

  const handleSort = (key: MetricKey | 'ticker') => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  if (!sectorContext || sectorContext.peers.length === 0) {
    return (
      <SectionCard title="Peer Comparison">
        <p className="text-sm text-muted-foreground">
          Peer comparison data not available for this stock.
        </p>
      </SectionCard>
    );
  }

  const { peers, medians, insight } = sectorContext;
  const metricButtons: MetricKey[] = ['evToEbitda', 'pe', 'ps', 'peg'];

  return (
    <SectionCard title="Peer Comparison">
      <div className="space-y-6">
        {/* Insight text */}
        {insight && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-sm">{insight}</p>
          </div>
        )}

        {/* Metric selector for bar chart */}
        <div className="flex flex-wrap gap-2">
          {metricButtons.map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                selectedMetric === metric
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {METRIC_CONFIG[metric].label}
            </button>
          ))}
        </div>

        {/* Horizontal bar chart */}
        <HorizontalBarChart
          data={peers}
          targetTicker={data.ticker}
          targetValue={targetRatiosWithGrowth[selectedMetric]}
          metric={selectedMetric}
          medianValue={medians?.[selectedMetric] ?? null}
        />

        {/* Comparison table */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Full Comparison ({peers.length} peers)
          </h4>
          <ComparisonTable
            data={peers}
            targetTicker={data.ticker}
            targetName={data.companyName}
            targetRatios={targetRatiosWithGrowth}
            medians={medians}
            sort={sort}
            onSort={handleSort}
          />
        </div>
      </div>
    </SectionCard>
  );
}

export const PeerComparisonSection = memo(PeerComparisonSectionComponent);
