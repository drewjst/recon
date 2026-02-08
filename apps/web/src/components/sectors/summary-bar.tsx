import type { SectorSummary } from '@/lib/api';
import { formatMarketCap } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SummaryBarProps {
  summary: SectorSummary;
  stockCount: number;
}

function formatPct(value: number | null): string {
  if (value == null) return '--';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function pctColor(value: number | null): string {
  if (value == null) return 'text-muted-foreground';
  if (value > 0) return 'text-positive';
  if (value < 0) return 'text-negative';
  return 'text-muted-foreground';
}

function formatMultiple(value: number | null): string {
  if (value == null) return '--';
  return value.toFixed(1) + 'x';
}

function BreadthBar({ label, value }: { label: string; value: number | null }) {
  const pct = value ?? 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-8 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 60 ? 'bg-positive' : pct >= 40 ? 'bg-yellow-500' : 'bg-negative'
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="tabular-nums font-medium w-9 text-right">
        {value != null ? `${Math.round(pct)}%` : '--'}
      </span>
    </div>
  );
}

function StatCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card px-3 py-2.5', className)}>
      {children}
    </div>
  );
}

function StatItem({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn('text-sm font-semibold tabular-nums mt-0.5', className)}>
        {value}
        {sub && <span className="text-[10px] font-normal text-muted-foreground ml-1">{sub}</span>}
      </div>
    </div>
  );
}

export function SummaryBar({ summary, stockCount }: SummaryBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {/* Overview */}
      <StatCard>
        <div className="flex items-baseline justify-between gap-3">
          <StatItem label="Stocks" value={stockCount.toString()} />
          <StatItem
            label="Mkt Cap"
            value={summary.totalMarketCap != null ? formatMarketCap(summary.totalMarketCap) : '--'}
          />
        </div>
      </StatCard>

      {/* Valuation */}
      <StatCard>
        <div className="flex items-baseline justify-between gap-3">
          <StatItem
            label="P/S"
            value={formatMultiple(summary.medianPs)}
            sub={summary.avgPs != null ? `avg ${formatMultiple(summary.avgPs)}` : undefined}
          />
          <StatItem
            label="P/E"
            value={formatMultiple(summary.medianPe)}
            sub={summary.avgPe != null ? `avg ${formatMultiple(summary.avgPe)}` : undefined}
          />
        </div>
      </StatCard>

      {/* Quality */}
      <StatCard>
        <div className="flex items-baseline justify-between gap-3">
          <StatItem
            label="ROIC"
            value={summary.avgRoic != null ? summary.avgRoic.toFixed(1) + '%' : '--'}
          />
          <StatItem
            label="52W Hi"
            value={formatPct(summary.medianFrom52wHigh)}
            className={pctColor(summary.medianFrom52wHigh)}
          />
        </div>
      </StatCard>

      {/* Performance */}
      <StatCard>
        <div className="flex items-baseline justify-between gap-3">
          <StatItem label="1M" value={formatPct(summary.median1m)} className={pctColor(summary.median1m)} />
          <StatItem label="YTD" value={formatPct(summary.medianYtd)} className={pctColor(summary.medianYtd)} />
          <StatItem label="1Y" value={formatPct(summary.median1y)} className={pctColor(summary.median1y)} />
        </div>
      </StatCard>

      {/* SMA Breadth */}
      <StatCard>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Breadth</div>
        <div className="space-y-1">
          <BreadthBar label="20d" value={summary.pctAboveSma20} />
          <BreadthBar label="50d" value={summary.pctAboveSma50} />
          <BreadthBar label="200d" value={summary.pctAboveSma200} />
        </div>
      </StatCard>
    </div>
  );
}
