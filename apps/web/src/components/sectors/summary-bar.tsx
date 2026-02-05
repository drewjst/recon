import type { SectorSummary } from '@/lib/api';

interface SummaryBarProps {
  summary: SectorSummary;
  stockCount: number;
}

function formatSummaryPercent(value: number | null): string {
  if (value == null) return '--';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function SummaryBar({ summary, stockCount }: SummaryBarProps) {
  const items = [
    { label: 'Stocks', value: stockCount.toString() },
    { label: 'Avg P/S', value: summary.avgPs != null ? summary.avgPs.toFixed(1) + 'x' : '--' },
    { label: 'Avg P/E', value: summary.avgPe != null ? summary.avgPe.toFixed(1) + 'x' : '--' },
    { label: 'Med YTD', value: formatSummaryPercent(summary.medianYtd) },
    { label: 'Med 1Y', value: formatSummaryPercent(summary.median1y) },
  ];

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4 px-1 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{item.label}:</span>
          <span className="font-medium tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
