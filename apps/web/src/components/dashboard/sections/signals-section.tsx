'use client';

import { memo } from 'react';
import { CheckCircle2, AlertTriangle, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { SectionCard } from './section-card';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { StockDetailResponse } from '@recon/shared';

interface SignalsSectionProps {
  data: StockDetailResponse;
}

interface TechnicalIndicator {
  name: string;
  value: string;
  signal: 'bullish' | 'bearish' | 'neutral' | 'warning';
  description: string;
}

function calculateMomentum(performance: StockDetailResponse['performance']): TechnicalIndicator {
  // Momentum: Compare short-term (1W) vs medium-term (1M) performance
  // Positive momentum = 1W performance better than 1M average weekly
  const weeklyAvgFromMonth = performance.month1Change / 4;
  const momentumDiff = performance.week1Change - weeklyAvgFromMonth;

  let signal: 'bullish' | 'bearish' | 'neutral';
  let description: string;

  if (momentumDiff > 2) {
    signal = 'bullish';
    description = 'Accelerating upward';
  } else if (momentumDiff < -2) {
    signal = 'bearish';
    description = 'Losing momentum';
  } else {
    signal = 'neutral';
    description = 'Steady pace';
  }

  const momentumScore = Math.max(-100, Math.min(100, momentumDiff * 10));

  return {
    name: 'Momentum',
    value: momentumScore > 0 ? `+${momentumScore.toFixed(0)}` : momentumScore.toFixed(0),
    signal,
    description,
  };
}

function calculateTrendPosition(quote: StockDetailResponse['quote']): TechnicalIndicator {
  // Trend Position: Where price sits in 52-week range
  const range = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
  const position = range > 0 ? ((quote.price - quote.fiftyTwoWeekLow) / range) * 100 : 50;

  let signal: 'bullish' | 'bearish' | 'neutral';
  let description: string;

  if (position >= 80) {
    signal = 'bullish';
    description = 'Near 52W high';
  } else if (position <= 20) {
    signal = 'bearish';
    description = 'Near 52W low';
  } else if (position >= 50) {
    signal = 'neutral';
    description = 'Upper range';
  } else {
    signal = 'neutral';
    description = 'Lower range';
  }

  return {
    name: 'Trend',
    value: `${position.toFixed(0)}%`,
    signal,
    description,
  };
}

function calculateVolatility(quote: StockDetailResponse['quote']): TechnicalIndicator {
  // Volatility: 52-week range as % of current price (normalized)
  // High volatility is a warning, not bearish - it's a risk indicator
  const range = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
  const volatility = quote.price > 0 ? (range / quote.price) * 100 : 0;

  let signal: 'bullish' | 'warning' | 'neutral';
  let description: string;

  if (volatility < 25) {
    signal = 'bullish';
    description = 'Low volatility';
  } else if (volatility > 60) {
    signal = 'warning';
    description = 'High volatility';
  } else {
    signal = 'neutral';
    description = 'Normal range';
  }

  return {
    name: 'Volatility',
    value: `${volatility.toFixed(0)}%`,
    signal,
    description,
  };
}

function calculateRelativeStrength(performance: StockDetailResponse['performance']): TechnicalIndicator {
  // Relative Strength: Based on YTD performance
  const ytd = performance.ytdChange;

  let signal: 'bullish' | 'bearish' | 'neutral';
  let description: string;

  if (ytd > 20) {
    signal = 'bullish';
    description = 'Strong outperformer';
  } else if (ytd > 5) {
    signal = 'bullish';
    description = 'Outperforming';
  } else if (ytd < -20) {
    signal = 'bearish';
    description = 'Significant weakness';
  } else if (ytd < -5) {
    signal = 'bearish';
    description = 'Underperforming';
  } else {
    signal = 'neutral';
    description = 'Market pace';
  }

  return {
    name: 'Strength',
    value: ytd >= 0 ? `+${ytd.toFixed(1)}%` : `${ytd.toFixed(1)}%`,
    signal,
    description,
  };
}

function TechnicalIndicatorCard({ indicator }: { indicator: TechnicalIndicator }) {
  const colors = {
    bullish: 'border-success/30 bg-success/5',
    bearish: 'border-destructive/30 bg-destructive/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    neutral: 'border-border/50 bg-muted/30',
  };

  const iconColors = {
    bullish: 'text-success',
    bearish: 'text-destructive',
    warning: 'text-amber-500',
    neutral: 'text-muted-foreground',
  };

  const icons = {
    bullish: <TrendingUp className="h-3.5 w-3.5" />,
    bearish: <TrendingDown className="h-3.5 w-3.5" />,
    warning: <AlertTriangle className="h-3.5 w-3.5" />,
    neutral: <Activity className="h-3.5 w-3.5" />,
  };

  return (
    <Card className={`p-2.5 ${colors[indicator.signal]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={iconColors[indicator.signal]}>{icons[indicator.signal]}</span>
        <span className="text-xs font-medium text-foreground">{indicator.name}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold font-mono">{indicator.value}</span>
        <span className="text-[10px] text-muted-foreground truncate">{indicator.description}</span>
      </div>
    </Card>
  );
}

const getSignalIcon = (type: string) => {
  switch (type) {
    case 'bullish':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'bearish':
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
};

function SignalsSectionComponent({ data }: SignalsSectionProps) {
  const { signals, performance, quote } = data;

  // Calculate technical indicators
  const momentum = calculateMomentum(performance);
  const trend = calculateTrendPosition(quote);
  const volatility = calculateVolatility(quote);
  const strength = calculateRelativeStrength(performance);

  // Count fundamental signals from API
  const fundamentalBullish = signals.filter((s) => s.type === 'bullish').length;
  const fundamentalBearish = signals.filter((s) => s.type === 'bearish').length;
  const fundamentalWarning = signals.filter((s) => s.type === 'warning').length;

  // Count technical signals (volatility warning counts separately)
  const technicalIndicators = [momentum, trend, strength]; // Volatility excluded - it's warning only
  const technicalBullish = technicalIndicators.filter((i) => i.signal === 'bullish').length;
  const technicalBearish = technicalIndicators.filter((i) => i.signal === 'bearish').length;
  const volatilityWarning = volatility.signal === 'warning' ? 1 : 0;

  // Combined counts
  const totalBullish = fundamentalBullish + technicalBullish;
  const totalBearish = fundamentalBearish + technicalBearish;
  const totalWarning = fundamentalWarning + volatilityWarning;

  const topSignals = [...signals.filter((s) => s.type === 'bullish'), ...signals.filter((s) => s.type === 'warning'), ...signals.filter((s) => s.type === 'bearish')].slice(0, 4);

  return (
    <SectionCard title="Key Signals">
      {/* Technical Indicators - 4 on same line */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <TechnicalIndicatorCard indicator={momentum} />
        <TechnicalIndicatorCard indicator={trend} />
        <TechnicalIndicatorCard indicator={volatility} />
        <TechnicalIndicatorCard indicator={strength} />
      </div>

      {/* Signal Summary Badges */}
      <div className="flex gap-3 mb-4">
        <Badge variant="outline" className="text-success border-success/30 bg-success/5">
          Bullish ({totalBullish})
        </Badge>
        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">
          Bearish ({totalBearish})
        </Badge>
        <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/5">
          Warning ({totalWarning})
        </Badge>
      </div>

      {/* Fundamental Signals */}
      <div className="space-y-3">
        {topSignals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No significant signals detected.</p>
        ) : (
          topSignals.map((signal, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-all duration-200"
            >
              <div className="mt-0.5">{getSignalIcon(signal.type)}</div>
              <div className="flex-1">
                <p className="text-sm">{signal.message}</p>
              </div>
              <Badge variant="secondary" className="text-xs uppercase tracking-wider">
                {signal.category}
              </Badge>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

export const SignalsSection = memo(SignalsSectionComponent);
