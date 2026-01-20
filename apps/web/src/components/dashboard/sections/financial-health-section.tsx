'use client';

import { MetricSection, type Metric } from './metric-section';
import { toMetric, buildShareText } from '@/lib/metric-helpers';
import type { StockDetailResponse } from '@recon/shared';

interface FinancialHealthSectionProps {
  data: StockDetailResponse;
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
  const shareText = buildShareText(company.ticker, 'Balance Sheet', [
    { label: 'Debt/Equity', value: financialHealth.debtToEquity?.value != null ? `${financialHealth.debtToEquity.value.toFixed(2)}x` : null },
    { label: 'Current Ratio', value: financialHealth.currentRatio?.value != null ? `${financialHealth.currentRatio.value.toFixed(2)}x` : null },
    { label: 'Asset Turnover', value: financialHealth.assetTurnover?.value != null ? `${financialHealth.assetTurnover.value.toFixed(2)}x` : null },
  ]);

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
