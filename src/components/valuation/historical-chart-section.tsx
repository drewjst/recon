'use client';

import { memo, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { SectionCard } from '@/components/dashboard/sections/section-card';
import { cn } from '@/lib/utils';
import type { ValuationDeepDive, HistoricalValuationPoint } from '@recon/shared';

type MetricKey = 'pe' | 'evToEbitda' | 'ps' | 'priceToFcf';
type TimeframeKey = '1Y' | '3Y' | '5Y' | '10Y';

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: 'pe', label: 'P/E' },
  { key: 'evToEbitda', label: 'EV/EBITDA' },
  { key: 'ps', label: 'P/S' },
  { key: 'priceToFcf', label: 'P/FCF' },
];

const TIMEFRAME_OPTIONS: { key: TimeframeKey; label: string; quarters: number }[] = [
  { key: '1Y', label: '1Y', quarters: 4 },
  { key: '3Y', label: '3Y', quarters: 12 },
  { key: '5Y', label: '5Y', quarters: 20 },
  { key: '10Y', label: '10Y', quarters: 40 },
];

interface HistoricalChartSectionProps {
  data: ValuationDeepDive;
}

interface ChartDataPoint {
  date: string;
  value: number;
  displayDate: string;
}

interface ChartStats {
  min: number;
  max: number;
  avg: number;
  stdDev: number;
  current: number;
  percentile: number;
}

function HistoricalChartSectionComponent({ data }: HistoricalChartSectionProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('pe');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeKey>('5Y');

  const { historicalContext } = data;

  // Process data based on selected metric and timeframe
  const { chartData, stats } = useMemo(() => {
    if (!historicalContext?.history?.length) {
      return { chartData: [], stats: null };
    }

    const timeframeConfig = TIMEFRAME_OPTIONS.find((t) => t.key === selectedTimeframe);
    const quartersToShow = timeframeConfig?.quarters ?? 20;

    // Filter to requested timeframe (history is ordered newest to oldest)
    const filteredHistory = historicalContext.history.slice(0, quartersToShow);

    // Extract values for selected metric and filter out invalid values
    const chartPoints: ChartDataPoint[] = [];
    const values: number[] = [];

    // Reverse to show chronological order (oldest to newest)
    [...filteredHistory].reverse().forEach((point: HistoricalValuationPoint) => {
      const value = point[selectedMetric];
      if (value && value > 0 && isFinite(value)) {
        values.push(value);
        chartPoints.push({
          date: point.date,
          value,
          displayDate: formatDate(point.date),
        });
      }
    });

    if (values.length === 0) {
      return { chartData: [], stats: null };
    }

    // Calculate statistics
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;

    // Calculate standard deviation
    const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, v) => acc + v, 0) / values.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    // Current value is the last point
    const current = values[values.length - 1];

    // Calculate percentile
    const percentile = max > min ? ((current - min) / (max - min)) * 100 : 50;

    const calculatedStats: ChartStats = {
      min,
      max,
      avg,
      stdDev,
      current,
      percentile: Math.max(0, Math.min(100, percentile)),
    };

    return { chartData: chartPoints, stats: calculatedStats };
  }, [historicalContext, selectedMetric, selectedTimeframe]);

  if (!historicalContext?.history?.length) {
    return (
      <SectionCard title="Historical Valuation">
        <p className="text-sm text-muted-foreground">
          Historical valuation data not available for this stock.
        </p>
      </SectionCard>
    );
  }

  const metricLabel = METRIC_OPTIONS.find((m) => m.key === selectedMetric)?.label ?? 'P/E';

  return (
    <SectionCard
      title="Historical Valuation"
      headerRight={
        <div className="flex items-center gap-4">
          <MetricSelector selected={selectedMetric} onChange={setSelectedMetric} />
          <TimeframeSelector selected={selectedTimeframe} onChange={setSelectedTimeframe} />
        </div>
      }
    >
      <div className="space-y-4">
        {chartData.length > 0 && stats ? (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(v) => v.toFixed(1)}
                    width={45}
                  />
                  <Tooltip content={<CustomTooltip metricLabel={metricLabel} />} />

                  {/* Standard deviation band */}
                  <ReferenceArea
                    y1={Math.max(0, stats.avg - stats.stdDev)}
                    y2={stats.avg + stats.stdDev}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    strokeOpacity={0}
                  />

                  {/* Average line */}
                  <ReferenceLine
                    y={stats.avg}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    label={{
                      value: `Avg: ${stats.avg.toFixed(1)}x`,
                      position: 'right',
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 11,
                    }}
                  />

                  {/* Main line */}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: 'hsl(var(--primary))',
                      stroke: 'hsl(var(--background))',
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <StatsBar stats={stats} metricLabel={metricLabel} />
          </>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No {metricLabel} data available for the selected timeframe.
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

interface MetricSelectorProps {
  selected: MetricKey;
  onChange: (metric: MetricKey) => void;
}

function MetricSelector({ selected, onChange }: MetricSelectorProps) {
  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value as MetricKey)}
      className="text-xs px-2 py-1 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {METRIC_OPTIONS.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface TimeframeSelectorProps {
  selected: TimeframeKey;
  onChange: (timeframe: TimeframeKey) => void;
}

function TimeframeSelector({ selected, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex gap-1">
      {TIMEFRAME_OPTIONS.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            'px-2 py-0.5 text-xs rounded-md transition-colors',
            selected === option.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
  metricLabel: string;
}

function CustomTooltip({ active, payload, metricLabel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0];
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{data.payload.date}</p>
      <p className="text-sm font-semibold">
        {metricLabel}: {data.value.toFixed(2)}x
      </p>
    </div>
  );
}

interface StatsBarProps {
  stats: ChartStats;
  metricLabel: string;
}

function StatsBar({ stats, metricLabel }: StatsBarProps) {
  const getSentiment = (percentile: number): 'cheap' | 'fair' | 'expensive' => {
    if (percentile <= 30) return 'cheap';
    if (percentile >= 70) return 'expensive';
    return 'fair';
  };

  const sentiment = getSentiment(stats.percentile);

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/30 border border-border/30">
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Range</div>
          <div className="text-sm font-mono">
            {stats.min.toFixed(1)}x - {stats.max.toFixed(1)}x
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Average</div>
          <div className="text-sm font-mono">{stats.avg.toFixed(1)}x</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Current</div>
          <div className="text-sm font-mono font-semibold">{stats.current.toFixed(1)}x</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Percentile</div>
          <div className="text-sm font-mono">{stats.percentile.toFixed(0)}%</div>
        </div>
        <PercentileIndicator percentile={stats.percentile} sentiment={sentiment} />
      </div>
    </div>
  );
}

interface PercentileIndicatorProps {
  percentile: number;
  sentiment: 'cheap' | 'fair' | 'expensive';
}

function PercentileIndicator({ percentile, sentiment }: PercentileIndicatorProps) {
  const getColorClass = (): string => {
    switch (sentiment) {
      case 'cheap':
        return 'bg-success';
      case 'expensive':
        return 'bg-destructive';
      default:
        return 'bg-warning';
    }
  };

  return (
    <div className="w-24 h-2 rounded-full bg-gradient-to-r from-success via-warning to-destructive relative">
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background shadow-md',
          getColorClass()
        )}
        style={{ left: `calc(${Math.min(100, Math.max(0, percentile))}% - 6px)` }}
      />
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${month} '${year}`;
}

export const HistoricalChartSection = memo(HistoricalChartSectionComponent);
