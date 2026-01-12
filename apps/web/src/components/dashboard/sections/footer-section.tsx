'use client';

import type { StockDetailResponse } from '@recon/shared';

interface FooterSectionProps {
  data: StockDetailResponse;
}

export function FooterSection({ data }: FooterSectionProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const priceDate = formatDate(data.meta.priceAsOf);
  const generatedAt = formatDate(data.meta.generatedAt);

  return (
    <div className="text-xs text-muted-foreground text-center py-6 border-t border-border/30 space-y-1">
      <div>
        Price as of <span className="font-mono">{priceDate}</span>
        {data.meta.fundamentalsAsOf !== 'N/A' && (
          <> • Fundamentals: FY <span className="font-mono">{data.meta.fundamentalsAsOf}</span></>
        )}
      </div>
      <div className="text-muted-foreground/60">
        Generated <span className="font-mono">{generatedAt}</span>
      </div>
    </div>
  );
}
