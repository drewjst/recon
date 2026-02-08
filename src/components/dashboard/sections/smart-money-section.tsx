'use client';

import { memo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Landmark, TriangleAlert } from 'lucide-react';
import { SectionCard } from './section-card';
import { formatCurrency, formatShares } from '@/lib/formatters';
import type { StockDetailResponse, InstitutionalHolder, CongressTrade, InsiderTrade } from '@recon/shared';

interface SmartMoneySectionProps {
  data: StockDetailResponse;
}

const MAX_FUND_NAME_LENGTH = 20;

function shortenFundName(name: string): string {
  if (name.length <= MAX_FUND_NAME_LENGTH) return name;

  // Build shortened name by accumulating words that fit
  const shortened = name.split(' ').reduce((acc, word) => {
    const candidate = acc ? `${acc} ${word}` : word;
    return candidate.length <= MAX_FUND_NAME_LENGTH ? candidate : acc;
  }, '');

  return shortened || name.slice(0, MAX_FUND_NAME_LENGTH);
}

interface HolderRowProps {
  holder: InstitutionalHolder;
  type: 'buyer' | 'seller';
}

type ActivityTab = 'insiders' | 'congress';

interface CongressTradeRowProps {
  trade: CongressTrade;
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CongressTradeRow = memo(function CongressTradeRow({ trade }: CongressTradeRowProps) {
  const isBuy = trade.tradeType === 'buy';
  const colorClass = isBuy ? 'text-success' : 'text-destructive';
  const partyShort = trade.party === 'Democrat' ? 'D' : trade.party === 'Republican' ? 'R' : 'I';
  const chamberLabel = trade.chamber === 'senate' ? 'Sen.' : 'Rep.';
  const tradeDate = formatShortDate(trade.transactionDate);

  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-t border-border/30 first:border-t-0">
      <div className="flex items-center gap-2 min-w-0">
        <Landmark className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="truncate max-w-[120px] md:max-w-[160px]" title={trade.politicianName}>
          {chamberLabel} {trade.politicianName}
        </span>
        <span className="text-xs text-muted-foreground">({partyShort}-{trade.state})</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`font-mono ${colorClass}`}>
          {isBuy ? 'Buy' : 'Sell'}
        </span>
        <span className="text-xs text-muted-foreground">{trade.amount}</span>
        {tradeDate && (
          <span className="text-xs text-muted-foreground w-12 text-right">{tradeDate}</span>
        )}
      </div>
    </div>
  );
});

interface InsiderTradeRowProps {
  trade: InsiderTrade;
}

const InsiderTradeRow = memo(function InsiderTradeRow({ trade }: InsiderTradeRowProps) {
  return (
    <div className="flex items-center justify-between text-sm py-1 border-t border-border/30 first:border-t-0">
      <span className="truncate max-w-[150px] md:max-w-[200px]">{trade.insiderName}</span>
      <span className={`font-mono ${trade.tradeType === 'buy' ? 'text-success' : 'text-destructive'}`}>
        {trade.tradeType === 'buy' ? 'Buy' : 'Sell'} {formatCurrency(trade.value)}
      </span>
    </div>
  );
});

const HolderRow = memo(function HolderRow({ holder, type }: HolderRowProps) {
  const isBuyer = type === 'buyer';
  const Icon = isBuyer ? TrendingUp : TrendingDown;
  const colorClass = isBuyer ? 'text-success' : 'text-destructive';
  const sign = isBuyer ? '+' : '';

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${colorClass}`} />
        <span className="text-sm truncate" title={holder.fundName}>
          {shortenFundName(holder.fundName)}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-sm font-mono ${colorClass}`}>
          {sign}{holder.changePercent.toFixed(1)}%
        </span>
        <span className="text-sm font-mono text-muted-foreground w-14 text-right">
          {formatShares(holder.shares)}
        </span>
      </div>
    </div>
  );
});

function getShortInterestColor(percent: number): string {
  if (percent >= 20) return 'text-destructive';
  if (percent >= 10) return 'text-warning';
  return 'text-foreground';
}

