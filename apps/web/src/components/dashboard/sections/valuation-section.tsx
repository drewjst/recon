'use client';

import { MetricSection, type Metric } from './metric-section';
import { toMetric, buildShareText } from '@/lib/metric-helpers';
import type { StockDetailResponse } from '@recon/shared';

interface ValuationSectionProps {
  data: StockDetailResponse;
}

export function ValuationSection({ data }: ValuationSectionProps) {
  const { company, valuation } = data;
  if (!valuation) return null;

  // Build metrics array - order determines display priority
  // Top 5 shown by default: P/E, PEG, P/S (priceToFcf as proxy), P/B, EV/EBITDA
  const metrics: Metric[] = [
    toMetric('pe', 'P/E (TTM)', valuation.pe, {
      format: 'ratio',
      higherIsBetter: false, // Lower P/E is often considered better value
      info: "Price-to-Earnings ratio compares a company's stock price to its earnings per share. Lower P/E may indicate undervaluation relative to earnings.",
      learnMoreUrl: 'https://www.investopedia.com/terms/p/price-earningsratio.asp',
    }),
    toMetric('peg', 'PEG Ratio', valuation.peg, {
      format: 'ratio',
      higherIsBetter: false, // Lower PEG (< 1) suggests undervaluation
      info: 'Price/Earnings-to-Growth ratio factors in expected earnings growth. A PEG below 1 may suggest the stock is undervalued relative to its growth.',
      learnMoreUrl: 'https://www.investopedia.com/terms/p/pegratio.asp',
    }),
    toMetric('priceToFcf', 'Price/FCF', valuation.priceToFcf, {
      format: 'ratio',
      higherIsBetter: false,
      info: 'Price-to-Free Cash Flow measures how the stock price compares to cash generated after capital expenditures. Lower values may indicate better value.',
      learnMoreUrl: 'https://www.investopedia.com/terms/p/pricetofreecashflow.asp',
    }),
    toMetric('priceToBook', 'Price/Book', valuation.priceToBook, {
      format: 'ratio',
      higherIsBetter: false,
      info: "Price-to-Book ratio compares market value to book value. A P/B below 1 may indicate the stock trades below the value of its net assets.",
      learnMoreUrl: 'https://www.investopedia.com/terms/p/price-to-bookratio.asp',
    }),
    toMetric('evToEbitda', 'EV/EBITDA', valuation.evToEbitda, {
      format: 'ratio',
      higherIsBetter: false,
      info: "Enterprise Value to EBITDA measures a company's total value relative to its operating earnings. Useful for comparing companies regardless of capital structure.",
      learnMoreUrl: 'https://www.investopedia.com/terms/e/ev-ebitda.asp',
    }),
    toMetric('forwardPe', 'Forward P/E', valuation.forwardPe, {
      format: 'ratio',
      higherIsBetter: false,
      info: 'Forward P/E uses estimated future earnings instead of trailing earnings. It can indicate expected growth or whether the market anticipates earnings changes.',
      learnMoreUrl: 'https://www.investopedia.com/terms/f/forwardpe.asp',
    }),
  ];

  // Build share text
  const shareText = buildShareText(company.ticker, 'Valuation', [
    { label: 'P/E', value: valuation.pe.value != null ? `${valuation.pe.value.toFixed(1)}x` : null },
    { label: 'PEG', value: valuation.peg.value != null ? valuation.peg.value.toFixed(2) : null },
    { label: 'EV/EBITDA', value: valuation.evToEbitda.value != null ? `${valuation.evToEbitda.value.toFixed(1)}x` : null },
    { label: 'P/FCF', value: valuation.priceToFcf.value != null ? `${valuation.priceToFcf.value.toFixed(1)}x` : null },
  ]);

  return (
    <MetricSection
      title="Valuation"
      ticker={company.ticker}
      metrics={metrics}
      topN={5}
      shareText={shareText}
    />
  );
}
