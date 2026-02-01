'use client';

import { memo } from 'react';
import { SectionCard } from './section-card';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatShares, formatMonthYear, formatPrice, formatDecimal } from '@/lib/formatters';
import type { StockDetailResponse } from '@recon/shared';

interface ETFOverviewSectionProps {
  data: StockDetailResponse;
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
    <Card className="p-3 text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className="text-lg font-bold font-mono mb-0.5">{value}</div>
      <div className="text-[10px] text-muted-foreground">{description}</div>
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
      value: etfData.expenseRatio ? `${etfData.expenseRatio.toFixed(2)}%` : '--',
      description: etfData.expenseRatio ? getExpenseRatioAssessment(etfData.expenseRatio) : '',
    },
    {
      label: 'Market Cap',
      value: formatCurrency(etfData.aum),
      description: 'Fund Size',
    },
    {
      label: 'NAV',
      value: formatPrice(etfData.nav),
      description: 'Net Asset Value',
    },
    {
      label: 'Inception',
      value: formatMonthYear(etfData.inceptionDate),
      description: 'Fund Start',
    },
  ];

  // Row 2: Volume | Beta | Holdings | Domicile
  const row2Metrics = [
    {
      label: 'Volume',
      value: formatShares(etfData.avgVolume),
      description: 'Avg Daily',
    },
    {
      label: 'Beta',
      value: formatDecimal(etfData.beta),
      description: 'vs Market',
    },
    {
      label: 'Holdings',
      value: etfData.holdingsCount ? etfData.holdingsCount.toString() : '--',
      description: 'Positions',
    },
    {
      label: 'Domicile',
      value: etfData.domicile || '--',
      description: 'Country',
    },
  ];

  return (
    <SectionCard title="Fund Overview">
      <div className="grid grid-cols-2 gap-2">
        {[...row1Metrics, ...row2Metrics].map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            description={metric.description}
          />
        ))}
      </div>
    </SectionCard>
  );
}

export const ETFOverviewSection = memo(ETFOverviewSectionComponent);
