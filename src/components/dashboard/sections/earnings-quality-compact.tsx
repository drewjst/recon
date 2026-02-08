'use client';

import { memo } from 'react';
import { CollapsibleMetricSection, type Metric } from './collapsible-metric-section';
import { toMetric } from '@/lib/metric-helpers';
import type { StockDetailResponse } from '@recon/shared';

interface EarningsQualityCompactProps {
  data: StockDetailResponse;
  defaultOpen?: boolean;
}

function EarningsQualityCompactComponent({ data, defaultOpen = false }: EarningsQualityCompactProps) {
  const { company, earningsQuality } = data;

  if (!earningsQuality) return null;

  const metrics: Metric[] = [];

  if (earningsQuality.revenuePerEmployee) {
    metrics.push(
      toMetric('revenuePerEmployee', 'Revenue / Employee', earningsQuality.revenuePerEmployee, {
        format: 'currency',
        higherIsBetter: true,
        info: 'Revenue per Employee measures workforce productivity.',
      })
    );
  }

  if (earningsQuality.incomePerEmployee) {
    metrics.push(
      toMetric('incomePerEmployee', 'Income / Employee', earningsQuality.incomePerEmployee, {
        format: 'currency',
        higherIsBetter: true,
        info: 'Net Income per Employee measures workforce profitability.',
      })
    );
  }

  metrics.push(
    toMetric('accrualRatio', 'Accrual Ratio', earningsQuality.accrualRatio, {
      format: 'percent',
      higherIsBetter: false,
      info: 'Accrual Ratio measures the proportion of non-cash earnings. Lower = higher quality.',
    }),
    toMetric('buybackYield', 'Buyback Yield', earningsQuality.buybackYield, {
      format: 'percent',
      higherIsBetter: true,
      info: 'Buyback Yield measures returns to shareholders through share repurchases.',
    })
  );

  return (
    <CollapsibleMetricSection
      title="Operating Metrics"
      ticker={company.ticker}
      metrics={metrics}
      defaultOpen={defaultOpen}
    />
  );
}

export const EarningsQualityCompact = memo(EarningsQualityCompactComponent);
