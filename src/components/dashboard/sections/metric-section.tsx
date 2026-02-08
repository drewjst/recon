'use client';

import { memo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SectionCard } from './section-card';
import { MetricRow, type MetricFormat } from './metric-row';

export interface Metric {
  /** Unique key for React */
  key: string;
  /** Display label */
  label: string;
  /** Stock's value */
  value: number | null;
  /** Industry average */
  industryAverage: number | null;
  /** Percentile (0-100) */
  percentile: number | null;
  /** Value format type */
  format: MetricFormat;
  /** Whether higher values are better */
  higherIsBetter: boolean;
  /** Optional tooltip info */
  info?: string;
  /** Optional learn more URL */
  learnMoreUrl?: string;
}

interface MetricSectionProps {
  /** Section title */
  title: string;
  /** Ticker symbol for share feature */
  ticker: string;
  /** All metrics in this section */
  metrics: Metric[];
  /** Start expanded? Default false */
  defaultExpanded?: boolean;
  /** Number of metrics to show when collapsed. Default 5 */
  topN?: number;
  /** Custom share text */
  shareText?: string;
}

/**
 * A collapsible section displaying metrics in Fidelity-style format.
 * Shows topN metrics when collapsed, with "Show all" button to expand.
 */
export const MetricSection = memo(function MetricSection({
  title,
  ticker,
  metrics,
  defaultExpanded = false,
  topN = 5,
  shareText,
}: MetricSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Filter out metrics with null values for display
  const validMetrics = metrics.filter((m) => m.value !== null);

  if (validMetrics.length === 0) {
    return null;
  }

  const displayMetrics = isExpanded ? validMetrics : validMetrics.slice(0, topN);
  const hasMore = validMetrics.length > topN;
  const hiddenCount = validMetrics.length - topN;

  // Generate share text if not provided
  const defaultShareText = `${ticker} ${title.toLowerCase()} metrics on Crux`;

  return (
    <SectionCard title={title} shareTicker={ticker} shareText={shareText || defaultShareText}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Metric
              </th>
              <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {ticker}
              </th>
              <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                Industry Avg
              </th>
              <th className="py-2 pl-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Percentile
              </th>
            </tr>
          </thead>
          <tbody>
            {displayMetrics.map((metric) => (
              <MetricRow
                key={metric.key}
                label={metric.label}
                value={metric.value}
                industryAverage={metric.industryAverage}
                percentile={metric.percentile}
                format={metric.format}
                higherIsBetter={metric.higherIsBetter}
                info={metric.info}
                learnMoreUrl={metric.learnMoreUrl}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Show all / Show less button */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show all {validMetrics.length} metrics
            </>
          )}
        </button>
      )}
    </SectionCard>
  );
});
