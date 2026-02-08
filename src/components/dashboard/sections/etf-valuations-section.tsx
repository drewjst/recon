'use client';

import { memo } from 'react';
import { SectionCard } from './section-card';
import { Card } from '@/components/ui/card';
import { formatMultiple } from '@/lib/formatters';
import type { StockDetailResponse } from '@recon/shared';

interface ETFValuationsSectionProps {
  data: StockDetailResponse;
}

interface ValuationMetricProps {
  label: string;
  value: string;
  description?: string;
}

function ValuationMetric({ label, value, description }: ValuationMetricProps) {
  return (
    <Card className="p-4 text-center">
      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
        {label}
      </div>
      <div className="text-2xl font-bold font-mono mb-1">{value}</div>
      {description && (
        <div className="text-xs text-muted-foreground">{description}</div>
      )}
    </Card>
  );
}

function ETFValuationsSectionComponent({ data }: ETFValuationsSectionProps) {
  const valuations = data.etfData?.valuations;
  if (!valuations) return null;

  const metrics = [
    {
      label: 'P/E Ratio',
      value: formatMultiple(valuations.pe),
      description: 'Price to Earnings',
    },
    {
      label: 'P/B Ratio',
      value: formatMultiple(valuations.pb),
      description: 'Price to Book',
    },
    {
      label: 'P/S Ratio',
      value: formatMultiple(valuations.ps),
      description: 'Price to Sales',
    },
    {
      label: 'P/CF Ratio',
      value: formatMultiple(valuations.pcf),
      description: 'Price to Cash Flow',
    },
  ];

  return (
    <SectionCard title="Portfolio Valuations">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <ValuationMetric
            key={metric.label}
            label={metric.label}
            value={metric.value}
            description={metric.description}
          />
        ))}
      </div>
    </SectionCard>
  );
}

export const ETFValuationsSection = memo(ETFValuationsSectionComponent);
