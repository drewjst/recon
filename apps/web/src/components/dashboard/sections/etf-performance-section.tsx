'use client';

import { memo } from 'react';
import { SectionCard } from './section-card';
import { Card } from '@/components/ui/card';
import type { StockDetailResponse } from '@recon/shared';

interface ETFPerformanceSectionProps {
  data: StockDetailResponse;
}

function formatReturn(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  const formatted = value.toFixed(2);
  return value >= 0 ? `+${formatted}%` : `${formatted}%`;
}

function getReturnColor(value: number | undefined): string {
  if (value === undefined || value === null) return 'text-muted-foreground';
  return value >= 0 ? 'text-positive' : 'text-negative';
}

interface PerformanceMetricProps {
  label: string;
  value: number | undefined;
}

function PerformanceMetric({ label, value }: PerformanceMetricProps) {
  return (
    <Card className="p-4 text-center">
      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono ${getReturnColor(value)}`}>
        {formatReturn(value)}
      </div>
    </Card>
  );
}

function ETFPerformanceSectionComponent({ data }: ETFPerformanceSectionProps) {
  const performance = data.etfData?.performance;
  if (!performance) return null;

  const metrics = [
    { label: 'YTD', value: performance.ytd },
    { label: '1 Year', value: performance.y1 },
    { label: '3 Year', value: performance.y3 },
    { label: '5 Year', value: performance.y5 },
  ];

  // Only add 10Y if available
  if (performance.y10 !== undefined && performance.y10 !== 0) {
    metrics.push({ label: '10 Year', value: performance.y10 });
  }

  return (
    <SectionCard title="Performance">
      <div className={`grid gap-4 ${metrics.length === 5 ? 'grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
        {metrics.map((metric) => (
          <PerformanceMetric
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>
    </SectionCard>
  );
}

export const ETFPerformanceSection = memo(ETFPerformanceSectionComponent);
