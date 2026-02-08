'use client';

import { memo } from 'react';
import { CollapsibleMetricSection, type Metric } from './collapsible-metric-section';
import { toMetric } from '@/lib/metric-helpers';
import type { StockDetailResponse } from '@recon/shared';

interface ValuationCompactProps {
  data: StockDetailResponse;
  defaultOpen?: boolean;
}

function ValuationCompactComponent({ data, defaultOpen = false }: ValuationCompactProps) {
  const { company, valuation } = data;

  if (!valuation) return null;

  const metrics: Metric[] = [
    toMetric('pe', 'P/E (TTM)', valuation.pe, {
      format: 'ratio',
      higherIsBetter: false,
      info: "Price-to-Earnings ratio compares a company's stock price to its earnings per share.",
    }),
    toMetric('forwardPe', 'Forward P/E', valuation.forwardPe, {
      format: 'ratio',
      higherIsBetter: false,
      info: 'Forward P/E uses estimated future earnings instead of trailing earnings.',
    }),
    toMetric('peg', 'PEG Ratio', valuation.peg, {
      format: 'ratio',
      higherIsBetter: false,
      info: 'Price/Earnings-to-Growth ratio factors in expected earnings growth.',
    }),
    toMetric('priceToFcf', 'Price/FCF', valuation.priceToFcf, {
      format: 'ratio',
      higherIsBetter: false,
      info: 'Price-to-Free Cash Flow measures how the stock price compares to cash generated.',
    }),
    toMetric('evToEbitda', 'EV/EBITDA', valuation.evToEbitda, {
      format: 'ratio',
      higherIsBetter: false,
      info: "Enterprise Value to EBITDA measures a company's total value relative to operating earnings.",
    }),
    toMetric('priceToBook', 'Price/Book', valuation.priceToBook, {
      format: 'ratio',
      higherIsBetter: false,
      info: "Price-to-Book ratio compares market value to book value.",
    }),
    toMetric('ntmPs', 'NTM P/S', valuation.ntmPs, {
      format: 'ratio',
      higherIsBetter: false,
      info: 'Next Twelve Months Price-to-Sales uses analyst revenue estimates.',
    }),
  ];

  return (
    <CollapsibleMetricSection
      title="Valuation"
      ticker={company.ticker}
      metrics={metrics}
      deepDiveUrl={`/stock/${company.ticker}/valuation`}
      defaultOpen={defaultOpen}
    />
  );
}

export const ValuationCompact = memo(ValuationCompactComponent);
