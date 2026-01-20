'use client';

import { memo } from 'react';
import { SectionCard } from './section-card';
import type { StockDetailResponse } from '@recon/shared';

interface PerformanceSectionProps {
  data: StockDetailResponse;
}

export const PerformanceSection = memo(function PerformanceSection({ data }: PerformanceSectionProps) {
  const { quote, performance } = data;

  const performanceMetrics = [
    { label: '1D', value: performance.day1Change },
    { label: '1W', value: performance.week1Change },
    { label: '1M', value: performance.month1Change },
    { label: 'YTD', value: performance.ytdChange },
    { label: '1Y', value: performance.year1Change },
  ];

  const rangePercent = ((quote.price - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100;

  return (
    <SectionCard title="Performance">
      <div className="grid grid-cols-5 gap-2 md:gap-4 mb-6">
        {performanceMetrics.map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-xs md:text-sm text-muted-foreground mb-1">{label}</div>
            <div className={`text-sm md:text-lg font-semibold ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {value > 0 ? '+' : ''}{value.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs md:text-sm text-muted-foreground">
          <span>52W Low: ${quote.fiftyTwoWeekLow.toFixed(2)}</span>
          <span className="hidden md:inline">
            {performance.percentOf52WeekHigh.toFixed(0)}% of high
          </span>
          <span>52W High: ${quote.fiftyTwoWeekHigh.toFixed(2)}</span>
        </div>
        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all"
            style={{ width: `${Math.max(5, Math.min(100, rangePercent))}%` }}
          />
        </div>
        <div className="text-xs md:text-sm text-muted-foreground text-center md:hidden">
          {performance.percentOf52WeekHigh.toFixed(0)}% of 52-week high
        </div>
      </div>
    </SectionCard>
  );
});
