'use client';

import { SectionCard } from './section-card';
import { Card } from '@/components/ui/card';
import type { StockDetailResponse } from '@recon/shared';

interface GrowthSectionProps {
  data: StockDetailResponse;
}

interface MetricBoxProps {
  title: string;
  value: string;
  subtitle?: string;
  positive?: boolean;
}

function MetricBox({ title, value, subtitle, positive }: MetricBoxProps) {
  return (
    <Card className="p-4 transition-all duration-300">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{title}</div>
      <div className={`text-lg font-semibold font-mono ${positive !== undefined ? (positive ? 'text-success' : 'text-destructive') : ''}`}>
        {value}
      </div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </Card>
  );
}

export function GrowthSection({ data }: GrowthSectionProps) {
  const { financials } = data;

  const revenueGrowth = financials.revenueGrowthYoY;
  const grossMargin = financials.grossMargin;
  const fcfMargin = financials.fcfMargin;
  const roe = financials.roe;

  return (
    <SectionCard title="Growth & Profitability">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox
          title="Revenue Growth"
          value={`${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}% YoY`}
          positive={revenueGrowth >= 0}
        />
        <MetricBox
          title="Gross Margin"
          value={`${grossMargin.toFixed(1)}%`}
        />
        <MetricBox
          title="FCF Margin"
          value={`${fcfMargin.toFixed(1)}%`}
        />
        <MetricBox
          title="ROE"
          value={`${roe.toFixed(1)}%`}
          positive={roe >= 15}
        />
      </div>
    </SectionCard>
  );
}
