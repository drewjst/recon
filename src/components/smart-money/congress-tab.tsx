'use client';

import { memo } from 'react';
import { Landmark, ExternalLink } from 'lucide-react';
import type { StockDetailResponse, CongressTrade } from '@recon/shared';
import { SocialLinks } from './social-links';

interface CongressTabProps {
  data: StockDetailResponse;
}

interface CongressTradeRowProps {
  trade: CongressTrade;
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

const CongressTradeRow = memo(function CongressTradeRow({
  trade,
}: CongressTradeRowProps) {
  const isBuy = trade.tradeType === 'buy';
  const colorClass = isBuy ? 'text-success' : 'text-destructive';
  const partyShort =
    trade.party === 'Democrat' ? 'D' : trade.party === 'Republican' ? 'R' : 'I';
  const chamberLabel = trade.chamber === 'senate' ? 'Sen.' : 'Rep.';

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate max-w-[180px] md:max-w-[250px]">
            {chamberLabel} {trade.politicianName}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              partyShort === 'D'
                ? 'bg-blue-500/10 text-blue-500'
                : partyShort === 'R'
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {partyShort}-{trade.state}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {formatTradeDate(trade.transactionDate)}
          {trade.owner && trade.owner !== 'Self' && (
            <span className="ml-2">({trade.owner})</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${
            isBuy
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {trade.tradeType}
        </span>
        <span className={`font-mono text-sm ${colorClass}`}>{trade.amount}</span>
        {trade.link && (
          <a
            href={trade.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="View filing"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
});

export const CongressTab = memo(function CongressTab({
  data,
}: CongressTabProps) {
  const { congressTrades, congressActivity } = data;

  const trades = congressTrades ?? [];
  const buyCount = congressActivity?.buyCount ?? trades.filter((t) => t.tradeType === 'buy').length;
  const sellCount = congressActivity?.sellCount ?? trades.filter((t) => t.tradeType === 'sell').length;
  const senateCount = congressActivity?.senateCount ?? trades.filter((t) => t.chamber === 'senate').length;
  const houseCount = congressActivity?.houseCount ?? trades.filter((t) => t.chamber === 'house').length;
  const hasActivity = trades.length > 0;

  return (
    <div className="space-y-6 pt-4">
      {/* Activity Summary */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Congressional Trading Summary</h3>
        {hasActivity ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div className="text-2xl font-bold font-mono">{senateCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Senate
              </div>
            </div>
            <div className="bg-card/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold font-mono">{houseCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                House
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card/30 rounded-lg p-6 text-center text-muted-foreground">
            No congressional trading activity found for this stock
          </div>
        )}
      </div>

      {/* Recent Trades */}
      {trades.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-4">Recent Trades</h3>
          <div className="bg-card/30 rounded-lg p-3">
            {trades.slice(0, 15).map((trade, idx) => (
              <CongressTradeRow
                key={`${trade.transactionDate}-${trade.politicianName}-${idx}`}
                trade={trade}
              />
            ))}
          </div>
          {trades.length > 15 && (
            <div className="text-xs text-muted-foreground text-center mt-2">
              Showing 15 of {trades.length} trades
            </div>
          )}
        </div>
      )}

      <SocialLinks />
    </div>
  );
});
