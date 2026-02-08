'use client';

import { memo } from 'react';
import { Info, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SectorMetric } from '@recon/shared';

type Assessment = 'Excellent' | 'Good' | 'Average' | 'Below Avg' | 'Caution';
type AssessmentType = 'positive' | 'neutral' | 'negative';

export interface SectorMetricConfig {
  label: string;
  metric: SectorMetric | null | undefined;
  formatValue: (value: number) => string;
  /** If true, lower values are better (e.g., Debt/Equity) */
  invertedScale?: boolean;
  /** Optional description shown in an info tooltip */
  info?: string;
  /** Optional URL for "Learn more" link in tooltip */
  learnMoreUrl?: string;
}

function getAssessment(percentile: number): { text: Assessment; type: AssessmentType } {
  if (percentile >= 75) return { text: 'Excellent', type: 'positive' };
  if (percentile >= 50) return { text: 'Good', type: 'positive' };
  if (percentile >= 25) return { text: 'Average', type: 'neutral' };
  if (percentile >= 10) return { text: 'Below Avg', type: 'negative' };
  return { text: 'Caution', type: 'negative' };
}

function AssessmentBadge({ assessment }: { assessment: { text: Assessment; type: AssessmentType } }) {
  const colors = {
    positive: 'bg-success/10 text-success',
    neutral: 'bg-muted text-muted-foreground',
    negative: 'bg-destructive/10 text-destructive',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[assessment.type]}`}>
      {assessment.text}
    </span>
  );
}

function formatRangeValue(metric: SectorMetric, value: number): string {
  // For percentages (values typically > 10)
  if (Math.abs(metric.sectorMax) > 10 || Math.abs(metric.sectorMin) > 10) {
    return `${value.toFixed(0)}%`;
  }
  // For ratios (smaller values)
  return value.toFixed(1);
}

function PositionBar({ metric }: { metric: SectorMetric }) {
  const { percentile, sectorMin, sectorMedian, sectorMax } = metric;

  // Determine dot color based on percentile
  const getDotColor = () => {
    if (percentile >= 75) return 'bg-success';
    if (percentile >= 25) return 'bg-warning';
    return 'bg-destructive';
  };

  // Calculate median position on the bar (as percentage of the range)
  const range = sectorMax - sectorMin;
  const medianPosition = range > 0 ? ((sectorMedian - sectorMin) / range) * 100 : 50;

  return (
    <div className="mt-2">
      {/* Position bar */}
      <div className="relative h-2 bg-muted rounded-full">
        {/* Median marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-border"
          style={{ left: `${medianPosition}%` }}
        />

        {/* Stock position dot */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${getDotColor()} border-2 border-background shadow-sm transition-all duration-300`}
          style={{ left: `calc(${Math.max(0, Math.min(100, percentile))}% - 6px)` }}
        />
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span className="font-mono">{formatRangeValue(metric, sectorMin)}</span>
        <span>Median</span>
        <span className="font-mono">{formatRangeValue(metric, sectorMax)}</span>
      </div>
    </div>
  );
}

export const SectorMetricRow = memo(function SectorMetricRow({
  label,
  metric,
  formatValue,
  info,
  learnMoreUrl,
}: SectorMetricConfig) {
  if (!metric) return null;

  const assessment = getAssessment(metric.percentile);

  return (
    <div className="py-4 border-b border-border/50 last:border-0">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm">{label}</span>
          {info && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full p-1 hover:bg-muted/50 active:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-manipulation"
                  aria-label={`Info about ${label}`}
                >
                  <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="center" className="w-64 p-3">
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
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm">{formatValue(metric.value)}</span>
          <AssessmentBadge assessment={assessment} />
        </div>
      </div>

      <PositionBar metric={metric} />
    </div>
  );
});