export const SmartMoneySection = memo(function SmartMoneySection({ data }: SmartMoneySectionProps) {
  const { company, holdings, insiderActivity, congressTrades, congressActivity, shortInterest } = data;

  // Default to Congress tab if there are congress trades, otherwise Insiders
  const defaultTab: ActivityTab = (congressTrades && congressTrades.length > 0) ? 'congress' : 'insiders';
  const [activeTab, setActiveTab] = useState<ActivityTab>(defaultTab);

  if (!holdings && !shortInterest) return null;

  const sentiment = holdings?.sentiment;
  const topBuyers = holdings?.topBuyers || [];
  const topSellers = holdings?.topSellers || [];

  // Defensive: ensure insiderActivity exists and has expected properties
  const buyCount = insiderActivity?.buyCount90d ?? 0;
  const sellCount = insiderActivity?.sellCount90d ?? 0;
  const netValue = insiderActivity?.netValue90d ?? 0;
  const insiderTradesList = insiderActivity?.trades ?? [];
  const hasInsiderActivity = buyCount > 0 || sellCount > 0;

  // Congress trades data
  const congressTradesList = congressTrades ?? [];
  const hasCongressActivity = congressTradesList.length > 0;
  const congressBuyCount = congressActivity?.buyCount ?? congressTradesList.filter(t => t.tradeType === 'buy').length;
  const congressSellCount = congressActivity?.sellCount ?? congressTradesList.filter(t => t.tradeType === 'sell').length;

  // Check if we have any institutional data
  const hasOwnershipData = sentiment && sentiment.ownershipPercent > 0;
  const hasHolderCounts = sentiment && sentiment.investorsHolding > 0;
  const hasBuyersOrSellers = topBuyers.length > 0 || topSellers.length > 0;

  // Build rich share text
  const shareMetrics: string[] = [];

  if (hasOwnershipData) {
    shareMetrics.push(`Institutional Ownership: ${sentiment.ownershipPercent.toFixed(1)}%`);
    if (sentiment.ownershipPercentChange !== 0) {
      const sign = sentiment.ownershipPercentChange >= 0 ? '+' : '';
      shareMetrics.push(`QoQ Change: ${sign}${sentiment.ownershipPercentChange.toFixed(1)}%`);
    }
  }
  if (hasHolderCounts && sentiment) {
    shareMetrics.push(`Holders: ${sentiment.investorsHolding} (${sentiment.investorsIncreased} increased, ${sentiment.investorsDecreased} decreased)`);
  }
  if (hasInsiderActivity) {
    shareMetrics.push(`Insider Activity (90d): ${buyCount} buys, ${sellCount} sells`);
    if (netValue !== 0) {
      shareMetrics.push(`Net Insider Value: ${netValue >= 0 ? '+' : ''}${formatCurrency(netValue)}`);
    }
  }

  const shareText = `$${company.ticker} Smart Money\n\n${shareMetrics.join('\n')}`;

  return (
    <SectionCard title="Smart Money" shareTicker={company.ticker} shareText={shareText}>
      {/* Institutional Sentiment */}
      {(hasOwnershipData || hasHolderCounts) && sentiment ? (
        <div className="mb-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Institutional Sentiment
          </div>

          {/* Ownership Bar - only show if we have ownership data */}
          {hasOwnershipData && (
            <div className="mb-3">
              <div className="h-2.5 rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full bg-success rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, sentiment.ownershipPercent)}%` }}
                />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xl font-bold font-mono">
                  {sentiment.ownershipPercent.toFixed(0)}%
                </span>
                <span className="text-sm text-muted-foreground">Own</span>
                {sentiment.ownershipPercentChange !== 0 && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className={`text-sm font-mono ${sentiment.ownershipPercentChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {sentiment.ownershipPercentChange >= 0 ? '+' : ''}{sentiment.ownershipPercentChange.toFixed(1)}% QoQ
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Holder Activity Breakdown */}
          {sentiment.investorsHolding > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {sentiment.investorsIncreased > 0 && (
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                  <span className="font-mono text-success">{sentiment.investorsIncreased}</span>
                  <span className="text-muted-foreground">increased</span>
                </div>
              )}
              {sentiment.investorsDecreased > 0 && (
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  <span className="font-mono text-destructive">{sentiment.investorsDecreased}</span>
                  <span className="text-muted-foreground">decreased</span>
                </div>
              )}
              {sentiment.investorsHeld > 0 && (
                <div className="flex items-center gap-1.5">
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">{sentiment.investorsHeld}</span>
                  <span className="text-muted-foreground">held</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : !hasBuyersOrSellers && !sentiment ? (
        <div className="mb-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Institutional Sentiment
          </div>
          <div className="text-sm text-muted-foreground">No institutional ownership data</div>
        </div>
      ) : null}

      {/* Short Interest */}
      {shortInterest && shortInterest.shortPercentFloat > 0 && (
        <div className="mb-6 pt-4 border-t border-border/30">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Short Interest
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              {shortInterest.shortPercentFloat >= 10 && (
                <TriangleAlert className={`h-4 w-4 ${getShortInterestColor(shortInterest.shortPercentFloat)}`} />
              )}
              <span className="text-sm text-muted-foreground">% of Float</span>
              <span className={`text-lg font-bold font-mono ${getShortInterestColor(shortInterest.shortPercentFloat)}`}>
                {shortInterest.shortPercentFloat.toFixed(1)}%
              </span>
            </div>
            {shortInterest.daysToCover > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Days to Cover</span>
                <span className="text-lg font-bold font-mono">
                  {shortInterest.daysToCover.toFixed(1)}
                </span>
              </div>
            )}
          </div>
          {shortInterest.shortPercentFloat >= 20 && (
            <p className="text-xs text-destructive mt-2">
              High short interest may indicate elevated bearish sentiment or squeeze potential
            </p>
          )}
          {shortInterest.shortPercentFloat >= 10 && shortInterest.shortPercentFloat < 20 && (
            <p className="text-xs text-warning mt-2">
              Elevated short interest indicates increased bearish sentiment
            </p>
          )}
        </div>
      )}

      {/* Top Buyers / Sellers */}
      {hasBuyersOrSellers && (
        <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-border/30">
          {/* Top Buyers */}
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Top Buyers (QoQ)
            </div>
            {topBuyers.length > 0 ? (
              <div>
                {topBuyers.map((holder) => (
                  <HolderRow key={holder.fundCik || holder.fundName} holder={holder} type="buyer" />
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No significant buyers</div>
            )}
          </div>

          {/* Top Sellers */}
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Top Sellers (QoQ)
            </div>
            {topSellers.length > 0 ? (
              <div>
                {topSellers.map((holder) => (
                  <HolderRow key={holder.fundCik || holder.fundName} holder={holder} type="seller" />
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No significant sellers</div>
            )}
          </div>
        </div>
      )}

      {/* Trading Activity - Tabbed (Insiders / Congress) */}
      <div className="pt-4 border-t border-border/30">
        {/* Tab Headers - Congress first if has activity, otherwise Insiders first */}
        <div className="flex items-center gap-4 mb-3">
          {hasCongressActivity ? (
            <>
              <button
                onClick={() => setActiveTab('congress')}
                className={`text-xs uppercase tracking-wider pb-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'congress'
                    ? 'text-foreground border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <Landmark className="h-3 w-3" />
                Congress
              </button>
              <button
                onClick={() => setActiveTab('insiders')}
                className={`text-xs uppercase tracking-wider pb-1 border-b-2 transition-colors ${
                  activeTab === 'insiders'
                    ? 'text-foreground border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                Insiders (90d)
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('insiders')}
                className={`text-xs uppercase tracking-wider pb-1 border-b-2 transition-colors ${
                  activeTab === 'insiders'
                    ? 'text-foreground border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                Insiders (90d)
              </button>
              <button
                onClick={() => setActiveTab('congress')}
                className={`text-xs uppercase tracking-wider pb-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'congress'
                    ? 'text-foreground border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <Landmark className="h-3 w-3" />
                Congress
              </button>
            </>
          )}
        </div>

        {/* Insiders Tab Content */}
        {activeTab === 'insiders' && (
          <>
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
                      Net: {netValue >= 0 ? '+' : ''}{formatCurrency(netValue)}
                    </span>
                  </div>
                </div>
                {insiderTradesList.length > 0 && (
                  <div className="space-y-2">
                    {insiderTradesList
                      .filter((trade) => trade.value > 0)
                      .slice(0, 5)
                      .map((trade) => (
                        <InsiderTradeRow
                          key={`${trade.tradeDate}-${trade.insiderName}-${trade.shares}`}
                          trade={trade}
                        />
                      ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No insider activity in last 90 days</div>
            )}
          </>
        )}

        {/* Congress Tab Content */}
        {activeTab === 'congress' && (
          <>
            {hasCongressActivity ? (
              <>
                <div className="flex flex-wrap gap-4 md:gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-success" />
                    <span className="text-sm font-mono">
                      {congressBuyCount} buys
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-destructive" />
                    <span className="text-sm font-mono">
                      {congressSellCount} sells
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {congressTradesList.slice(0, 5).map((trade, idx) => (
                    <CongressTradeRow
                      key={`${trade.transactionDate}-${trade.politicianName}-${idx}`}
                      trade={trade}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No congressional trading activity found</div>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
});
