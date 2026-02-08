'use client';

import { memo } from 'react';
import { SectionCard } from './section-card';
import type { StockDetailResponse } from '@recon/shared';

interface ETFMarketCapSectionProps {
  data: StockDetailResponse;
}

interface CapBreakdownRowProps {
  label: string;
  value: number;
  color: string;
}

function CapBreakdownRow({ label, value, color }: CapBreakdownRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-sm text-muted-foreground">{label}</div>
      <div className="flex-1">
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </div>
      <div className="w-16 text-right font-mono text-sm">
        {value.toFixed(1)}%
      </div>
    </div>
  );
}

function ETFMarketCapSectionComponent({ data }: ETFMarketCapSectionProps) {
  const marketCap = data.etfData?.marketCapBreakdown;
  if (!marketCap) return null;

  const breakdown = [
    { label: 'Mega', value: marketCap.mega, color: 'bg-blue-600' },
    { label: 'Big', value: marketCap.big, color: 'bg-blue-500' },
    { label: 'Medium', value: marketCap.medium, color: 'bg-blue-400' },
    { label: 'Small', value: marketCap.small, color: 'bg-blue-300' },
    { label: 'Micro', value: marketCap.micro, color: 'bg-blue-200' },
  ].filter(item => item.value > 0);

  if (breakdown.length === 0) return null;

  return (
    <SectionCard title="Market Cap Breakdown">
      <div className="space-y-3">
        {breakdown.map((item) => (
          <CapBreakdownRow
            key={item.label}
            label={item.label}
            value={item.value}
            color={item.color}
          />
        ))}
      </div>
    </SectionCard>
  );
}

export const ETFMarketCapSection = memo(ETFMarketCapSectionComponent);
