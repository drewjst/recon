'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { StockDetailResponse } from '@recon/shared';

interface HeaderSectionProps {
  data: StockDetailResponse;
}

export function HeaderSection({ data }: HeaderSectionProps) {
  const { company, quote } = data;
  const isPositive = quote.changePercent >= 0;

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toFixed(0)}`;
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-3">
              <span className="font-bold text-2xl">{company.ticker}</span>
              <span className="text-muted-foreground text-lg">{company.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">${quote.price.toFixed(2)}</span>
            <span className={`flex items-center gap-1 text-lg ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
              ${Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.changePercent).toFixed(2)}%)
            </span>
          </div>

          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-2">
            <span>{company.sector}</span>
            <span>•</span>
            <span>{company.industry}</span>
            <span>•</span>
            <span>{formatMarketCap(quote.marketCap)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
