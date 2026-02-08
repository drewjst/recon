'use client';

import { memo } from 'react';
import { PieChart } from 'lucide-react';

interface SegmentsTabProps {
  ticker: string;
}

export const SegmentsTab = memo(function SegmentsTab({ ticker }: SegmentsTabProps) {
  return (
    <div className="py-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
        <PieChart className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Revenue Segments</h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        Revenue breakdown by business segment and geography for {ticker.toUpperCase()} will be available soon.
      </p>
      <p className="text-xs text-muted-foreground mt-4">
        Segment data sourced from 10-K annual filings
      </p>
    </div>
  );
});
