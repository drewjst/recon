'use client';

import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type SignalType = 'bullish' | 'bearish' | 'neutral';

interface SignalCardProps {
  type: SignalType;
  title: string;
  description?: string;
  className?: string;
}

const signalConfig: Record<SignalType, {
  icon: typeof TrendingUp;
  borderClass: string;
  bgClass: string;
  iconClass: string;
}> = {
  bullish: {
    icon: TrendingUp,
    borderClass: 'border-l-positive',
    bgClass: 'bg-positive/5',
    iconClass: 'text-positive',
  },
  bearish: {
    icon: TrendingDown,
    borderClass: 'border-l-negative',
    bgClass: 'bg-negative/5',
    iconClass: 'text-negative',
  },
  neutral: {
    icon: AlertTriangle,
    borderClass: 'border-l-warning',
    bgClass: 'bg-warning/5',
    iconClass: 'text-warning',
  },
};

export function SignalCard({
  type,
  title,
  description,
  className,
}: SignalCardProps) {
  const config = signalConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-lg border border-l-4 p-4',
        config.borderClass,
        config.bgClass,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.iconClass)} />
        <div className="min-w-0">
          <p className="font-medium text-card-foreground">{title}</p>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
