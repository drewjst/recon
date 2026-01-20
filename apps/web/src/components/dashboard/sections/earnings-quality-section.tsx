'use client';

import { MetricSection, type Metric } from './metric-section';
import { toMetric } from '@/lib/metric-helpers';
import { formatCompactCurrency } from '@/lib/utils';
import type { StockDetailResponse } from '@recon/shared';

interface EarningsQualitySectionProps {
  data: StockDetailResponse;
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

  // Build share text
  const shareMetrics: string[] = [];

  if (earningsQuality.revenuePerEmployee?.value != null) {
    shareMetrics.push(`Revenue/Employee: ${formatCompactCurrency(earningsQuality.revenuePerEmployee.value)}`);
  }
  if (earningsQuality.incomePerEmployee?.value != null) {
    shareMetrics.push(`Income/Employee: ${formatCompactCurrency(earningsQuality.incomePerEmployee.value)}`);
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
