'use client';

import { SectionCard } from './section-card';
import { Badge } from '@/components/ui/badge';
import type { StockDetailResponse } from '@recon/shared';

interface SmartMoneySectionProps {
  data: StockDetailResponse;
}

export function SmartMoneySection({ data }: SmartMoneySectionProps) {
  const { holdings, insiderTrades } = data;

  // Calculate summary stats from insider trades
  const recentBuys = insiderTrades.filter((t) => t.tradeType === 'buy');
  const recentSells = insiderTrades.filter((t) => t.tradeType === 'sell');
  const totalBuyValue = recentBuys.reduce((sum, t) => sum + t.value, 0);
  const totalSellValue = recentSells.reduce((sum, t) => sum + t.value, 0);

  const formatValue = (val: number) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <SectionCard title="Smart Money">
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Institutional Ownership</div>
          <div className="text-2xl font-bold">
            {(holdings.totalInstitutionalOwnership * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Net Change (Qtrs)</div>
          <div className={`text-2xl font-bold ${holdings.netChangeShares >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {holdings.netChangeShares >= 0 ? '+' : ''}
            {(holdings.netChangeShares / 1e6).toFixed(1)}M shares
          </div>
        </div>
      </div>

      {holdings.topInstitutional.length > 0 && (
        <div className="mb-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Top Holders</div>
          <div className="space-y-2">
            {holdings.topInstitutional.slice(0, 3).map((holder) => (
              <div key={holder.fundCik} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <span className="text-sm truncate max-w-[200px]">{holder.fundName}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {(holder.shares / 1e6).toFixed(1)}M shares
                  </span>
                  <Badge
                    variant="outline"
                    className={holder.changePercent >= 0 ? 'text-green-600 border-green-600/30' : 'text-red-600 border-red-600/30'}
                  >
                    {holder.changePercent >= 0 ? '+' : ''}
                    {holder.changePercent.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-dashed pt-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Insider Activity (90d)</div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm">
              {recentBuys.length} buys ({formatValue(totalBuyValue)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm">
              {recentSells.length} sells ({formatValue(totalSellValue)})
            </span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
