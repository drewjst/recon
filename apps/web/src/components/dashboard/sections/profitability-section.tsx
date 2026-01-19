'use client';

import { MetricSection, type Metric } from './metric-section';
import type { StockDetailResponse, SectorMetric } from '@recon/shared';

interface ProfitabilitySectionProps {
  data: StockDetailResponse;
}

/**
 * Helper to convert SectorMetric to Metric format
 */
function toMetric(
  key: string,
  label: string,
  sm: SectorMetric | undefined,
  options: {
    format: Metric['format'];
    higherIsBetter: boolean;
    info?: string;
    learnMoreUrl?: string;
  }
): Metric {
  return {
    key,
    label,
    value: sm?.value ?? null,
    industryAverage: sm?.sectorMedian ?? null,
    percentile: sm?.percentile ?? null,
    format: options.format,
    higherIsBetter: options.higherIsBetter,
    info: options.info,
    learnMoreUrl: options.learnMoreUrl,
  };
}

export function ProfitabilitySection({ data }: ProfitabilitySectionProps) {
  const { company, profitability } = data;
  if (!profitability) return null;

  // Build metrics array - order determines display priority
  // Top metrics: Gross Margin, Operating Margin, Net Margin, ROE, ROIC
  const metrics: Metric[] = [];

  // Add Gross Margin if available
  if (profitability.grossMargin) {
    metrics.push(
      toMetric('grossMargin', 'Gross Margin', profitability.grossMargin, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Gross Margin shows the percentage of revenue remaining after deducting cost of goods sold. Higher margins indicate better production efficiency.',
        learnMoreUrl: 'https://www.investopedia.com/terms/g/grossmargin.asp',
      })
    );
  }

  metrics.push(
    toMetric('operatingMargin', 'Operating Margin', profitability.operatingMargin, {
      format: 'percent',
      higherIsBetter: true,
      info: 'Operating Margin shows what percentage of revenue remains after covering operating expenses. Higher margins indicate better operational efficiency.',
      learnMoreUrl: 'https://www.investopedia.com/terms/o/operatingmargin.asp',
    })
  );

  // Add Net Margin if available
  if (profitability.netMargin) {
    metrics.push(
      toMetric('netMargin', 'Net Margin', profitability.netMargin, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Net Margin shows the percentage of revenue that becomes profit after all expenses. Higher margins indicate better overall profitability.',
        learnMoreUrl: 'https://www.investopedia.com/terms/n/net_margin.asp',
      })
    );
  }

  metrics.push(
    toMetric('roe', 'ROE (TTM)', profitability.roe, {
      format: 'percent',
      higherIsBetter: true,
      info: "Return on Equity measures how effectively a company uses shareholders' equity to generate profits. Higher ROE indicates more efficient use of equity capital.",
      learnMoreUrl: 'https://www.investopedia.com/terms/r/returnonequity.asp',
    }),
    toMetric('roic', 'ROIC (TTM)', profitability.roic, {
      format: 'percent',
      higherIsBetter: true,
      info: 'Return on Invested Capital measures how efficiently a company uses its capital to generate profits. Higher ROIC indicates better capital allocation.',
      learnMoreUrl: 'https://www.investopedia.com/terms/r/returnoninvestmentcapital.asp',
    })
  );

  // Build share text
  const shareText = `${company.ticker} Profitability: Gross Margin ${profitability.grossMargin?.value?.toFixed(1) ?? 'N/A'}%, Operating Margin ${profitability.operatingMargin?.value?.toFixed(1) ?? 'N/A'}%, ROE ${profitability.roe?.value?.toFixed(1) ?? 'N/A'}%`;

  return (
    <MetricSection
      title="Margins & Returns"
      ticker={company.ticker}
      metrics={metrics}
      topN={5}
      shareText={shareText}
    />
  );
}
