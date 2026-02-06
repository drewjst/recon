'use client';

import { cn } from '@/lib/utils';

type HeatmapScale = 'performance' | 'from52w' | 'rank';

interface HeatmapCellProps {
  value: number | null;
  scale: HeatmapScale;
  className?: string;
  compact?: boolean;
}

function getHeatmapStyle(
  value: number,
  scale: HeatmapScale
): React.CSSProperties {
  let normalized: number; // -1 (worst) to +1 (best)

  switch (scale) {
    case 'performance': {
      const clamped = Math.max(-30, Math.min(30, value));
      normalized = clamped / 30;
      break;
    }
    case 'from52w': {
      // Range: -50..0 (0 = at the high). 0 → neutral, -50 → very red
      const clamped = Math.max(-50, Math.min(0, value));
      normalized = clamped / 50;
      break;
    }
    case 'rank': {
      // 1-99, 50 is neutral
      normalized = (value - 50) / 50;
      break;
    }
  }

  const intensity = Math.abs(normalized);
  const isPositive = normalized >= 0;

  if (intensity < 0.1) {
    return {};
  }

  const opacity = intensity < 0.3 ? 0.08 : intensity < 0.6 ? 0.15 : 0.25;
  const cssVar = isPositive ? '--positive' : '--negative';

  return {
    backgroundColor: `hsl(var(${cssVar}) / ${opacity})`,
    color: `hsl(var(${cssVar}))`,
  };
}

function formatValue(value: number, scale: HeatmapScale): string {
  if (scale === 'rank') return value.toString();
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function HeatmapCell({ value, scale, className, compact }: HeatmapCellProps) {
  const padding = compact ? 'py-2 px-1' : 'py-2 px-2';

  if (value == null) {
    return (
      <td className={cn(`${padding} text-right text-muted-foreground`, className)}>
        --
      </td>
    );
  }

  const style = getHeatmapStyle(value, scale);

  return (
    <td
      className={cn(`${padding} text-right tabular-nums font-medium`, className)}
      style={style}
    >
      {formatValue(value, scale)}
    </td>
  );
}
