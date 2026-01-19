'use client';

import { MetricSection, type Metric } from './metric-section';
import type { StockDetailResponse, SectorMetric } from '@recon/shared';

interface EarningsQualitySectionProps {
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

export function EarningsQualitySection({ data }: EarningsQualitySectionProps) {
  const { company, earningsQuality } = data;
  if (!earningsQuality) return null;

  // Build metrics array
  const metrics: Metric[] = [];

  // Add Revenue per Employee if available (show first as key operating metric)
  if (earningsQuality.revenuePerEmployee) {
    metrics.push(
      toMetric('revenuePerEmployee', 'Revenue / Employee', earningsQuality.revenuePerEmployee, {
        format: 'currency',
        higherIsBetter: true,
        info: 'Revenue per Employee measures workforce productivity. Higher values indicate more efficient use of human capital.',
        learnMoreUrl: 'https://www.investopedia.com/terms/r/revenue-per-employee.asp',
      })
    );
  }

  // Add Income per Employee if available
  if (earningsQuality.incomePerEmployee) {
    metrics.push(
      toMetric('incomePerEmployee', 'Income / Employee', earningsQuality.incomePerEmployee, {
        format: 'currency',
        higherIsBetter: true,
        info: 'Net Income per Employee measures workforce profitability. Higher values indicate employees generate more profit.',
        learnMoreUrl: 'https://www.investopedia.com/terms/p/profitability-ratios.asp',
      })
    );
  }

  metrics.push(
    toMetric('accrualRatio', 'Accrual Ratio', earningsQuality.accrualRatio, {
      format: 'percent',
      higherIsBetter: false, // Lower accruals = more cash-based earnings = better quality
      info: 'Accrual Ratio measures the proportion of earnings that are non-cash. Lower values indicate higher quality, more cash-based earnings.',
      learnMoreUrl: 'https://www.investopedia.com/terms/a/accruals.asp',
    }),
    toMetric('buybackYield', 'Buyback Yield', earningsQuality.buybackYield, {
      format: 'percent',
      higherIsBetter: true, // Higher buyback yield is shareholder-friendly
      info: 'Buyback Yield measures the percentage of market cap returned to shareholders through share repurchases. Higher values indicate shareholder-friendly capital allocation.',
      learnMoreUrl: 'https://www.investopedia.com/terms/b/buyback.asp',
    })
  );

  // Build rich share text
  const shareMetrics: string[] = [];
  const formatCurrency = (v: number) => {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  if (earningsQuality.revenuePerEmployee?.value != null) {
    shareMetrics.push(`Revenue/Employee: ${formatCurrency(earningsQuality.revenuePerEmployee.value)}`);
  }
  if (earningsQuality.incomePerEmployee?.value != null) {
    shareMetrics.push(`Income/Employee: ${formatCurrency(earningsQuality.incomePerEmployee.value)}`);
  }
  if (earningsQuality.accrualRatio?.value != null) {
    shareMetrics.push(`Accrual Ratio: ${earningsQuality.accrualRatio.value.toFixed(1)}%`);
  }
  if (earningsQuality.buybackYield?.value != null) {
    shareMetrics.push(`Buyback Yield: ${earningsQuality.buybackYield.value.toFixed(2)}%`);
  }

  const shareText = `$${company.ticker} Operating Metrics\n\n${shareMetrics.join('\n')}`;

  return (
    <MetricSection
      title="Operating Metrics"
      ticker={company.ticker}
      metrics={metrics}
      topN={5}
      shareText={shareText}
    />
  );
}
