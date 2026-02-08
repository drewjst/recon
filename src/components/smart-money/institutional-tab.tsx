'use client';

import { memo, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useInstitutionalDetail } from '@/hooks/use-institutional';
import { formatShares, formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { StockDetailResponse, InstitutionalHolder } from '@recon/shared';
import type {
  InstitutionalDetail,
  InstitutionalHolderDetail,
  InstitutionalSignal,
  HolderTypeBreakdown,
  OwnershipHistoryPoint,
} from '@/lib/api';
import { SocialLinks } from './social-links';

interface InstitutionalTabProps {
  data: StockDetailResponse;
}

// Fallback holder row for basic data
interface HolderRowProps {
  holder: InstitutionalHolder;
  type: 'buyer' | 'seller';
  showFullName?: boolean;
}

const HolderRow = memo(function HolderRow({
  holder,
  type,
  showFullName = false,
}: HolderRowProps) {
  const isBuyer = type === 'buyer';
  const Icon = isBuyer ? TrendingUp : TrendingDown;
  const colorClass = isBuyer ? 'text-success' : 'text-destructive';
  const sign = isBuyer ? '+' : '';

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon className={`h-4 w-4 flex-shrink-0 ${colorClass}`} />
        <span
          className={`text-sm ${showFullName ? '' : 'truncate max-w-[200px]'}`}
          title={holder.fundName}
        >
          {holder.fundName}
        </span>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className={`text-sm font-mono ${colorClass}`}>
          {sign}
          {holder.changePercent.toFixed(1)}%
        </span>
        <span className="text-sm font-mono text-muted-foreground w-16 text-right">
          {formatShares(holder.shares)}
        </span>
      </div>
    </div>
  );
});

// Ownership Trend Chart Component
function OwnershipTrendChart({ history }: { history: OwnershipHistoryPoint[] }) {
  const chartData = useMemo(() => {
    if (!history?.length) return [];
    return history.map((point) => ({
      date: point.date,
      ownership: point.ownershipPercent,
      holders: point.holderCount,
    }));
  }, [history]);

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        No historical data available
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            width={45}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-lg">
                  <p className="text-xs text-muted-foreground">{data.date}</p>
                  <p className="text-sm font-semibold">
                    {data.ownership.toFixed(1)}% ownership
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.holders.toLocaleString()} holders
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="ownership"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Holder Type Breakdown Chart Component
function HolderTypeChart({ breakdown }: { breakdown: HolderTypeBreakdown[] }) {
  const chartData = useMemo(() => {
    if (!breakdown?.length) return [];
    return breakdown.slice(0, 6).map((item, index) => ({
      name: item.holderType,
      ownership: item.ownershipPercent,
      count: item.investorCount,
      fill: getBarColor(index),
    }));
  }, [breakdown]);

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        No holder type data available
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            width={130}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-lg">
                  <p className="text-sm font-semibold">{data.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.ownership.toFixed(1)}% ({data.count} investors)
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="ownership" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function getBarColor(index: number): string {
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--primary) / 0.8)',
    'hsl(var(--primary) / 0.6)',
    'hsl(var(--primary) / 0.4)',
    'hsl(var(--muted-foreground) / 0.6)',
    'hsl(var(--muted-foreground) / 0.4)',
  ];
  return colors[index % colors.length];
}

