'use client';

import { MetricSection, type Metric } from './metric-section';
import type { StockDetailResponse, SectorMetric } from '@recon/shared';

interface FinancialHealthSectionProps {
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

export function FinancialHealthSection({ data }: FinancialHealthSectionProps) {
  const { company, financialHealth } = data;
  if (!financialHealth) return null;

  // Build metrics array - order determines display priority
  // For debt metrics, lower is generally better (higherIsBetter: false)
  const metrics: Metric[] = [
    toMetric('debtToEquity', 'Debt/Equity (TTM)', financialHealth.debtToEquity, {
      format: 'ratio',
      higherIsBetter: false, // Lower debt is better
      info: 'Debt-to-Equity ratio measures financial leverage. Lower ratios indicate less reliance on debt financing.',
      learnMoreUrl: 'https://www.investopedia.com/terms/d/debtequityratio.asp',
    }),
    toMetric('currentRatio', 'Current Ratio', financialHealth.currentRatio, {
      format: 'ratio',
      higherIsBetter: true, // Higher liquidity is better
      info: 'Current Ratio measures short-term liquidity. A ratio above 1 indicates the company can cover its short-term obligations.',
      learnMoreUrl: 'https://www.investopedia.com/terms/c/currentratio.asp',
    }),
    toMetric('assetTurnover', 'Asset Turnover', financialHealth.assetTurnover, {
      format: 'ratio',
      higherIsBetter: true, // Higher efficiency is better
      info: 'Asset Turnover measures how efficiently a company uses its assets to generate revenue. Higher values indicate better efficiency.',
      learnMoreUrl: 'https://www.investopedia.com/terms/a/assetturnover.asp',
    }),
  ];

  // Build share text
  const shareText = `${company.ticker} Financial Health: D/E ${financialHealth.debtToEquity?.value?.toFixed(2) ?? 'N/A'}, Current Ratio ${financialHealth.currentRatio?.value?.toFixed(2) ?? 'N/A'}x`;

  return (
    <MetricSection
      title="Balance Sheet"
      ticker={company.ticker}
      metrics={metrics}
      topN={5}
      shareText={shareText}
    />
  );
}
