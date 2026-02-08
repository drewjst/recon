'use client';

import { memo } from 'react';
import { CollapsibleMetricSection, type Metric } from './collapsible-metric-section';
import { toMetric } from '@/lib/metric-helpers';
import type { StockDetailResponse } from '@recon/shared';

interface ProfitabilityCompactProps {
  data: StockDetailResponse;
  defaultOpen?: boolean;
}

function ProfitabilityCompactComponent({ data, defaultOpen = false }: ProfitabilityCompactProps) {
  const { company, profitability } = data;

  if (!profitability) return null;

  const metrics: Metric[] = [];

  if (profitability.grossMargin) {
    metrics.push(
      toMetric('grossMargin', 'Gross Margin', profitability.grossMargin, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Percentage of revenue remaining after deducting cost of goods sold.',
      })
    );
  }

  metrics.push(
    toMetric('operatingMargin', 'Operating Margin', profitability.operatingMargin, {
      format: 'percent',
      higherIsBetter: true,
      info: 'Percentage of revenue remaining after covering operating expenses.',
    })
  );

  if (profitability.netMargin) {
    metrics.push(
      toMetric('netMargin', 'Net Margin', profitability.netMargin, {
        format: 'percent',
        higherIsBetter: true,
        info: 'Percentage of revenue that becomes profit after all expenses.',
      })
    );
  }

  metrics.push(
    toMetric('roe', 'ROE (TTM)', profitability.roe, {
      format: 'percent',
      higherIsBetter: true,
      info: "Return on Equity measures how effectively a company uses shareholders' equity.",
    }),
    toMetric('roic', 'ROIC (TTM)', profitability.roic, {
      format: 'percent',
      higherIsBetter: true,
      info: 'Return on Invested Capital measures capital allocation efficiency.',
    })
  );

  return (
    <CollapsibleMetricSection
      title="Margins & Returns"
      ticker={company.ticker}
      metrics={metrics}
      defaultOpen={defaultOpen}
    />
  );
}

export const ProfitabilityCompact = memo(ProfitabilityCompactComponent);
