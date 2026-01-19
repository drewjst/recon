'use client';

import { memo } from 'react';
import { SectionCard } from '@/components/dashboard/sections/section-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getNestedValue, findWinner, type MetricConfig } from '@/lib/compare-utils';
import { cn } from '@/lib/utils';
import type { StockDetailResponse, CompareLayout } from '@recon/shared';

interface MetricTableProps {
  title: string;
  stocks: StockDetailResponse[];
  metrics: MetricConfig[];
  layout: CompareLayout;
}

export const MetricTable = memo(function MetricTable({ title, stocks, metrics, layout }: MetricTableProps) {
  const tickers = stocks.map((s) => s.company.ticker);

  return (
    <SectionCard title={title}>
      <div className={cn('overflow-x-auto', layout === 'table' && '-mx-4 px-4')}>
        <Table className={cn(layout === 'table' && 'min-w-[600px]')}>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-[140px] text-muted-foreground">Metric</TableHead>
              {tickers.map((ticker) => (
                <TableHead key={ticker} className="text-center text-muted-foreground">
                  {ticker}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric) => {
              const values = stocks.map((s) => getNestedValue(s, metric.path));
              const winnerIdx = findWinner(values, metric.higherIsBetter, metric.excludeNonPositive);

              return (
                <TableRow key={metric.key} className="border-border/30 hover:bg-secondary/30">
                  <TableCell className="font-medium">{metric.label}</TableCell>
                  {values.map((value, idx) => {
                    // Check if this value is the winner (and is valid)
                    const isWinner = winnerIdx === idx;
                    // For display, show the value even if it's 0 (but it won't be highlighted as winner)
                    const displayValue = value !== null ? metric.format(value) : '-';

                    return (
                      <TableCell
                        key={tickers[idx]}
                        className={cn(
                          'text-center font-mono',
                          isWinner && 'text-green-600 font-semibold'
                        )}
                      >
                        {displayValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
});
