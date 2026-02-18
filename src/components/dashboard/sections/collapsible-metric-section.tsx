'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MetricRow, type Metric } from './metric-row';
import { cn } from '@/lib/utils';

export type { Metric };

interface CollapsibleMetricSectionProps {
  title: string;
  ticker: string;
  metrics: Metric[];
  deepDiveUrl?: string;
  defaultOpen?: boolean;
}

/**
 * A compact collapsible section for metric tables.
 * Collapsed by default, shows "{N} metrics" count.
 * Expands to show full table.
 */
export const CollapsibleMetricSection = memo(function CollapsibleMetricSection({
  title,
  ticker,
  metrics,
  deepDiveUrl,
  defaultOpen = false,
}: CollapsibleMetricSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const validMetrics = metrics.filter((m) => m.value !== null);

  if (validMetrics.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm">
      <CardHeader className="p-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                'group-hover:text-foreground',
                !isOpen && '-rotate-90'
              )}
            />
            <span className="text-xs uppercase text-primary font-semibold tracking-widest">
              {title}
            </span>
            {!isOpen && (
              <span className="text-xs text-muted-foreground">
                ({validMetrics.length} metrics)
              </span>
            )}
          </div>
          {deepDiveUrl && (
            <Link
              href={deepDiveUrl}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Deep Dive
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0 px-3 pb-3">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="py-1.5 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="py-1.5 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Value
                  </th>
                  <th className="py-1.5 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    Industry
                  </th>
                  <th className="py-1.5 pl-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    vs Sector
                  </th>
                </tr>
              </thead>
              <tbody>
                {validMetrics.map((metric) => (
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
                    compact
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
});
