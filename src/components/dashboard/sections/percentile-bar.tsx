'use client';

interface PercentileBarProps {
  /** Percentile value from 0-100 */
  percentile: number | null;
  /** Show the percentile label (e.g., "91st") */
  showLabel?: boolean;
  /** If true, higher percentile is better. If false, lower is better (e.g., debt ratios) */
  higherIsBetter?: boolean;
}

/**
 * Get the ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Get color classes based on percentile and whether higher is better
 */
function getPercentileColor(percentile: number, higherIsBetter: boolean): string {
  const effectivePercentile = higherIsBetter ? percentile : 100 - percentile;

  if (effectivePercentile >= 70) {
    return 'text-success'; // Green for good
  }
  if (effectivePercentile >= 40) {
    return 'text-muted-foreground'; // Neutral
  }
  return 'text-destructive'; // Red for concerning
}

function getDiamondColor(percentile: number, higherIsBetter: boolean): string {
  const effectivePercentile = higherIsBetter ? percentile : 100 - percentile;

  if (effectivePercentile >= 70) {
    return 'bg-success';
  }
  if (effectivePercentile >= 40) {
    return 'bg-muted-foreground';
  }
  return 'bg-destructive';
}

/**
 * A horizontal line with a diamond marker showing percentile position.
 * Inspired by Fidelity's industry percentile visualization.
 */
export function PercentileBar({
  percentile,
  showLabel = true,
  higherIsBetter = true
}: PercentileBarProps) {
  if (percentile === null || percentile === undefined) {
    return (
      <div className="flex items-center justify-end gap-2 min-w-[120px]">
        <span className="text-sm text-muted-foreground">--</span>
      </div>
    );
  }

  const clampedPercentile = Math.max(0, Math.min(100, percentile));

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      {/* Percentile bar with diamond marker */}
      <div className="relative flex-1 h-[2px] bg-border rounded-full min-w-[60px]">
        {/* Diamond marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-300"
          style={{ left: `${clampedPercentile}%` }}
        >
          <div
            className={`w-2 h-2 rotate-45 ${getDiamondColor(clampedPercentile, higherIsBetter)}`}
          />
        </div>
      </div>

      {/* Percentile label */}
      {showLabel && (
        <span className={`text-xs font-mono whitespace-nowrap ${getPercentileColor(clampedPercentile, higherIsBetter)}`}>
          {getOrdinalSuffix(Math.round(clampedPercentile))}
        </span>
      )}
    </div>
  );
}
