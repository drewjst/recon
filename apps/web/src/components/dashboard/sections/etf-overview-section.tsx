'use client';

import { memo } from 'react';
import { SectionCard } from './section-card';
import { Card } from '@/components/ui/card';
import type { StockDetailResponse } from '@recon/shared';

interface ETFOverviewSectionProps {
  data: StockDetailResponse;
}

function formatAUM(aum: number): string {
  if (!aum || aum === 0) return 'N/A';
  if (aum >= 1e12) return `$${(aum / 1e12).toFixed(2)}T`;
  if (aum >= 1e9) return `$${(aum / 1e9).toFixed(1)}B`;
  if (aum >= 1e6) return `$${(aum / 1e6).toFixed(0)}M`;
  return `$${aum.toLocaleString()}`;
}

function formatVolume(volume: number): string {
  if (!volume || volume === 0) return 'N/A';
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(0)}K`;
  return volume.toLocaleString();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function formatNAV(nav: number): string {
  if (!nav || nav === 0) return 'N/A';
  return `$${nav.toFixed(2)}`;
}

function formatBeta(beta: number): string {
  if (!beta && beta !== 0) return 'N/A';
  return beta.toFixed(2);
}

function getExpenseRatioAssessment(ratio: number): string {
  if (ratio <= 0.1) return 'Very Low';
  if (ratio <= 0.3) return 'Low';
  if (ratio <= 0.75) return 'Moderate';
  return 'High';
}

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
}

function MetricCard({ label, value, description }: MetricCardProps) {
  return (
    <Card className="p-4 text-center">
      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
        {label}
      </div>
      <div className="text-2xl font-bold font-mono mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </Card>
  );
}

function ETFOverviewSectionComponent({ data }: ETFOverviewSectionProps) {
  const { etfData } = data;
  if (!etfData) return null;

  // Row 1: Expense Ratio | Market Cap | NAV | Inception
  const row1Metrics = [
    {
      label: 'Expense Ratio',
      value: etfData.expenseRatio ? `${etfData.expenseRatio.toFixed(2)}%` : 'N/A',
      description: etfData.expenseRatio ? getExpenseRatioAssessment(etfData.expenseRatio) : '',
    },
    {
      label: 'Market Cap',
      value: formatAUM(etfData.aum),
      description: 'Fund Size',
    },
    {
      label: 'NAV',
      value: formatNAV(etfData.nav),
      description: 'Net Asset Value',
    },
    {
      label: 'Inception',
      value: formatDate(etfData.inceptionDate),
      description: 'Fund Start',
    },
  ];

  // Row 2: Volume | Beta | Holdings | Domicile
  const row2Metrics = [
    {
      label: 'Volume',
      value: formatVolume(etfData.avgVolume),
      description: 'Avg Daily',
    },
    {
      label: 'Beta',
      value: formatBeta(etfData.beta),
      description: 'vs Market',
    },
    {
      label: 'Holdings',
      value: etfData.holdingsCount ? etfData.holdingsCount.toString() : 'N/A',
      description: 'Positions',
    },
    {
      label: 'Domicile',
      value: etfData.domicile || 'N/A',
      description: 'Country',
    },
  ];

  return (
    <SectionCard title="Fund Overview">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {row1Metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              description={metric.description}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {row2Metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              description={metric.description}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

export const ETFOverviewSection = memo(ETFOverviewSectionComponent);
