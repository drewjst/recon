'use client';

import { memo } from 'react';
import { SectionCard } from '@/components/dashboard/sections/section-card';
import { cn } from '@/lib/utils';
import type { ValuationDeepDive } from '@recon/shared';

interface GrowthJustificationSectionProps {
  data: ValuationDeepDive;
}

function getPEGInterpretation(peg: number): { label: string; color: string; description: string } {
  if (peg < 0.5) {
    return {
      label: 'Extremely Undervalued',
      color: 'text-success',
      description: 'Growth rate significantly exceeds valuation premium. Strong buy signal for growth investors.',
    };
  }
  if (peg < 1.0) {
    return {
      label: 'Undervalued',
      color: 'text-success',
      description: 'Growth rate exceeds valuation premium. Favorable risk/reward for growth-oriented portfolios.',
    };
  }
  if (peg < 1.5) {
    return {
      label: 'Fairly Valued',
      color: 'text-warning',
      description: 'Valuation is reasonably aligned with growth expectations. Neither cheap nor expensive.',
    };
  }
  if (peg < 2.0) {
    return {
      label: 'Stretched',
      color: 'text-orange-500',
      description: 'Valuation premium exceeds growth rate. Requires strong execution to justify current price.',
    };
  }
  return {
    label: 'Overvalued',
    color: 'text-destructive',
    description: 'Significant premium relative to growth. High expectations baked in; vulnerable to disappointment.',
  };
}

function GrowthJustificationSectionComponent({ data }: GrowthJustificationSectionProps) {
  const { growthContext, historicalContext } = data;

  if (!growthContext) {
    return (
      <SectionCard title="Growth Justification">
        <p className="text-sm text-muted-foreground">
          PEG ratio data not available for this stock.
        </p>
      </SectionCard>
    );
  }

  const { peg, forwardPE, epsGrowth } = growthContext;
  const interpretation = getPEGInterpretation(peg);
  const currentPE = historicalContext?.currentPE;

  return (
    <SectionCard title="Growth Justification">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Trailing P/E
            </div>
            <div className="text-lg font-bold font-mono">
              {currentPE ? `${currentPE.toFixed(1)}x` : 'N/A'}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Forward P/E
            </div>
            <div className="text-lg font-bold font-mono">
              {forwardPE ? `${forwardPE.toFixed(1)}x` : 'N/A'}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              EPS Growth
            </div>
            <div className={cn(
              'text-lg font-bold font-mono',
              epsGrowth > 0 ? 'text-success' : 'text-destructive'
            )}>
              {epsGrowth > 0 ? '+' : ''}{epsGrowth.toFixed(1)}%
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              PEG Ratio
            </div>
            <div className={cn('text-lg font-bold font-mono', interpretation.color)}>
              {peg.toFixed(2)}
            </div>
          </div>
        </div>

        <div className={cn(
          'p-4 rounded-lg border-2',
          peg < 1.0 && 'border-success/30 bg-success/5',
          peg >= 1.0 && peg < 1.5 && 'border-warning/30 bg-warning/5',
          peg >= 1.5 && 'border-destructive/30 bg-destructive/5'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('text-sm font-semibold uppercase tracking-wider', interpretation.color)}>
              {interpretation.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {interpretation.description}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">PEG Ratio Scale</h4>
          <div className="relative h-3 rounded-full bg-gradient-to-r from-success via-warning to-destructive">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background shadow-lg"
              style={{ left: `calc(${Math.min(100, Math.max(0, (peg / 2.5) * 100))}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 (Undervalued)</span>
            <span>1.0 (Fair)</span>
            <span>2.5+ (Overvalued)</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">What is PEG?</h4>
          <p className="text-sm text-muted-foreground">
            The Price/Earnings to Growth (PEG) ratio divides the P/E ratio by the expected EPS growth rate.
            A PEG below 1.0 suggests the stock may be undervalued relative to its growth prospects,
            while a PEG above 2.0 suggests the market may be overpricing future growth.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

export const GrowthJustificationSection = memo(GrowthJustificationSectionComponent);
