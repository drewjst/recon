'use client';

import { SectionCard } from './section-card';
import { SectorMetricRow, type SectorMetricConfig } from './sector-metric-row';
import type { StockDetailResponse } from '@recon/shared';

interface FinancialHealthSectionProps {
  data: StockDetailResponse;
}

export function FinancialHealthSection({ data }: FinancialHealthSectionProps) {
  const { company, financialHealth } = data;
  if (!financialHealth) return null;

  const metrics: SectorMetricConfig[] = [
    {
      label: 'Debt/Equity',
      metric: financialHealth.debtToEquity,
      formatValue: (v) => v.toFixed(2),
      invertedScale: true, // Lower is better
    },
    {
      label: 'Current Ratio',
      metric: financialHealth.currentRatio,
      formatValue: (v) => `${v.toFixed(2)}x`,
    },
    {
      label: 'Asset Turnover',
      metric: financialHealth.assetTurnover,
      formatValue: (v) => `${v.toFixed(2)}x`,
    },
  ];

  // Filter out null metrics
  const validMetrics = metrics.filter((m) => m.metric !== null && m.metric !== undefined);

  const shareText = `${company.ticker} Financial Health: D/E ${financialHealth.debtToEquity?.value.toFixed(2) ?? 'N/A'}, Current Ratio ${financialHealth.currentRatio?.value.toFixed(2) ?? 'N/A'}x`;

  return (
    <SectionCard title="Financial Health" shareTicker={company.ticker} shareText={shareText}>
      {validMetrics.length === 0 ? (
        <p className="text-sm text-muted-foreground">Financial health data not available.</p>
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
