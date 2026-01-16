'use client';

import { SectionCard } from './section-card';
import { Badge } from '@/components/ui/badge';
import type { StockDetailResponse } from '@recon/shared';

interface SmartMoneySectionProps {
  data: StockDetailResponse;
}

export function SmartMoneySection({ data }: SmartMoneySectionProps) {
  const { holdings, insiderActivity } = data;
  if (!holdings) return null;

  const formatValue = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (absVal >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  // Defensive: ensure insiderActivity exists and has expected properties
  const buyCount = insiderActivity?.buyCount90d ?? 0;
  const sellCount = insiderActivity?.sellCount90d ?? 0;
  const netValue = insiderActivity?.netValue90d ?? 0;
  const trades = insiderActivity?.trades ?? [];
  const hasInsiderActivity = buyCount > 0 || sellCount > 0;

  return (
    <SectionCard title="Smart Money">
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Institutional Ownership</div>
          <div className="text-2xl font-bold font-mono">
            {holdings.totalInstitutionalOwnership > 0
              ? `${(holdings.totalInstitutionalOwnership * 100).toFixed(1)}%`
              : 'N/A'}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Net Change (Qtrs)</div>
          <div className={`text-2xl font-bold font-mono ${holdings.netChangeShares >= 0 ? 'text-success' : 'text-destructive'}`}>
            {holdings.netChangeShares !== 0 ? (
              <>
                {holdings.netChangeShares >= 0 ? '+' : ''}
                {(holdings.netChangeShares / 1e6).toFixed(1)}M shares
              </>
            ) : (
              'N/A'
            )}
          </div>
        </div>
      </div>

      {holdings.topInstitutional.length > 0 && (
        <div className="mb-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Top Holders</div>
          <div className="space-y-2">
            {holdings.topInstitutional.slice(0, 5).map((holder) => (
              <div key={holder.fundCik} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
                <span className="text-sm truncate max-w-[200px]">{holder.fundName}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-mono text-muted-foreground">
                    {(holder.shares / 1e6).toFixed(1)}M shares
                  </span>
                  <Badge
                    variant="outline"
                    className={holder.changePercent >= 0 ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}
                  >
                    <span className="font-mono">
                      {holder.changePercent >= 0 ? '+' : ''}
                      {holder.changePercent.toFixed(1)}%
                    </span>
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border/30 pt-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Insider Activity (90d)</div>
        {hasInsiderActivity ? (
          <>
            <div className="flex flex-wrap gap-4 md:gap-6 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-sm font-mono">
                  {buyCount} buys
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <span className="text-sm font-mono">
                  {sellCount} sells
                </span>
              </div>
              <div className="ml-auto">
                <span className={`text-sm font-medium font-mono ${netValue >= 0 ? 'text-success' : 'text-destructive'}`}>
                  Net: {netValue >= 0 ? '+' : ''}{formatValue(netValue)}
                </span>
              </div>
            </div>
            {trades.length > 0 && (
              <div className="space-y-2">
                {trades
                  .filter((trade) => trade.value > 0)
                  .slice(0, 5)
                  .map((trade) => (
                    <div key={`${trade.tradeDate}-${trade.insiderName}-${trade.shares}`} className="flex items-center justify-between text-sm py-1 border-t border-border/30 first:border-t-0">
                      <span className="truncate max-w-[150px] md:max-w-[200px]">{trade.insiderName}</span>
                      <span className={`font-mono ${trade.tradeType === 'buy' ? 'text-success' : 'text-destructive'}`}>
                        {trade.tradeType === 'buy' ? 'Buy' : 'Sell'} {formatValue(trade.value)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground">No insider activity in last 90 days</div>
        )}
      </div>
    </SectionCard>
  );
}
