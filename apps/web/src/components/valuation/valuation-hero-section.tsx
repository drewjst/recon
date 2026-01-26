'use client';

import { memo } from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ValuationDeepDive } from '@recon/shared';

interface ValuationHeroSectionProps {
  data: ValuationDeepDive;
}

interface DotMeterProps {
  label: string;
  contextLabel: string;
  score: number | null;
  tooltip: string;
  invertColors?: boolean;
}

function getDotColor(index: number, score: number, inverted: boolean): string {
  const filled = index < score;
  if (!filled) return 'bg-muted';

  const effectiveScore = inverted ? 11 - score : score;

  if (effectiveScore <= 3) return 'bg-success';
  if (effectiveScore <= 6) return 'bg-warning';
  return 'bg-destructive';
}

function getScoreLabel(score: number, inverted: boolean): string {
  const effectiveScore = inverted ? 11 - score : score;
  if (effectiveScore <= 3) return inverted ? 'Overvalued' : 'Cheap';
  if (effectiveScore <= 6) return 'Fair';
  return inverted ? 'Justified' : 'Expensive';
}

const DotMeter = memo(function DotMeter({
  label,
  contextLabel,
  score,
  tooltip,
  invertColors = false,
}: DotMeterProps) {
  if (score === null) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted/30 border border-border/30">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            {label}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">No data available</div>
      </div>
    );
  }

  const scoreLabel = getScoreLabel(score, invertColors);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/30 border border-border/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            {label}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="p-0.5 hover:bg-muted/50 rounded-full">
                <Info className="h-3 w-3 text-muted-foreground/60" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 p-3">
              <p className="text-xs text-muted-foreground">{tooltip}</p>
            </PopoverContent>
          </Popover>
        </div>
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            score <= 3 && !invertColors && 'text-success',
            score <= 3 && invertColors && 'text-destructive',
            score > 3 && score <= 6 && 'text-warning',
            score > 6 && !invertColors && 'text-destructive',
            score > 6 && invertColors && 'text-success'
          )}
        >
          {scoreLabel}
        </span>
      </div>

      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 h-2 rounded-full transition-colors',
              getDotColor(i, score, invertColors)
            )}
          />
        ))}
      </div>

      <div className="text-xs text-muted-foreground">{contextLabel}</div>
    </div>
  );
});

function ValuationHeroSectionComponent({ data }: ValuationHeroSectionProps) {
  const historicalContext = data.historicalContext
    ? `${data.historicalContext.percentile.toFixed(0)}th percentile of 5Y range`
    : '';

  const sectorContext = data.sectorContext
    ? `${data.sectorContext.percentile.toFixed(0)}th percentile vs ${data.sectorContext.peers.length} peers`
    : '';

  const growthContext = data.growthContext
    ? `PEG: ${data.growthContext.peg.toFixed(2)}`
    : '';

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h2 className="text-lg font-semibold uppercase tracking-wider text-muted-foreground">
          Valuation Metrics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DotMeter
            label="P/E vs History"
            contextLabel={historicalContext}
            score={data.historicalScore}
            tooltip="Where current P/E sits within its 5-year historical range. Lower = cheaper than historical average."
          />
          <DotMeter
            label="P/E vs Sector"
            contextLabel={sectorContext}
            score={data.sectorScore}
            tooltip="Where current P/E sits compared to sector peers. Lower = cheaper than peers."
          />
          <DotMeter
            label="PEG Ratio"
            contextLabel={growthContext}
            score={data.growthScore}
            tooltip="Price/Earnings to Growth ratio. Lower = valuation more justified by expected earnings growth."
            invertColors
          />
        </div>
      </CardContent>
    </Card>
  );
}

export const ValuationHeroSection = memo(ValuationHeroSectionComponent);
