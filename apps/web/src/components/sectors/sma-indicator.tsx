'use client';

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface SmaIndicatorProps {
  sma20: boolean | null;
  sma50: boolean | null;
  sma200: boolean | null;
}

const SMA_BARS = [
  { key: 'sma20' as const, label: 'SMA 20' },
  { key: 'sma50' as const, label: 'SMA 50' },
  { key: 'sma200' as const, label: 'SMA 200' },
];

export function SmaIndicator({ sma20, sma50, sma200 }: SmaIndicatorProps) {
  const values = { sma20, sma50, sma200 };

  const tooltipText = SMA_BARS.map(
    ({ key, label }) =>
      `${label}: ${values[key] === true ? 'Above' : values[key] === false ? 'Below' : 'N/A'}`
  ).join(' · ');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-0.5 justify-center">
          {SMA_BARS.map(({ key }) => {
            const value = values[key];
            const color =
              value === true
                ? 'hsl(var(--positive))'
                : value === false
                  ? 'hsl(var(--negative))'
                  : 'hsl(var(--muted-foreground) / 0.3)';

            return (
              <div
                key={key}
                className="rounded-[1px]"
                style={{
                  width: 4,
                  height: 16,
                  backgroundColor: color,
                }}
              />
            );
          })}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}
