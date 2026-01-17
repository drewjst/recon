'use client';

import { MetricSection, type Metric } from './metric-section';
import type { StockDetailResponse, SectorMetric } from '@recon/shared';

interface GrowthSectionProps {
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

  // Build share text
  const shareText = `${company.ticker} Growth: Revenue ${growth.revenueGrowthYoY?.value?.toFixed(1) ?? 'N/A'}% YoY, EPS ${growth.epsGrowthYoY?.value?.toFixed(1) ?? 'N/A'}% YoY`;

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
