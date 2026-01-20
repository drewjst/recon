'use client';

import { MetricSection, type Metric } from './metric-section';
import { toMetric } from '@/lib/metric-helpers';
import type { StockDetailResponse } from '@recon/shared';

interface GrowthSectionProps {
  data: StockDetailResponse;
}

export function GrowthSection({ data }: GrowthSectionProps) {
  const { company, growth } = data;
  if (!growth) return null;

  // Build metrics array - order determines display priority
  const metrics: Metric[] = [
    toMetric('revenueGrowthYoY', 'Revenue Growth (YoY)', growth.revenueGrowthYoY, {
      format: 'percent',
      higherIsBetter: true,
      info: 'Year-over-year revenue growth shows how much the company\'s top line has grown compared to the same period last year.',
      learnMoreUrl: 'https://www.investopedia.com/terms/r/revenue.asp',
    }),
    toMetric('epsGrowthYoY', 'EPS Growth (YoY)', growth.epsGrowthYoY, {
      format: 'percent',
      higherIsBetter: true,
      info: 'Year-over-year EPS growth shows how much earnings per share have grown compared to the same period last year.',
      learnMoreUrl: 'https://www.investopedia.com/terms/e/eps.asp',
    }),
  ];

  // Add Projected EPS Growth if available
  if (growth.projectedEpsGrowth) {
    metrics.push(
      toMetric('projectedEpsGrowth', 'Projected EPS Growth', growth.projectedEpsGrowth, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Projected EPS growth based on analyst estimates for current year to next year earnings.',
        learnMoreUrl: 'https://www.investopedia.com/terms/f/forwardpe.asp',
      })
    );
  }

  // Add Free Cash Flow TTM if available
  if (growth.freeCashFlowTTM) {
    metrics.push(
      toMetric('freeCashFlowTTM', 'Free Cash Flow (TTM)', growth.freeCashFlowTTM, {
        format: 'currency',
        higherIsBetter: true,
        info: 'Free Cash Flow represents the cash a company generates after accounting for capital expenditures. Higher FCF indicates financial flexibility.',
        learnMoreUrl: 'https://www.investopedia.com/terms/f/freecashflow.asp',
      })
    );
  }

  // Add Cash Flow Growth YoY if available
  if (growth.cashFlowGrowthYoY) {
    metrics.push(
      toMetric('cashFlowGrowthYoY', 'Cash Flow Growth (YoY)', growth.cashFlowGrowthYoY, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Year-over-year growth in free cash flow shows how the company\'s cash generation is improving.',
        learnMoreUrl: 'https://www.investopedia.com/terms/c/cashflow.asp',
      })
    );
  }

  // Build rich share text
  const shareMetrics: string[] = [];
  const formatGrowth = (v: number | undefined) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : null;

  if (growth.revenueGrowthYoY?.value != null) {
    shareMetrics.push(`Revenue Growth: ${formatGrowth(growth.revenueGrowthYoY.value)}`);
  }
  if (growth.epsGrowthYoY?.value != null) {
    shareMetrics.push(`EPS Growth: ${formatGrowth(growth.epsGrowthYoY.value)}`);
  }
  if (growth.projectedEpsGrowth?.value != null) {
    shareMetrics.push(`Projected EPS: ${formatGrowth(growth.projectedEpsGrowth.value)}`);
  }
  if (growth.cashFlowGrowthYoY?.value != null) {
    shareMetrics.push(`Cash Flow Growth: ${formatGrowth(growth.cashFlowGrowthYoY.value)}`);
  }

  const shareText = `$${company.ticker} Growth Metrics\n\n${shareMetrics.join('\n')}`;

  return (
    <MetricSection
      title="Growth"
      ticker={company.ticker}
      metrics={metrics}
      topN={5}
      shareText={shareText}
    />
  );
}
