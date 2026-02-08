'use client';

import { memo } from 'react';
import { Info, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PercentileBar } from './percentile-bar';
import { formatMetricValue, type MetricFormat } from '@/lib/formatters';

export type { MetricFormat };

export interface MetricRowProps {
  /** Metric display label */
  label: string;
  /** The stock's value for this metric */
  value: number | null;
  /** Industry average value */
  industryAverage: number | null;
  /** Percentile rank (0-100) */
  percentile: number | null;
  /** How to format the values */
  format: MetricFormat;
  /** If true, higher values are better. If false, lower is better (e.g., debt, P/E) */
  higherIsBetter?: boolean;
  /** Optional tooltip description */
  info?: string;
  /** Optional learn more URL */
  learnMoreUrl?: string;
  /** Compact mode with reduced padding */
  compact?: boolean;
}

/**
 * A single metric row in the Fidelity-style table format.
 * Shows: Label | Stock Value | Industry Average | Percentile Bar
 */
function MetricRowComponent({
  label,
  value,
  industryAverage,
  percentile,
  format,
  higherIsBetter = true,
  info,
  learnMoreUrl,
  compact = false,
}: MetricRowProps) {
  const cellPadding = compact ? 'py-2' : 'py-3';

  return (
    <tr className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
      {/* Label column */}
      <td className={`${cellPadding} pr-4`}>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-foreground">{label}</span>
          {info && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-muted/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={`Info about ${label}`}
                >
                  <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-64 p-3">
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{info}</p>
                {learnMoreUrl && (
                  <a
                    href={learnMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-medium"
                  >
                    Learn more
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </td>

      {/* Stock value column */}
      <td className={`${cellPadding} px-4 text-right`}>
        <span className="font-mono text-sm text-foreground">
          {formatMetricValue(value, format)}
        </span>
      </td>

      {/* Industry average column */}
      <td className={`${cellPadding} px-4 text-right hidden sm:table-cell`}>
        <span className="font-mono text-sm text-muted-foreground">
          {formatMetricValue(industryAverage, format)}
        </span>
      </td>

      {/* Percentile column */}
      <td className={`${cellPadding} pl-4`}>
        <PercentileBar
          percentile={percentile}
          higherIsBetter={higherIsBetter}
          showLabel={true}
        />
      </td>
    </tr>
  );
}

export const MetricRow = memo(MetricRowComponent);
