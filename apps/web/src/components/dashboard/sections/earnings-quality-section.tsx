'use client';

import { SectionCard } from './section-card';
import { SectorMetricRow, type SectorMetricConfig } from './sector-metric-row';
import type { StockDetailResponse } from '@recon/shared';

interface EarningsQualitySectionProps {
  data: StockDetailResponse;
}

export function EarningsQualitySection({ data }: EarningsQualitySectionProps) {
  const { earningsQuality } = data;
  if (!earningsQuality) return null;

  const metrics: SectorMetricConfig[] = [
    {
      label: 'Accrual Ratio',
      metric: earningsQuality.accrualRatio,
      formatValue: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
      invertedScale: true, // Lower is better (more cash-based earnings)
    },
    {
      label: 'Buyback Yield',
      metric: earningsQuality.buybackYield,
      formatValue: (v) => `${v.toFixed(2)}%`,
    },
  ];

  // Filter out null metrics
  const validMetrics = metrics.filter((m) => m.metric !== null && m.metric !== undefined);

  return (
    <SectionCard title="Earnings Quality">
      {validMetrics.length === 0 ? (
        <p className="text-sm text-muted-foreground">Earnings quality data not available.</p>
      ) : (
        <div>
          {validMetrics.map((config) => (
            <SectorMetricRow key={config.label} {...config} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
