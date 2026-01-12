'use client';

import type { StockDetailResponse } from '@recon/shared';

interface FooterSectionProps {
  data: StockDetailResponse;
}

export function FooterSection({ data }: FooterSectionProps) {
  const priceDate = new Date(data.meta.priceAsOf).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="text-xs text-muted-foreground text-center py-4">
      Price as of {priceDate} • Fundamentals: {data.meta.fundamentalsAsOf}
    </div>
  );
}
