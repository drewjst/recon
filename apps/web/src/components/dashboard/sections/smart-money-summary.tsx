'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Landmark, Users, TriangleAlert, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { StockDetailResponse } from '@recon/shared';

interface SmartMoneySummaryProps {
  data: StockDetailResponse;
  ticker: string;
}

function getShortInterestColor(percent: number): string {
  if (percent >= 20) return 'text-destructive';
  if (percent >= 10) return 'text-amber-500';
  return 'text-foreground';
}

/**
 * Condensed one-line summary of smart money activity.
 * Format: "Institutional: 69% (+16.3% QoQ) · Congress: 6 buys, 4 sells · Insiders: No activity"
 */
export const SmartMoneySummary = memo(function SmartMoneySummary({ data, ticker }: SmartMoneySummaryProps) {
  const { holdings, insiderActivity, congressActivity, shortInterest } = data;

  if (!holdings && !shortInterest && !insiderActivity && !congressActivity) {
    return null;
  }

  const sentiment = holdings?.sentiment;
  const ownershipPercent = sentiment?.ownershipPercent ?? holdings?.totalInstitutionalOwnership;
  const ownershipChange = sentiment?.ownershipPercentChange;

  // Insider activity
  const buyCount = insiderActivity?.buyCount90d ?? 0;
  const sellCount = insiderActivity?.sellCount90d ?? 0;
  const netValue = insiderActivity?.netValue90d ?? 0;
  const hasInsiderActivity = buyCount > 0 || sellCount > 0;

  // Congress activity
  const congressBuyCount = congressActivity?.buyCount ?? 0;
  const congressSellCount = congressActivity?.sellCount ?? 0;
  const hasCongressActivity = congressBuyCount > 0 || congressSellCount > 0;

  return (
    <Card className="bg-card/50 backdrop-blur-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {/* Institutional */}
            {ownershipPercent != null && ownershipPercent > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Institutional:</span>
                  <span className="font-mono font-medium">{ownershipPercent.toFixed(0)}%</span>
                  {ownershipChange != null && ownershipChange !== 0 && (
                    <span className={`font-mono text-xs ${ownershipChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ({ownershipChange >= 0 ? '+' : ''}{ownershipChange.toFixed(1)}% QoQ)
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground/50">·</span>
              </>
            )}

            {/* Short Interest */}
            {shortInterest && shortInterest.shortPercentFloat > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  {shortInterest.shortPercentFloat >= 10 && (
                    <TriangleAlert className={`h-3.5 w-3.5 ${getShortInterestColor(shortInterest.shortPercentFloat)}`} />
                  )}
                  <span className="text-muted-foreground">Short:</span>
                  <span className={`font-mono font-medium ${getShortInterestColor(shortInterest.shortPercentFloat)}`}>
                    {shortInterest.shortPercentFloat.toFixed(1)}%
                  </span>
                </div>
                <span className="text-muted-foreground/50">·</span>
              </>
            )}

            {/* Congress */}
            <div className="flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Congress:</span>
              {hasCongressActivity ? (
                <>
                  {congressBuyCount > 0 && (
                    <span className="font-mono text-success">{congressBuyCount} buy{congressBuyCount !== 1 ? 's' : ''}</span>
                  )}
                  {congressBuyCount > 0 && congressSellCount > 0 && (
                    <span className="text-muted-foreground">/</span>
                  )}
                  {congressSellCount > 0 && (
                    <span className="font-mono text-destructive">{congressSellCount} sell{congressSellCount !== 1 ? 's' : ''}</span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground/70">No activity</span>
              )}
            </div>
            <span className="text-muted-foreground/50">·</span>

            {/* Insiders */}
            <div className="flex items-center gap-1.5">
              {hasInsiderActivity ? (
                <>
                  <span className="text-muted-foreground">Insiders:</span>
                  {buyCount > 0 && (
                    <span className="font-mono text-success">{buyCount} buy{buyCount !== 1 ? 's' : ''}</span>
                  )}
                  {buyCount > 0 && sellCount > 0 && (
                    <span className="text-muted-foreground">/</span>
                  )}
                  {sellCount > 0 && (
                    <span className="font-mono text-destructive">{sellCount} sell{sellCount !== 1 ? 's' : ''}</span>
                  )}
                  {netValue !== 0 && (
                    <span className={`hidden lg:inline font-mono text-xs ${netValue >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ({netValue >= 0 ? '+' : ''}{formatCurrency(netValue)})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">Insiders:</span>
                  <span className="text-muted-foreground/70">No activity (90d)</span>
                </>
              )}
            </div>
          </div>

          {/* Deep Dive Link */}
          <Link
            href={`/stock/${ticker.toUpperCase()}/smart-money`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            Deep Dive
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
});
