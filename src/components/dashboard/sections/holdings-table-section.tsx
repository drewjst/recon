'use client';

import { memo } from 'react';
import Link from 'next/link';
import { SectionCard } from './section-card';
import { formatCurrency } from '@/lib/formatters';
import type { StockDetailResponse } from '@recon/shared';

interface HoldingsTableSectionProps {
  data: StockDetailResponse;
}

function HoldingsTableSectionComponent({ data }: HoldingsTableSectionProps) {
  const { etfData } = data;
  if (!etfData || etfData.holdings.length === 0) return null;

  return (
    <SectionCard title="Top Holdings">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-xs text-muted-foreground uppercase tracking-wider">
                Ticker
              </th>
              <th className="text-left py-2 text-xs text-muted-foreground uppercase tracking-wider">
                Name
              </th>
              <th className="text-right py-2 text-xs text-muted-foreground uppercase tracking-wider">
                Weight
              </th>
              <th className="text-right py-2 text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {etfData.holdings.map((holding) => (
              <tr
                key={holding.ticker}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="py-3 font-mono font-medium">
                  <Link
                    href={`/stock/${holding.ticker}`}
                    className="text-primary hover:underline"
                  >
                    {holding.ticker}
                  </Link>
                </td>
                <td className="py-3 text-muted-foreground truncate max-w-[200px]">
                  {holding.name}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.min(holding.weightPercent * 5, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono">{holding.weightPercent.toFixed(2)}%</span>
                  </div>
                </td>
                <td className="py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">
                  {formatCurrency(holding.marketValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export const HoldingsTableSection = memo(HoldingsTableSectionComponent);
