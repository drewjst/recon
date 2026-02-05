'use client';

import { memo, useMemo } from 'react';

interface SparklineSvgProps {
  data: number[];
  oneYearChange: number | null;
  width?: number;
  height?: number;
}

export const SparklineSvg = memo(function SparklineSvg({
  data,
  oneYearChange,
  width = 80,
  height = 24,
}: SparklineSvgProps) {
  const points = useMemo(() => {
    if (!data || data.length < 2) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padding = 2;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    return data
      .map((value, i) => {
        const x = padding + (i / (data.length - 1)) * plotWidth;
        const y = padding + plotHeight - ((value - min) / range) * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data, width, height]);

  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }

  const isPositive = (oneYearChange ?? 0) >= 0;
  const strokeColor = isPositive
    ? 'hsl(var(--positive))'
    : 'hsl(var(--negative))';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block"
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
