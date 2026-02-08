'use client';

import { memo } from 'react';
import { SectionCard } from '@/components/dashboard/sections/section-card';
import { cn } from '@/lib/utils';
import type { ValuationDeepDive } from '@recon/shared';

interface HistoricalSectionProps {
  data: ValuationDeepDive;
}

function HistoricalSectionComponent({ data }: HistoricalSectionProps) {
  const { historicalContext } = data;

  if (!historicalContext) {
    return (
      <SectionCard title="Historical P/E Analysis">
        <p className="text-sm text-muted-foreground">
          Historical P/E data not available for this stock.
        </p>
      </SectionCard>
    );
  }

  const { currentPE, minPE5Y, maxPE5Y, percentile, history } = historicalContext;
  const rangePosition = ((currentPE - minPE5Y) / (maxPE5Y - minPE5Y)) * 100;

  return (
    <SectionCard title="Historical P/E Analysis">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              5Y Min
            </div>
            <div className="text-lg font-bold font-mono text-success">
              {minPE5Y.toFixed(1)}x
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Current
            </div>
            <div className="text-lg font-bold font-mono">
              {currentPE.toFixed(1)}x
            </div>
            <div className="text-xs text-muted-foreground">
              {percentile.toFixed(0)}th percentile
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              5Y Max
            </div>
            <div className="text-lg font-bold font-mono text-destructive">
              {maxPE5Y.toFixed(1)}x
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Cheaper</span>
            <span>More Expensive</span>
          </div>
          <div className="relative h-3 rounded-full bg-gradient-to-r from-success via-warning to-destructive">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background shadow-lg"
              style={{ left: `calc(${Math.min(100, Math.max(0, rangePosition))}% - 8px)` }}
            />
          </div>
        </div>

        {history.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">P/E History (Last {history.length} Quarters)</h4>
            <div className="flex gap-1 h-16 items-end">
              {history.slice().reverse().map((point, index) => {
                const height = ((point.pe - minPE5Y) / (maxPE5Y - minPE5Y)) * 100;
                const isCurrent = index === history.length - 1;
                return (
                  <div
                    key={point.date}
                    className={cn(
                      'flex-1 rounded-t transition-colors',
                      isCurrent ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                    style={{ height: `${Math.max(10, Math.min(100, height))}%` }}
                    title={`${point.date}: ${point.pe.toFixed(1)}x`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export const HistoricalSection = memo(HistoricalSectionComponent);
