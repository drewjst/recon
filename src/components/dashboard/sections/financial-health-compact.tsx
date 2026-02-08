'use client';

import { memo } from 'react';
import { CollapsibleMetricSection, type Metric } from './collapsible-metric-section';
import { toMetric } from '@/lib/metric-helpers';
import type { StockDetailResponse } from '@recon/shared';

interface FinancialHealthCompactProps {
  data: StockDetailResponse;
  defaultOpen?: boolean;
}

function FinancialHealthCompactComponent({ data, defaultOpen = false }: FinancialHealthCompactProps) {
  const { company, financialHealth } = data;

  if (!financialHealth) return null;

  const metrics: Metric[] = [
    toMetric('debtToEquity', 'Debt/Equity (TTM)', financialHealth.debtToEquity, {
      format: 'ratio',
      higherIsBetter: false,
      info: 'Debt-to-Equity ratio measures financial leverage. Lower ratios indicate less reliance on debt.',
    }),
    toMetric('currentRatio', 'Current Ratio', financialHealth.currentRatio, {
      format: 'ratio',
      higherIsBetter: true,
      info: 'Current Ratio measures short-term liquidity. A ratio above 1 indicates the company can cover obligations.',
    }),
    toMetric('assetTurnover', 'Asset Turnover', financialHealth.assetTurnover, {
      format: 'ratio',
      higherIsBetter: true,
      info: 'Asset Turnover measures how efficiently a company uses assets to generate revenue.',
    }),
  ];

  return (
    <CollapsibleMetricSection
      title="Balance Sheet"
      ticker={company.ticker}
      metrics={metrics}
      defaultOpen={defaultOpen}
    />
  );
}

export const FinancialHealthCompact = memo(FinancialHealthCompactComponent);
