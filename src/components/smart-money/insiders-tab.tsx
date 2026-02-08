'use client';

import { memo } from 'react';
import { formatCurrency } from '@/lib/formatters';
import type { StockDetailResponse, InsiderTrade } from '@recon/shared';
import { SocialLinks } from './social-links';

interface InsidersTabProps {
  data: StockDetailResponse;
}

interface InsiderTradeRowProps {
  trade: InsiderTrade;
}

function formatTradeDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const InsiderTradeRow = memo(function InsiderTradeRow({
  trade,
}: InsiderTradeRowProps) {
  const isBuy = trade.tradeType === 'buy';
  const colorClass = isBuy ? 'text-success' : 'text-destructive';

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate max-w-[180px] md:max-w-[250px]">
            {trade.insiderName}
          </span>
          {trade.title && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {trade.title}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {formatTradeDate(trade.tradeDate)}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${
            isBuy ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}
        >
          {trade.tradeType}
        </span>
        <span className={`font-mono font-medium ${colorClass}`}>
          {formatCurrency(trade.value)}
        </span>
      </div>
    </div>
  );
});

export const InsidersTab = memo(function InsidersTab({
  data,
}: InsidersTabProps) {
  const { insiderActivity } = data;

  const buyCount = insiderActivity?.buyCount90d ?? 0;
  const sellCount = insiderActivity?.sellCount90d ?? 0;
  const netValue = insiderActivity?.netValue90d ?? 0;
  const trades = insiderActivity?.trades ?? [];
  const hasActivity = buyCount > 0 || sellCount > 0;

  return (
    <div className="space-y-6 pt-4">
      {/* Activity Summary */}
      <div>
        <h3 className="text-sm font-semibold mb-4">90-Day Activity Summary</h3>
        {hasActivity ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold font-mono text-success">
                {buyCount}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Buys
              </div>
            </div>
            <div className="bg-card/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold font-mono text-destructive">
                {sellCount}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Sells
              </div>
            </div>
            <div className="bg-card/30 rounded-lg p-4 text-center">
              <div
                className={`text-2xl font-bold font-mono ${
                  netValue >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {netValue >= 0 ? '+' : ''}
                {formatCurrency(netValue)}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Net Value
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card/30 rounded-lg p-6 text-center text-muted-foreground">
            No insider trading activity in the last 90 days
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      {trades.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-4">Recent Transactions</h3>
          <div className="bg-card/30 rounded-lg p-3">
            {trades
              .filter((trade) => trade.value > 0)
              .slice(0, 10)
              .map((trade, idx) => (
                <InsiderTradeRow
                  key={`${trade.tradeDate}-${trade.insiderName}-${idx}`}
                  trade={trade}
                />
              ))}
          </div>
          {trades.filter((t) => t.value > 0).length > 10 && (
            <div className="text-xs text-muted-foreground text-center mt-2">
              Showing 10 of {trades.filter((t) => t.value > 0).length} transactions
            </div>
          )}
        </div>
      )}

      <SocialLinks />
    </div>
  );
});
