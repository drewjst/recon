'use client';

import { CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react';
import { SectionCard } from './section-card';
import { Badge } from '@/components/ui/badge';
import type { StockDetailResponse } from '@recon/shared';

interface SignalsSectionProps {
  data: StockDetailResponse;
}

export function SignalsSection({ data }: SignalsSectionProps) {
  const { signals } = data;
  const bullish = signals.filter((s) => s.type === 'bullish');
  const bearish = signals.filter((s) => s.type === 'bearish');
  const warning = signals.filter((s) => s.type === 'warning');

  const topSignals = [...bullish, ...warning, ...bearish].slice(0, 5);

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'bullish':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <SectionCard title="Key Signals">
      <div className="flex gap-4 mb-4">
        <Badge variant="outline" className="text-success border-success/30 bg-success/5">
          Bullish ({bullish.length})
        </Badge>
        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">
          Bearish ({bearish.length})
        </Badge>
        <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/5">
          Warning ({warning.length})
        </Badge>
      </div>

      <div className="space-y-3">
        {topSignals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No significant signals detected.</p>
        ) : (
          topSignals.map((signal, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-all duration-200"
            >
              <div className="mt-0.5">{getSignalIcon(signal.type)}</div>
              <div className="flex-1">
                <p className="text-sm">{signal.message}</p>
              </div>
              <Badge variant="secondary" className="text-xs uppercase tracking-wider">
                {signal.category}
              </Badge>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}
