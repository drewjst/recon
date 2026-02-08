'use client';

import { memo } from 'react';
import { TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/sections/section-card';
import { cn } from '@/lib/utils';
import type { ValuationDeepDive } from '@recon/shared';

interface ValuationSignalsSectionProps {
  data: ValuationDeepDive;
}

function ValuationSignalsSectionComponent({ data }: ValuationSignalsSectionProps) {
  const { signals } = data;

  if (!signals || signals.length === 0) {
    return (
      <SectionCard title="Valuation Signals">
        <p className="text-sm text-muted-foreground">
          No valuation signals available for this stock.
        </p>
      </SectionCard>
    );
  }

  const bullishSignals = signals.filter(s => s.sentiment === 'bullish');
  const bearishSignals = signals.filter(s => s.sentiment === 'bearish');
  const neutralSignals = signals.filter(s => s.sentiment === 'neutral');

  const sentimentConfig = {
    bullish: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      bg: 'bg-success/10',
      border: 'border-success/30',
      text: 'text-success',
    },
    bearish: {
      icon: <XCircle className="h-4 w-4" />,
      bg: 'bg-destructive/10',
      border: 'border-destructive/30',
      text: 'text-destructive',
    },
    neutral: {
      icon: <MinusCircle className="h-4 w-4" />,
      bg: 'bg-muted/30',
      border: 'border-border/30',
      text: 'text-muted-foreground',
    },
  };

  // Overall sentiment summary
  const netSignal = bullishSignals.length - bearishSignals.length;
  let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let overallText = 'Mixed valuation signals';
  let overallIcon = <Minus className="h-5 w-5" />;

  if (netSignal >= 2) {
    overallSentiment = 'bullish';
    overallText = 'Predominantly bullish valuation signals';
    overallIcon = <TrendingDown className="h-5 w-5" />;
  } else if (netSignal <= -2) {
    overallSentiment = 'bearish';
    overallText = 'Predominantly bearish valuation signals';
    overallIcon = <TrendingUp className="h-5 w-5" />;
  }

  const overallConfig = sentimentConfig[overallSentiment];

  return (
    <SectionCard title="Valuation Signals Summary">
      <div className="space-y-6">
        {/* Overall Summary */}
        <div className={cn('p-4 rounded-lg border-2', overallConfig.bg, overallConfig.border)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={overallConfig.text}>{overallIcon}</div>
              <div>
                <div className={cn('font-semibold', overallConfig.text)}>
                  {overallText}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {bullishSignals.length} bullish, {bearishSignals.length} bearish, {neutralSignals.length} neutral
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-success">
                <TrendingDown className="h-4 w-4" />
                <span className="font-bold">{bullishSignals.length}</span>
              </div>
              <div className="flex items-center gap-1 text-destructive">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold">{bearishSignals.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Signal List */}
        <div className="space-y-3">
          {signals.map((signal, index) => {
            const config = sentimentConfig[signal.sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;
            return (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  config.bg,
                  config.border
                )}
              >
                <div className={cn('mt-0.5', config.text)}>{config.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className={cn('font-medium text-sm', config.text)}>
                    {signal.name}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {signal.description}
                  </p>
                </div>
                <div className={cn(
                  'text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded',
                  config.bg,
                  config.text
                )}>
                  {signal.sentiment}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
          <p className="text-xs text-muted-foreground">
            Signals are derived from multiple valuation metrics including historical P/E, peer comparison, PEG ratio, and DCF analysis.
            Use these signals as part of a comprehensive investment analysis.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

export const ValuationSignalsSection = memo(ValuationSignalsSectionComponent);
