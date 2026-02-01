'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatMarketCap } from '@/lib/compare-utils';
import type { StockDetailResponse, CompareLayout } from '@recon/shared';

interface CompareHeaderProps {
  stocks: StockDetailResponse[];
  layout: CompareLayout;
}

export const CompareHeader = memo(function CompareHeader({ stocks, layout }: CompareHeaderProps) {
  if (layout === 'side-by-side') {
    return (
      <div className="grid grid-cols-2 gap-6">
        {stocks.map((stock) => (
          <StockHeaderCard key={stock.company.ticker} stock={stock} />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div
        className={cn(
          'grid gap-4 min-w-[600px]',
          stocks.length === 3 && 'grid-cols-3',
          stocks.length === 4 && 'grid-cols-4'
        )}
      >
        {stocks.map((stock) => (
          <StockHeaderCard key={stock.company.ticker} stock={stock} compact />
        ))}
      </div>
    </div>
  );
});

interface StockHeaderCardProps {
  stock: StockDetailResponse;
  compact?: boolean;
}

const StockHeaderCard = memo(function StockHeaderCard({ stock, compact = false }: StockHeaderCardProps) {
  const { company, quote } = stock;
  const isPositive = quote.changePercent >= 0;

  return (
    <Link href={`/stock/${company.ticker}/overview`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardContent className={cn('p-4', compact && 'p-3')}>
          <div className="flex items-baseline gap-2 mb-1">
            <span className={cn('font-bold', compact ? 'text-lg' : 'text-xl')}>
              {company.ticker}
            </span>
            {!compact && (
              <span className="text-muted-foreground text-sm truncate">
                {company.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn('font-bold font-mono', compact ? 'text-lg' : 'text-2xl')}
            >
              ${quote.price.toFixed(2)}
            </span>
            <span
              className={cn(
                'font-mono text-sm',
                isPositive ? 'text-positive' : 'text-negative'
              )}
            >
              {isPositive ? '+' : ''}
              {quote.changePercent.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <span>{formatMarketCap(quote.marketCap)}</span>
            {!compact && (
              <>
                <span className="mx-1">·</span>
                <span>{company.sector}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});
