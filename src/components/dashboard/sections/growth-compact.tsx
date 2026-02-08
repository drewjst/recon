'use client';

import { memo } from 'react';
import { CollapsibleMetricSection, type Metric } from './collapsible-metric-section';
import { toMetric } from '@/lib/metric-helpers';
import type { StockDetailResponse } from '@recon/shared';

interface GrowthCompactProps {
  data: StockDetailResponse;
  defaultOpen?: boolean;
}

function GrowthCompactComponent({ data, defaultOpen = false }: GrowthCompactProps) {
  const { company, growth } = data;

  if (!growth) return null;

  const metrics: Metric[] = [
    toMetric('revenueGrowthYoY', 'Revenue Growth (YoY)', growth.revenueGrowthYoY, {
      format: 'percent',
      higherIsBetter: true,
      info: "Year-over-year revenue growth shows how much the company's top line has grown.",
    }),
    toMetric('epsGrowthYoY', 'EPS Growth (YoY)', growth.epsGrowthYoY, {
      format: 'percent',
      higherIsBetter: true,
      info: 'Year-over-year EPS growth shows how much earnings per share have grown.',
    }),
  ];

  if (growth.netIncomeGrowthYoY) {
    metrics.push(
      toMetric('netIncomeGrowthYoY', 'Net Income Growth (YoY)', growth.netIncomeGrowthYoY, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Year-over-year net income growth shows how much bottom-line profit has grown.',
      })
    );
  }

  if (growth.operatingIncomeGrowthYoY) {
    metrics.push(
      toMetric('operatingIncomeGrowthYoY', 'Operating Income Growth (YoY)', growth.operatingIncomeGrowthYoY, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Year-over-year operating income growth shows how much core operating profit has grown.',
      })
    );
  }

  if (growth.projectedEpsGrowth) {
    metrics.push(
      toMetric('projectedEpsGrowth', 'Projected EPS Growth', growth.projectedEpsGrowth, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Projected EPS growth based on analyst estimates.',
      })
    );
  }

  if (growth.projectedRevenueGrowth) {
    metrics.push(
      toMetric('projectedRevenueGrowth', 'Projected Revenue Growth', growth.projectedRevenueGrowth, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Projected revenue growth based on analyst estimates for next fiscal year.',
      })
    );
  }

  if (growth.freeCashFlowTTM) {
    metrics.push(
      toMetric('freeCashFlowTTM', 'Free Cash Flow (TTM)', growth.freeCashFlowTTM, {
        format: 'currencyMillions',
        higherIsBetter: true,
        info: 'Free Cash Flow represents the cash a company generates after capital expenditures.',
      })
    );
  }

  if (growth.cashFlowGrowthYoY) {
    metrics.push(
      toMetric('cashFlowGrowthYoY', 'FCF Growth (YoY)', growth.cashFlowGrowthYoY, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Year-over-year growth in free cash flow.',
      })
    );
  }

  if (growth.operatingCFGrowthYoY) {
    metrics.push(
      toMetric('operatingCFGrowthYoY', 'Operating Cash Flow Growth (YoY)', growth.operatingCFGrowthYoY, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Year-over-year growth in operating cash flow, measuring core business cash generation trends.',
      })
    );
  }

  return (
    <CollapsibleMetricSection
      title="Growth"
      ticker={company.ticker}
      metrics={metrics}
      defaultOpen={defaultOpen}
    />
  );
}

export const GrowthCompact = memo(GrowthCompactComponent);
