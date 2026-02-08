'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatGrowth, getGrowthColor } from '@/lib/format';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 text-card-foreground',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && (
          <div className="text-muted-foreground">{icon}</div>
        )}
      </div>

      <p className="mt-2 text-2xl font-semibold font-mono tabular-nums">
        {value}
      </p>

      {change !== undefined && (
        <div className="mt-1 flex items-center gap-1.5">
          <span className={cn('text-sm font-mono tabular-nums', getGrowthColor(change))}>
            {formatGrowth(change)}
          </span>
          {changeLabel && (
            <span className="text-sm text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
