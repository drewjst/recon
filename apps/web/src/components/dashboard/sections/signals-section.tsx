'use client';

import { memo } from 'react';
import { CheckCircle2, AlertTriangle, TrendingDown, Target, Newspaper } from 'lucide-react';
import { SectionCard } from './section-card';
import { Badge } from '@/components/ui/badge';
import { useNewsSentiment } from '@/hooks/use-news-sentiment';
import type { StockDetailResponse } from '@recon/shared';
import type { NewsLink } from '@/lib/api';

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
    warning: 'text-amber-500',
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
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />;
    case 'bearish':
      return <TrendingDown className="h-3.5 w-3.5 text-destructive flex-shrink-0" />;
    default:
      return null;
  }
};

function formatNewsDate(isoDate: string): { date: string; time: string } {
  const d = new Date(isoDate);
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate().toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(-2);
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '');
  return { date: `${month}-${day}-${year}`, time };
}

function NewsArticleRow({ article }: { article: NewsLink }) {
  const { date, time } = article.publishedAt ? formatNewsDate(article.publishedAt) : { date: '', time: '' };
  return (
    <div className="flex items-start gap-2 text-xs py-1 border-b border-border/20 last:border-0">
      {date && (
        <span className="text-muted-foreground/70 font-mono whitespace-nowrap">
          {date} {time}
        </span>
      )}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground hover:text-primary hover:underline truncate flex-1"
        title={article.title}
      >
        {article.title}
      </a>
      <span className="text-muted-foreground/60 whitespace-nowrap">({article.site})</span>
    </div>
  );
}

function SignalsSectionComponent({ data }: SignalsSectionProps) {
  const { signals: rawSignals, performance, quote, analystEstimates, company } = data;
  const { data: newsSentiment } = useNewsSentiment(company.ticker);

  const signals = rawSignals ?? [];

  // Calculate technical indicators
  const momentum = calculateMomentum(performance);
  const trend = calculateTrendPosition(quote);
  const volatility = calculateVolatility(quote);
  const strength = calculateRelativeStrength(performance);

  // Categorize signals in a single pass
  const signalsByType = signals.reduce(
    (acc, s) => {
      acc[s.type].push(s);
      return acc;
    },
    { bullish: [], warning: [], bearish: [] } as Record<string, typeof signals>
  );

  // Count technical signals
  const technicalIndicators = [momentum, trend, strength];
  const technicalBullish = technicalIndicators.filter((i) => i.signal === 'bullish').length;
  const technicalBearish = technicalIndicators.filter((i) => i.signal === 'bearish').length;
  const volatilityWarning = volatility.signal === 'warning' ? 1 : 0;

  // Combined counts
  const totalBullish = signalsByType.bullish.length + technicalBullish;
  const totalBearish = signalsByType.bearish.length + technicalBearish;
  const totalWarning = signalsByType.warning.length + volatilityWarning;

  // Get top 3 signals (prioritized: bullish, warning, bearish)
  const topSignals = [
    ...signalsByType.bullish,
    ...signalsByType.warning,
    ...signalsByType.bearish,
  ].slice(0, 3);

  // Analyst price target
  const priceTargetUpside = analystEstimates && quote.price > 0
    ? ((analystEstimates.priceTargetAverage - quote.price) / quote.price) * 100
    : null;

  return (
    <SectionCard title="Key Signals">
      {/* Technical Indicators - compact inline row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-3 border-b border-border/30">
        <CompactIndicator indicator={momentum} />
        <CompactIndicator indicator={trend} />
        <CompactIndicator indicator={volatility} />
        <CompactIndicator indicator={strength} />
        {priceTargetUpside !== null && (
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Target</span>
            <span className={`text-sm font-semibold font-mono ${priceTargetUpside >= 0 ? 'text-success' : 'text-destructive'}`}>
              {priceTargetUpside >= 0 ? '+' : ''}{priceTargetUpside.toFixed(0)}%
            </span>
          </div>
        )}
        {newsSentiment && (
          <div className="flex items-center gap-1.5">
            <Newspaper className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">News</span>
            <span className={`text-sm font-semibold ${
              newsSentiment.sentiment === 'positive' ? 'text-success' :
              newsSentiment.sentiment === 'negative' ? 'text-destructive' :
              newsSentiment.sentiment === 'mixed' ? 'text-amber-500' :
              'text-muted-foreground'
            }`}>
              {newsSentiment.sentiment.charAt(0).toUpperCase() + newsSentiment.sentiment.slice(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({newsSentiment.articleCount} articles, {newsSentiment.daysCovered}d)
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
          <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/5 text-xs px-2 py-0.5">
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

      {/* News Articles - Finviz style */}
      {newsSentiment?.topArticles && newsSentiment.topArticles.length > 0 && (
        <div className="pt-3 border-t border-border/30 mt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Newspaper className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent News</span>
          </div>
          <div className="space-y-0">
            {newsSentiment.topArticles.map((article, idx) => (
              <NewsArticleRow key={`${article.url}-${idx}`} article={article} />
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export const SignalsSection = memo(SignalsSectionComponent);