// Top Holders Table Component
function TopHoldersTable({ holders }: { holders: InstitutionalHolderDetail[] }) {
  const safeHolders = holders ?? [];

  if (safeHolders.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No holder data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-4 font-medium">Holder</th>
            <th className="py-2 pr-4 font-medium text-right">Shares</th>
            <th className="py-2 pr-4 font-medium text-right">Value</th>
            <th className="py-2 pr-4 font-medium text-right">% Owned</th>
            <th className="py-2 font-medium text-right">QoQ Change</th>
          </tr>
        </thead>
        <tbody>
          {safeHolders.map((holder, index) => (
            <tr key={holder.cik || holder.name || index} className="border-b border-border/30">
              <td className="py-2.5 pr-2 text-muted-foreground">{holder.rank ?? index + 1}</td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate max-w-[180px]" title={holder.name}>
                    {holder.name}
                  </span>
                  {holder.isNew && (
                    <span className="text-xs px-1.5 py-0.5 bg-success/10 text-success rounded">
                      NEW
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2.5 pr-4 text-right font-mono">
                {formatShares(holder.shares)}
              </td>
              <td className="py-2.5 pr-4 text-right font-mono">
                {formatCurrency(holder.value)}
              </td>
              <td className="py-2.5 pr-4 text-right font-mono">
                {(holder.percentOwned ?? 0).toFixed(2)}%
              </td>
              <td className="py-2.5 text-right">
                <span
                  className={cn(
                    'font-mono',
                    (holder.changePercent ?? 0) > 0 && 'text-success',
                    (holder.changePercent ?? 0) < 0 && 'text-destructive'
                  )}
                >
                  {(holder.changePercent ?? 0) >= 0 ? '+' : ''}
                  {(holder.changePercent ?? 0).toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Recent Activity Grid Component
function RecentActivityGrid({
  newPositions,
  closedPositions,
  increases,
  decreases,
}: {
  newPositions: InstitutionalHolderDetail[];
  closedPositions: InstitutionalHolderDetail[];
  increases: InstitutionalHolderDetail[];
  decreases: InstitutionalHolderDetail[];
}) {
  // Ensure arrays are never null
  const safeNewPositions = newPositions ?? [];
  const safeClosedPositions = closedPositions ?? [];
  const safeIncreases = increases ?? [];
  const safeDecreases = decreases ?? [];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ActivityCard
        title="New Positions"
        icon={<ArrowUpRight className="h-4 w-4 text-success" />}
        items={safeNewPositions}
        emptyText="No new positions"
        valueFormatter={(h) => formatShares(h.shares)}
      />
      <ActivityCard
        title="Closed Positions"
        icon={<ArrowDownRight className="h-4 w-4 text-destructive" />}
        items={safeClosedPositions}
        emptyText="No closed positions"
        valueFormatter={(h) => formatShares(Math.abs(h.changeShares))}
      />
      <ActivityCard
        title="Biggest Increases"
        icon={<TrendingUp className="h-4 w-4 text-success" />}
        items={safeIncreases}
        emptyText="No significant increases"
        valueFormatter={(h) => `+${h.changePercent.toFixed(1)}%`}
        valueColorClass="text-success"
      />
      <ActivityCard
        title="Biggest Decreases"
        icon={<TrendingDown className="h-4 w-4 text-destructive" />}
        items={safeDecreases}
        emptyText="No significant decreases"
        valueFormatter={(h) => `${h.changePercent.toFixed(1)}%`}
        valueColorClass="text-destructive"
      />
    </div>
  );
}

function ActivityCard({
  title,
  icon,
  items,
  emptyText,
  valueFormatter,
  valueColorClass,
}: {
  title: string;
  icon: React.ReactNode;
  items: InstitutionalHolderDetail[];
  emptyText: string;
  valueFormatter: (h: InstitutionalHolderDetail) => string;
  valueColorClass?: string;
}) {
  const safeItems = items ?? [];

  return (
    <div className="bg-card/30 rounded-lg p-4">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h4>
      {safeItems.length > 0 ? (
        <div className="space-y-2">
          {safeItems.slice(0, 5).map((holder, index) => (
            <div
              key={holder.cik || holder.name || index}
              className="flex items-center justify-between text-sm"
            >
              <span className="truncate max-w-[160px]" title={holder.name}>
                {holder.name}
              </span>
              <span className={cn('font-mono', valueColorClass)}>
                {valueFormatter(holder)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

// Signals Card Component
function SignalsCard({ signals }: { signals: InstitutionalSignal[] }) {
  const safeSignals = signals ?? [];

  if (safeSignals.length === 0) {
    return null;
  }

  return (
    <div className="bg-card/30 rounded-lg p-4">
      <h4 className="text-sm font-semibold mb-3">Institutional Signals</h4>
      <div className="space-y-3">
        {safeSignals.map((signal, index) => (
          <div key={index} className="flex items-start gap-3">
            {signal.type === 'bullish' && (
              <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            )}
            {signal.type === 'bearish' && (
              <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            )}
            {signal.type === 'neutral' && (
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-medium">{signal.title}</p>
              <p className="text-xs text-muted-foreground">{signal.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Basic overview fallback (using stock detail data)
function BasicOwnershipOverview({ data }: { data: StockDetailResponse }) {
  const { holdings } = data;
  const sentiment = holdings?.sentiment;
  const topBuyers = holdings?.topBuyers || [];
  const topSellers = holdings?.topSellers || [];

  const hasOwnershipData = sentiment && sentiment.ownershipPercent > 0;
  const hasHolderCounts = sentiment && sentiment.investorsHolding > 0;

  if (!hasOwnershipData && !hasHolderCounts && topBuyers.length === 0 && topSellers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          No institutional ownership data available
        </div>
        <SocialLinks />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ownership Overview */}
      {(hasOwnershipData || hasHolderCounts) && sentiment && (
        <div>
          <h3 className="text-sm font-semibold mb-4">Ownership Overview</h3>

          {/* Ownership Bar */}
          {hasOwnershipData && (
            <div className="mb-4">
              <div className="h-3 rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full bg-success rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, sentiment.ownershipPercent)}%`,
                  }}
                />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold font-mono">
                  {sentiment.ownershipPercent.toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">
                  institutional ownership
                </span>
                {sentiment.ownershipPercentChange !== 0 && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span
                      className={`text-sm font-mono ${
                        sentiment.ownershipPercentChange >= 0
                          ? 'text-success'
                          : 'text-destructive'
                      }`}
                    >
                      {sentiment.ownershipPercentChange >= 0 ? '+' : ''}
                      {sentiment.ownershipPercentChange.toFixed(1)}% QoQ
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Holder Activity Breakdown */}
          {hasHolderCounts && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Holders:</span>
                <span className="font-mono font-medium">
                  {sentiment.investorsHolding}
                </span>
              </div>
              {sentiment.investorsIncreased > 0 && (
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="font-mono text-success">
                    {sentiment.investorsIncreased}
                  </span>
                  <span className="text-muted-foreground">increased</span>
                </div>
              )}
              {sentiment.investorsDecreased > 0 && (
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="font-mono text-destructive">
                    {sentiment.investorsDecreased}
                  </span>
                  <span className="text-muted-foreground">decreased</span>
                </div>
              )}
              {sentiment.investorsHeld > 0 && (
                <div className="flex items-center gap-1.5">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono">{sentiment.investorsHeld}</span>
                  <span className="text-muted-foreground">held</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Buyers / Sellers Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Buyers */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            Top Buyers (QoQ)
          </h3>
          {topBuyers.length > 0 ? (
            <div className="bg-card/30 rounded-lg p-3">
              {topBuyers.map((holder) => (
                <HolderRow
                  key={holder.fundCik || holder.fundName}
                  holder={holder}
                  type="buyer"
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground bg-card/30 rounded-lg p-4">
              No significant buyers this quarter
            </div>
          )}
        </div>

        {/* Top Sellers */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Top Sellers (QoQ)
          </h3>
          {topSellers.length > 0 ? (
            <div className="bg-card/30 rounded-lg p-3">
              {topSellers.map((holder) => (
                <HolderRow
                  key={holder.fundCik || holder.fundName}
                  holder={holder}
                  type="seller"
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground bg-card/30 rounded-lg p-4">
              No significant sellers this quarter
            </div>
          )}
        </div>
      </div>

      <SocialLinks />
    </div>
  );
}

// Enhanced Institutional Tab with detailed data
function EnhancedInstitutionalView({ detail }: { detail: InstitutionalDetail }) {
  // Safely access arrays with fallbacks to empty arrays
  const ownershipHistory = detail.ownershipHistory ?? [];
  const holderTypeBreakdown = detail.holderTypeBreakdown ?? [];
  const topHolders = detail.topHolders ?? [];
  const newPositions = detail.newPositions ?? [];
  const closedPositions = detail.closedPositions ?? [];
  const biggestIncreases = detail.biggestIncreases ?? [];
  const biggestDecreases = detail.biggestDecreases ?? [];
  const signals = detail.signals ?? [];

  return (
    <div className="space-y-8">
      {/* Ownership Overview */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Ownership Overview</h3>
        <div className="mb-4">
          <div className="h-3 rounded-full overflow-hidden bg-muted">
            <div
              className="h-full bg-success rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, detail.ownershipPercent ?? 0)}%`,
              }}
            />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono">
              {(detail.ownershipPercent ?? 0).toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">
              institutional ownership
            </span>
            {(detail.ownershipPercentChange ?? 0) !== 0 && (
              <>
                <span className="text-muted-foreground">·</span>
                <span
                  className={cn(
                    'text-sm font-mono',
                    (detail.ownershipPercentChange ?? 0) >= 0 ? 'text-success' : 'text-destructive'
                  )}
                >
                  {(detail.ownershipPercentChange ?? 0) >= 0 ? '+' : ''}
                  {(detail.ownershipPercentChange ?? 0).toFixed(1)}% QoQ
                </span>
              </>
            )}
          </div>
        </div>

        {/* Holder Stats */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total Holders:</span>
            <span className="font-mono font-medium">{detail.totalHolders ?? 0}</span>
          </div>
          {(detail.holdersIncreased ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="font-mono text-success">{detail.holdersIncreased}</span>
              <span className="text-muted-foreground">increased</span>
            </div>
          )}
          {(detail.holdersDecreased ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="font-mono text-destructive">{detail.holdersDecreased}</span>
              <span className="text-muted-foreground">decreased</span>
            </div>
          )}
          {(detail.holdersNew ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              <span className="font-mono text-primary">{detail.holdersNew}</span>
              <span className="text-muted-foreground">new</span>
            </div>
          )}
        </div>
      </div>

      {/* Signals */}
      {signals.length > 0 && <SignalsCard signals={signals} />}

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Ownership Trend (2 Years)</h3>
          <div className="bg-card/30 rounded-lg p-4">
            <OwnershipTrendChart history={ownershipHistory} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Holder Type Breakdown</h3>
          <div className="bg-card/30 rounded-lg p-4">
            <HolderTypeChart breakdown={holderTypeBreakdown} />
          </div>
        </div>
      </div>

      {/* Top Holders Table */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Top 10 Holders</h3>
        <div className="bg-card/30 rounded-lg p-4">
          <TopHoldersTable holders={topHolders} />
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
        <RecentActivityGrid
          newPositions={newPositions}
          closedPositions={closedPositions}
          increases={biggestIncreases}
          decreases={biggestDecreases}
        />
      </div>

      <SocialLinks />
    </div>
  );
}

export const InstitutionalTab = memo(function InstitutionalTab({
  data,
}: InstitutionalTabProps) {
  const ticker = data.company.ticker;
  const { data: detail, isLoading, error } = useInstitutionalDetail(ticker);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 pt-4 animate-pulse">
        <div className="h-24 bg-muted rounded" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-48 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
        </div>
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  // If detailed data is available, show enhanced view
  if (detail && !error) {
    return (
      <div className="pt-4">
        <EnhancedInstitutionalView detail={detail} />
      </div>
    );
  }

  // Fall back to basic view using stock detail data
  return (
    <div className="pt-4">
      <BasicOwnershipOverview data={data} />
    </div>
  );
});
