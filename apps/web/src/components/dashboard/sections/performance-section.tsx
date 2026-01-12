'use client';

import { SectionCard } from './section-card';
import type { StockDetailResponse } from '@recon/shared';

interface PerformanceSectionProps {
  data: StockDetailResponse;
}

export function PerformanceSection({ data }: PerformanceSectionProps) {
  const { quote } = data;

  // Mock data for demo - in production these would come from the API
  const performance = {
    '1D': quote.changePercent,
    '1W': 2.1,
    '1M': -3.4,
    'YTD': 8.2,
  };

  const rangePercent = ((quote.price - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100;

  return (
    <SectionCard title="Performance">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(performance).map(([label, val]) => (
          <div key={label} className="text-center">
            <div className="text-sm text-muted-foreground mb-1">{label}</div>
            <div className={`text-lg font-semibold ${val >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {val > 0 ? '+' : ''}{typeof val === 'number' ? val.toFixed(2) : val}%
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>52W Low: ${quote.fiftyTwoWeekLow.toFixed(2)}</span>
          <span>52W High: ${quote.fiftyTwoWeekHigh.toFixed(2)}</span>
        </div>
        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all"
            style={{ width: `${Math.max(5, Math.min(100, rangePercent))}%` }}
          />
        </div>
        <div className="text-sm text-muted-foreground text-center">
          Current price is {rangePercent.toFixed(0)}% of 52-week range
        </div>
      </div>
    </SectionCard>
  );
}
