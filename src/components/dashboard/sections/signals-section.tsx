'use client';

import { memo, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, TrendingDown, Target } from 'lucide-react';
import { SectionCard } from './section-card';
import { Badge } from '@/components/ui/badge';
import type { StockDetailResponse } from '@recon/shared';

interface SignalsSectionProps {
  data: StockDetailResponse;
}

type SignalStatus = 'bullish' | 'bearish' | 'neutral' | 'warning';

interface TechnicalIndicator {
  name: string;
  value: string;
  signal: SignalStatus;
}

function calculateMomentum(performance: StockDetailResponse['performance']): TechnicalIndicator {
  const weeklyAvgFromMonth = performance.month1Change / 4;
  const momentumDiff = performance.week1Change - weeklyAvgFromMonth;

  let signal: SignalStatus;
  if (momentumDiff > 2) signal = 'bullish';
  else if (momentumDiff < -2) signal = 'bearish';
  else signal = 'neutral';

  const momentumScore = Math.max(-100, Math.min(100, momentumDiff * 10));
  return {
    name: 'Momentum',
    value: momentumScore > 0 ? `+${momentumScore.toFixed(0)}` : momentumScore.toFixed(0),
    signal,
  };
}

function calculateTrendPosition(quote: StockDetailResponse['quote']): TechnicalIndicator {
  const range = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
  const position = range > 0 ? ((quote.price - quote.fiftyTwoWeekLow) / range) * 100 : 50;

  let signal: SignalStatus;
  if (position >= 80) signal = 'bullish';
  else if (position <= 20) signal = 'bearish';
  else signal = 'neutral';

  return {
    name: '52W Range',
    value: `${position.toFixed(0)}%`,
    signal,
  };
}

function calculateVolatility(quote: StockDetailResponse['quote']): TechnicalIndicator {
  const range = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
  const volatility = quote.price > 0 ? (range / quote.price) * 100 : 0;

  let signal: SignalStatus;
  if (volatility < 25) signal = 'bullish';
  else if (volatility > 60) signal = 'warning';
  else signal = 'neutral';

  return {
    name: 'Volatility',
    value: `${volatility.toFixed(0)}%`,
    signal,
  };
}

function calculateRelativeStrength(performance: StockDetailResponse['performance']): TechnicalIndicator {
  const ytd = performance.ytdChange;

  let signal: SignalStatus;
  if (ytd > 10) signal = 'bullish';
  else if (ytd < -10) signal = 'bearish';
  else signal = 'neutral';

  return {
    name: 'YTD',
    value: ytd >= 0 ? `+${ytd.toFixed(1)}%` : `${ytd.toFixed(1)}%`,
    signal,
  };
}

function CompactIndicator({ indicator }: { indicator: TechnicalIndicator }) {
  const colors = {
    bullish: 'text-success',
    bearish: 'text-destructive',
    warning: 'text-warning',
    neutral: 'text-muted-foreground',
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{indicator.name}</span>
      <span className={`text-sm font-semibold font-mono ${colors[indicator.signal]}`}>
        {indicator.value}
      </span>
    </div>
  );
}

const getSignalIcon = (type: string) => {
  switch (type) {
    case 'bullish':
      return <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />;
    case 'warning':
      return <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" />;
    case 'bearish':
      return <TrendingDown className="h-3.5 w-3.5 text-destructive flex-shrink-0" />;
    default:
      return null;
  }
};

function SignalsSectionComponent({ data }: SignalsSectionProps) {
  const { signals: rawSignals, performance, quote, analystEstimates } = data;

  const indicators = useMemo(() => ({
    momentum: calculateMomentum(performance),
    trend: calculateTrendPosition(quote),
    volatility: calculateVolatility(quote),
    strength: calculateRelativeStrength(performance),
  }), [performance, quote]);

  const { signalsByType, totalBullish, totalBearish, totalWarning, topSignals } = useMemo(() => {
    const signals = rawSignals ?? [];

    const byType = signals.reduce(
      (acc, s) => {
        acc[s.type].push(s);
        return acc;
      },
      { bullish: [], warning: [], bearish: [] } as Record<string, typeof signals>
    );

    const technicalIndicators = [indicators.momentum, indicators.trend, indicators.strength];
    const techBullish = technicalIndicators.filter((i) => i.signal === 'bullish').length;
    const techBearish = technicalIndicators.filter((i) => i.signal === 'bearish').length;
    const volWarning = indicators.volatility.signal === 'warning' ? 1 : 0;

    return {
      signalsByType: byType,
      totalBullish: byType.bullish.length + techBullish,
      totalBearish: byType.bearish.length + techBearish,
      totalWarning: byType.warning.length + volWarning,
      topSignals: [
        ...byType.bullish,
        ...byType.warning,
        ...byType.bearish,
      ].slice(0, 3),
    };
  }, [rawSignals, indicators]);

  const priceTargetUpside = useMemo(() => {
    if (!analystEstimates || quote.price <= 0) return null;
    return ((analystEstimates.priceTargetAverage - quote.price) / quote.price) * 100;
  }, [analystEstimates, quote.price]);

  return (
    <SectionCard title="Key Signals">
      {/* Technical Indicators - compact inline row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-3 border-b border-border/30">
        <CompactIndicator indicator={indicators.momentum} />
        <CompactIndicator indicator={indicators.trend} />
        <CompactIndicator indicator={indicators.volatility} />
        <CompactIndicator indicator={indicators.strength} />
        {priceTargetUpside !== null && (
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Target</span>
            <span className={`text-sm font-semibold font-mono ${priceTargetUpside >= 0 ? 'text-success' : 'text-destructive'}`}>
              {priceTargetUpside >= 0 ? '+' : ''}{priceTargetUpside.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Signal Summary Row */}
      <div className="flex items-center gap-3 py-3 border-b border-border/30">
        <Badge variant="outline" className="text-success border-success/30 bg-success/5 text-xs px-2 py-0.5">
          {totalBullish} Bullish
        </Badge>
        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 text-xs px-2 py-0.5">
          {totalBearish} Bearish
        </Badge>
        {totalWarning > 0 && (
          <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5 text-xs px-2 py-0.5">
            {totalWarning} Warning
          </Badge>
        )}
      </div>

      {/* Fundamental Signals - compact list */}
      <div className="pt-3 space-y-2">
        {topSignals.length === 0 ? (
          <p className="text-xs text-muted-foreground">No significant signals detected.</p>
        ) : (
          topSignals.map((signal) => (
            <div
              key={`${signal.type}-${signal.category}-${signal.message.slice(0, 30)}`}
              className="flex items-start gap-2"
            >
              <div className="mt-0.5">{getSignalIcon(signal.type)}</div>
              <p className="text-xs leading-relaxed text-foreground/90">{signal.message}</p>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

export const SignalsSection = memo(SignalsSectionComponent);
