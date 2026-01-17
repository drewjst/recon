'use client';

import { Info, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PercentileBar } from './percentile-bar';

export type MetricFormat = 'percent' | 'ratio' | 'currency' | 'multiple' | 'number';

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
}

/**
 * Format a value based on the metric type
 */
function formatValue(value: number | null | undefined, format: MetricFormat): string {
  if (value === null || value === undefined) {
    return '--';
  }

  switch (format) {
    case 'percent':
      // Values might come as decimals (0.25) or already as percentages (25)
      const pctValue = Math.abs(value) < 1 && Math.abs(value) > 0 ? value * 100 : value;
      const sign = value > 0 && Math.abs(value) > 0.001 ? '+' : '';
      return `${sign}${pctValue.toFixed(2)}%`;
    case 'ratio':
      return value.toFixed(2);
    case 'currency':
      if (Math.abs(value) >= 1e12) {
        return `$${(value / 1e12).toFixed(2)}T`;
      }
      if (Math.abs(value) >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
      }
      if (Math.abs(value) >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
      }
      if (Math.abs(value) >= 1e3) {
        return `$${(value / 1e3).toFixed(0)}K`;
      }
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    case 'multiple':
      return `${value.toFixed(2)}x`;
    case 'number':
    default:
      if (Math.abs(value) >= 1e9) {
        return `${(value / 1e9).toFixed(2)}B`;
      }
      if (Math.abs(value) >= 1e6) {
        return `${(value / 1e6).toFixed(2)}M`;
      }
      return value.toFixed(2);
  }
}

/**
 * A single metric row in the Fidelity-style table format.
 * Shows: Label | Stock Value | Industry Average | Percentile Bar
 */
export function MetricRow({
  label,
  value,
  industryAverage,
  percentile,
  format,
  higherIsBetter = true,
  info,
  learnMoreUrl,
}: MetricRowProps) {
  return (
    <tr className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
      {/* Label column */}
      <td className="py-3 pr-4">
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
      <td className="py-3 px-4 text-right">
        <span className="font-mono text-sm text-foreground">
          {formatValue(value, format)}
        </span>
      </td>

      {/* Industry average column */}
      <td className="py-3 px-4 text-right hidden sm:table-cell">
        <span className="font-mono text-sm text-muted-foreground">
          {formatValue(industryAverage, format)}
        </span>
      </td>

      {/* Percentile column */}
      <td className="py-3 pl-4">
        <PercentileBar
          percentile={percentile}
          higherIsBetter={higherIsBetter}
          showLabel={true}
        />
      </td>
    </tr>
  );
}
