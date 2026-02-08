'use client';

import { memo } from 'react';
import { Users, UserCheck, Landmark, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { StockDetailResponse } from '@recon/shared';

interface QuickStatsSectionProps {
  data: StockDetailResponse;
}

export const QuickStatsSection = memo(function QuickStatsSection({
  data,
}: QuickStatsSectionProps) {
  const { holdings, insiderActivity, congressActivity, shortInterest } = data;

  const sentiment = holdings?.sentiment;
  const buyCount = insiderActivity?.buyCount90d ?? 0;
  const sellCount = insiderActivity?.sellCount90d ?? 0;
  const netValue = insiderActivity?.netValue90d ?? 0;
  const congressBuyCount = congressActivity?.buyCount ?? 0;
  const congressSellCount = congressActivity?.sellCount ?? 0;
  const shortPercent = shortInterest?.shortPercentFloat ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Institutional Card */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Institutional
            </span>
          </div>
          <div className="text-2xl font-bold font-mono">
            {sentiment?.ownershipPercent != null
              ? `${sentiment.ownershipPercent.toFixed(0)}%`
              : '--'}
          </div>
          {sentiment?.ownershipPercentChange != null &&
            sentiment.ownershipPercentChange !== 0 && (
              <div
                className={`text-sm font-mono ${
                  sentiment.ownershipPercentChange >= 0
                    ? 'text-success'
                    : 'text-destructive'
                }`}
              >
                {sentiment.ownershipPercentChange >= 0 ? '+' : ''}
                {sentiment.ownershipPercentChange.toFixed(1)}% QoQ
              </div>
            )}
        </CardContent>
      </Card>

      {/* Insiders Card */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Insiders (90d)
            </span>
          </div>
          {buyCount > 0 || sellCount > 0 ? (
            <>
              <div className="text-2xl font-bold font-mono">
                {buyCount}B / {sellCount}S
              </div>
              <div
                className={`text-sm font-mono ${
                  netValue >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {netValue >= 0 ? '+' : ''}
                {formatCurrency(netValue)}
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold font-mono text-muted-foreground">
              No activity
            </div>
          )}
        </CardContent>
      </Card>

      {/* Congress Card */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Congress
            </span>
          </div>
          {congressBuyCount > 0 || congressSellCount > 0 ? (
            <>
              <div className="text-2xl font-bold font-mono">
                {congressBuyCount}B / {congressSellCount}S
              </div>
              <div className="text-sm text-muted-foreground">Last 12 months</div>
            </>
          ) : (
            <div className="text-2xl font-bold font-mono text-muted-foreground">
              No trades
            </div>
          )}
        </CardContent>
      </Card>

      {/* Short Interest Card */}
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Short Interest
            </span>
          </div>
          <div
            className={`text-2xl font-bold font-mono ${
              shortPercent >= 20
                ? 'text-destructive'
                : shortPercent >= 10
                  ? 'text-warning'
                  : ''
            }`}
          >
            {shortPercent > 0 ? `${shortPercent.toFixed(1)}%` : '--'}
          </div>
          {shortInterest?.daysToCover != null && shortInterest.daysToCover > 0 && (
            <div className="text-sm text-muted-foreground">
              {shortInterest.daysToCover.toFixed(1)} days to cover
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
