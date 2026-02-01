'use client';

import { memo, useMemo } from 'react';
import { BarChart, Bar, Cell, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: (number | null | undefined)[];
  width?: number;
  height?: number;
}

/**
 * Minimal sparkline bar chart for inline trend visualization.
 * Each bar is colored green (up from previous) or red (down from previous).
 */
export const Sparkline = memo(function Sparkline({
  data,
  width = 70,
  height = 24,
}: SparklineProps) {
  // Process data with trend colors for each bar
  const chartData = useMemo(() => {
    const filtered = data
      .map((value, index) => ({ index, value: value ?? null }))
      .filter((d): d is { index: number; value: number } => d.value !== null);

    if (filtered.length < 2) return [];

    // Add trend color for each bar (comparing to previous)
    return filtered.map((item, idx) => {
      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (idx > 0) {
        const prev = filtered[idx - 1].value;
        if (item.value > prev) trend = 'up';
        else if (item.value < prev) trend = 'down';
      }
      return { ...item, trend };
    });
  }, [data]);

  // Skip rendering if insufficient data
  if (chartData.length < 2) {
    return <div style={{ width, height }} />;
  }

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Bar
            dataKey="value"
            radius={[1, 1, 0, 0]}
            isAnimationActive={false}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.trend === 'up'
                    ? 'hsl(var(--success))'
                    : entry.trend === 'down'
                    ? 'hsl(var(--destructive))'
                    : 'hsl(var(--muted-foreground))'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
