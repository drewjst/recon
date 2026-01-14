'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MiniChart } from './mini-chart';
import type { StockDetailResponse } from '@recon/shared';

interface HeaderSectionProps {
  data: StockDetailResponse;
}

export function HeaderSection({ data }: HeaderSectionProps) {
  const { company, quote, performance } = data;

  const performanceMetrics = [
    { label: '1D', value: performance.day1Change },
    { label: '1W', value: performance.week1Change },
    { label: '1M', value: performance.month1Change },
    { label: 'YTD', value: performance.ytdChange },
    { label: '1Y', value: performance.year1Change },
  ];

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toFixed(0)}`;
  };

  // Calculate 52-week range position (0-100%)
  const rangePosition = Math.max(0, Math.min(100,
    ((quote.price - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100
  ));

  return (
    <Link href={`/stock/${company.ticker}/overview`} className="block group">
      <Card className="border border-border bg-card shadow-card hover:border-accent/50 hover:shadow-md transition-all duration-200 cursor-pointer relative">
        {/* Clickable indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <span>View Details</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </div>

        <CardContent className="p-6">
          {/* Row 1: Ticker, Name, Market Cap, Sector, Industry - all on one line */}
          <div className="flex items-center gap-2 text-sm mb-4 flex-wrap">
            <span className="font-semibold text-lg tracking-tight">{company.ticker}</span>
            <span className="text-muted-foreground">{company.name}</span>
            <span className="text-muted-foreground/50">|</span>
            <span className="font-mono text-muted-foreground">{formatMarketCap(quote.marketCap)}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="text-muted-foreground">{company.sector}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="text-muted-foreground">{company.industry}</span>
          </div>

          {/* Row 2: TradingView Chart - wider */}
          <div className="w-full h-[200px] rounded-lg border border-border bg-card overflow-hidden mb-4">
            <MiniChart
              symbol={company.ticker}
              exchange={company.exchange}
              height={200}
              dateRange="12M"
              colorTheme="light"
            />
          </div>

          {/* Row 3: Performance Metrics */}
          <div className="flex items-center gap-1 mb-4">
            {performanceMetrics.map(({ label, value }, index) => (
              <div key={label} className="flex items-center">
                {index > 0 && <span className="text-muted-foreground/40 mx-2">|</span>}
                <span className="text-xs text-muted-foreground mr-1">{label}</span>
                <span className={`text-xs font-medium font-mono ${value >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {value > 0 ? '+' : ''}{value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>

          {/* Row 4: 52-Week Range Slider */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">52-Week Range</div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-14">
                ${quote.fiftyTwoWeekLow.toFixed(0)}
              </span>
              {/* Custom slider track */}
              <div className="flex-1 relative h-1.5">
                {/* Track background */}
                <div className="absolute inset-0 bg-muted rounded-full" />
                {/* Filled portion up to marker */}
                <div
                  className="absolute left-0 top-0 h-full bg-accent/30 rounded-full"
                  style={{ width: `${rangePosition}%` }}
                />
                {/* Current price marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full shadow-sm transition-all duration-300"
                  style={{ left: `calc(${rangePosition}% - 6px)` }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-14 text-right">
                ${quote.fiftyTwoWeekHigh.toFixed(0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
