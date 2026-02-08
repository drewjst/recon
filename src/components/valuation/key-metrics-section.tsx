'use client';

import { memo } from 'react';
import { SectionCard } from '@/components/dashboard/sections/section-card';
import { cn } from '@/lib/utils';
import { formatMultiple } from '@/lib/formatters';
import type { ValuationDeepDive, ValuationMetricRow } from '@recon/shared';

interface KeyMetricsSectionProps {
  data: ValuationDeepDive;
}

interface DotMeterProps {
  percentile: number | null | undefined;
  lowerIsBetter: boolean;
}

function DotMeter({ percentile, lowerIsBetter }: DotMeterProps) {
  if (percentile === null || percentile === undefined) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  // Convert percentile to filled dots (0-10 scale)
  const filledDots = Math.round(percentile / 10);

  // Determine color based on percentile
  // For valuation metrics (lowerIsBetter=true): low percentile = green (cheap), high = red (expensive)
  const getColorClass = (dotIndex: number, filled: number): string => {
    if (dotIndex >= filled) return 'bg-muted';

    // Color based on the percentile value, not just the dot position
    if (percentile <= 30) {
      return 'bg-success'; // Cheap
    } else if (percentile >= 70) {
      return 'bg-destructive'; // Expensive
    } else {
      return 'bg-warning'; // Fair (yellow/amber)
    }
  };

  return (
    <div className="flex gap-0.5" title={`${percentile.toFixed(0)}th percentile`}>
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-3 rounded-sm transition-colors',
            getColorClass(i, filledDots)
          )}
        />
      ))}
    </div>
  );
}

interface MetricTableRowProps {
  metric: ValuationMetricRow;
}

function MetricTableRow({ metric }: MetricTableRowProps) {
  const { label, current, fiveYearAvg, sectorMedian, spAvg, percentile, lowerIsBetter } = metric;

  // Determine if current is above/below each comparison
  const getComparisonClass = (comparison: number | null | undefined) => {
    if (current === null || current === undefined || comparison === null || comparison === undefined) {
      return 'text-muted-foreground';
    }
    const isAbove = current > comparison;
    // For metrics where lower is better, being above is bad (red)
    if (lowerIsBetter) {
      return isAbove ? 'text-destructive' : 'text-success';
    }
    return isAbove ? 'text-success' : 'text-destructive';
  };

  return (
    <tr className="border-b border-border/30 hover:bg-muted/30 transition-colors">
      {/* Metric Name */}
      <td className="py-3 px-3 text-sm font-medium">{label}</td>

      {/* Current Value */}
      <td className="py-3 px-3 text-right">
        <span className="text-sm font-mono font-semibold">
          {formatMultiple(current)}
        </span>
      </td>

      {/* 5Y Average */}
      <td className="py-3 px-3 text-right hidden md:table-cell">
        <span className={cn('text-sm font-mono', getComparisonClass(fiveYearAvg))}>
          {formatMultiple(fiveYearAvg)}
        </span>
      </td>

      {/* Sector Median */}
      <td className="py-3 px-3 text-right hidden md:table-cell">
        <span className={cn('text-sm font-mono', getComparisonClass(sectorMedian))}>
          {formatMultiple(sectorMedian)}
        </span>
      </td>

      {/* S&P 500 Average */}
      <td className="py-3 px-3 text-right hidden lg:table-cell">
        <span className={cn('text-sm font-mono', getComparisonClass(spAvg))}>
          {formatMultiple(spAvg)}
        </span>
      </td>

      {/* Percentile Dots */}
      <td className="py-3 px-3 text-right">
        <DotMeter percentile={percentile} lowerIsBetter={lowerIsBetter} />
      </td>
    </tr>
  );
}

function KeyMetricsSectionComponent({ data }: KeyMetricsSectionProps) {
  const { keyMetrics, ticker } = data;

  if (!keyMetrics || keyMetrics.length === 0) {
    return (
      <SectionCard title="Key Valuation Metrics">
        <p className="text-sm text-muted-foreground">
          Valuation metrics not available for this stock.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Key Valuation Metrics">
      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Metric
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  5Y Avg
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Sector
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  S&P 500
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rank
                </th>
              </tr>
            </thead>
            <tbody>
              {keyMetrics.map((metric) => (
                <MetricTableRow key={metric.key} metric={metric} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Vertical Legend on Right */}
        <div className="hidden sm:flex flex-col justify-center gap-3 pl-4 border-l border-border/30">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-3 rounded-sm bg-success" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Cheap</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-3 rounded-sm bg-warning" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-3 rounded-sm bg-destructive" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Expensive</span>
          </div>
        </div>
      </div>

      {/* Mobile Legend (horizontal, below table) */}
      <div className="flex sm:hidden flex-wrap items-center gap-4 pt-3 mt-3 border-t border-border/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-success" />
          <span>Cheap</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-warning" />
          <span>Fair</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-destructive" />
          <span>Expensive</span>
        </div>
      </div>
    </SectionCard>
  );
}

export const KeyMetricsSection = memo(KeyMetricsSectionComponent);
