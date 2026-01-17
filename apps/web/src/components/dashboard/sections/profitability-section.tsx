'use client';

import { SectionCard } from './section-card';
import { SectorMetricRow, type SectorMetricConfig } from './sector-metric-row';
import type { StockDetailResponse } from '@recon/shared';

interface ProfitabilitySectionProps {
  data: StockDetailResponse;
}

export function ProfitabilitySection({ data }: ProfitabilitySectionProps) {
  const { company, profitability } = data;
  if (!profitability) return null;

  const metrics: SectorMetricConfig[] = [
    {
      label: 'ROIC',
      metric: profitability.roic,
      formatValue: (v) => `${v.toFixed(1)}%`,
      info: 'Return on Invested Capital measures how efficiently a company uses its capital to generate profits. Higher ROIC indicates better capital allocation.',
      learnMoreUrl: 'https://www.investopedia.com/terms/r/returnoninvestmentcapital.asp',
    },
    {
      label: 'ROE',
      metric: profitability.roe,
      formatValue: (v) => `${v.toFixed(1)}%`,
      info: "Return on Equity measures how effectively a company uses shareholders' equity to generate profits. Higher ROE indicates more efficient use of equity capital.",
      learnMoreUrl: 'https://www.investopedia.com/terms/r/returnonequity.asp',
    },
    {
      label: 'Operating Margin',
      metric: profitability.operatingMargin,
      formatValue: (v) => `${v.toFixed(1)}%`,
      info: 'Operating Margin shows what percentage of revenue remains after covering operating expenses. Higher margins indicate better operational efficiency.',
      learnMoreUrl: 'https://www.investopedia.com/terms/o/operatingmargin.asp',
    },
  ];

  // Filter out null metrics
  const validMetrics = metrics.filter((m) => m.metric !== null && m.metric !== undefined);

  const shareText = `${company.ticker} Profitability: ROIC ${profitability.roic?.value.toFixed(1) ?? 'N/A'}%, ROE ${profitability.roe?.value.toFixed(1) ?? 'N/A'}%, Operating Margin ${profitability.operatingMargin?.value.toFixed(1) ?? 'N/A'}%`;

  return (
    <SectionCard title="Profitability" shareTicker={company.ticker} shareText={shareText}>
      {validMetrics.length === 0 ? (
        <p className="text-sm text-muted-foreground">Profitability data not available.</p>
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
