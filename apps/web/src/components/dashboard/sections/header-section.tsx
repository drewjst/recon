'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ShareButton } from '@/components/ui/share-button';
import { MiniChart } from './mini-chart';
import type { StockDetailResponse } from '@recon/shared';

function getPiotroskiGrade(score: number): string {
  if (score >= 7) return 'Strong';
  if (score >= 4) return 'Moderate';
  return 'Weak';
}

interface HeaderSectionProps {
  data: StockDetailResponse;
}

export function HeaderSection({ data }: HeaderSectionProps) {
  const { company, quote, performance, scores } = data;

  const piotroskiScore = scores?.piotroski.score ?? 0;
  const grade = getPiotroskiGrade(piotroskiScore);
  const shareText = `${company.ticker} scores ${grade} on Crux - Piotroski: ${piotroskiScore}/9`;

  const performanceMetrics = [
    { label: '1D', value: performance.day1Change },
    { label: '1W', value: performance.week1Change },
    { label: '1M', value: performance.month1Change },
    { label: 'YTD', value: performance.ytdChange },
    { label: '1Y', value: performance.year1Change },
  ];

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(0)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
    return `$${cap.toFixed(0)}`;
  };

  // Calculate 52-week range position (0-100%)
  const range = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
  const rangePosition = range > 0
    ? Math.max(0, Math.min(100, ((quote.price - quote.fiftyTwoWeekLow) / range) * 100))
    : 50; // Default to middle if high === low

  return (
    <Link href={`/stock/${company.ticker}/overview`} className="block group">
      <Card className="border border-border bg-card shadow-card hover:border-accent/50 hover:shadow-md transition-all duration-200 cursor-pointer relative">
        <CardContent className="p-4 sm:p-6">
          {/* Header Row - stacks on mobile */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              {/* Ticker & Name */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-lg tracking-tight">{company.ticker}</span>
                <span className="text-muted-foreground text-sm truncate">{company.name}</span>
              </div>
              {/* Meta info - wraps naturally on mobile */}
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="font-mono">{formatMarketCap(quote.marketCap)}</span>
                <span className="text-muted-foreground/50">•</span>
                <span>{company.sector}</span>
                <span className="text-muted-foreground/50">•</span>
                <span className="truncate">{company.industry}</span>
              </div>
            </div>
            {/* Share button and clickable indicator */}
            <div className="flex items-center gap-1 shrink-0">
              <ShareButton
                ticker={company.ticker}
                text={shareText}
                size="icon"
                className="h-8 w-8 opacity-70 hover:opacity-100"
              />
              <div className="flex items-center gap-1 text-xs text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <span className="hidden sm:inline">Details</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* TradingView Chart */}
          <div className="w-full h-[160px] sm:h-[200px] rounded-lg border border-border bg-card overflow-hidden mb-3">
            <MiniChart
              symbol={company.ticker}
              exchange={company.exchange}
              height={200}
              dateRange="12M"
              colorTheme="light"
            />
          </div>

          {/* Performance Metrics + 52-Week Range - stacked on mobile, inline on desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Performance Metrics */}
            <div className="grid grid-cols-5 gap-1 sm:flex sm:items-center sm:gap-0">
              {performanceMetrics.map(({ label, value }, index) => (
                <div key={label} className="flex flex-col sm:flex-row items-center text-center sm:text-left">
                  {index > 0 && <span className="hidden sm:inline text-muted-foreground/40 mx-2">|</span>}
                  <span className="text-[10px] sm:text-xs text-muted-foreground sm:mr-1">{label}</span>
                  <span className={`text-xs font-medium font-mono ${value >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {value > 0 ? '+' : ''}{value.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            {/* 52-Week Range Slider */}
            <div className="flex items-center gap-2 sm:min-w-[200px] lg:min-w-[240px]">
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">52W</span>
              <span className="text-[10px] sm:text-xs font-mono text-muted-foreground whitespace-nowrap">
                ${quote.fiftyTwoWeekLow.toFixed(0)}
              </span>
              <div className="flex-1 relative h-1.5 min-w-[80px]">
                <div className="absolute inset-0 bg-muted rounded-full" />
                <div
                  className="absolute left-0 top-0 h-full bg-accent/30 rounded-full"
                  style={{ width: `${rangePosition}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-accent rounded-full shadow-sm"
                  style={{ left: `calc(${rangePosition}% - 5px)` }}
                />
              </div>
              <span className="text-[10px] sm:text-xs font-mono text-muted-foreground whitespace-nowrap">
                ${quote.fiftyTwoWeekHigh.toFixed(0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
