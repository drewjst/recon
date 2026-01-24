/**
 * Shared formatting utilities for displaying financial data.
 */

export type MetricFormat = 'percent' | 'ratio' | 'currency' | 'multiple' | 'number';

/**
 * Format a numeric value based on the metric type.
 */
export function formatMetricValue(value: number | null | undefined, format: MetricFormat): string {
  if (value === null || value === undefined) {
    return '--';
  }

  switch (format) {
    case 'percent':
      return formatPercent(value);
    case 'ratio':
      return formatRatio(value);
    case 'currency':
      return formatCurrency(value);
    case 'multiple':
      return formatMultiple(value);
    case 'number':
    default:
      return formatNumber(value);
  }
}

/**
 * Format a percentage value.
 * Handles both decimal (0.25) and percentage (25) inputs.
 */
export function formatPercent(value: number | null | undefined, options?: { showSign?: boolean }): string {
  if (value === null || value === undefined) return '--';

  // Convert decimal to percentage if needed
  const pctValue = Math.abs(value) < 1 && Math.abs(value) > 0 ? value * 100 : value;
  const sign = options?.showSign && value > 0 ? '+' : '';
  return `${sign}${pctValue.toFixed(2)}%`;
}

/**
 * Format a ratio value (P/E, PEG, etc.).
 * Returns '--' for zero or negative values (e.g., unprofitable companies).
 */
export function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined || value <= 0) return '--';
  return value.toFixed(2);
}

/**
 * Format a currency value with appropriate suffix (K, M, B, T).
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--';

  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Format a multiple value (e.g., "12.5x").
 */
export function formatMultiple(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--';
  return `${value.toFixed(2)}x`;
}

/**
 * Format a generic number with appropriate suffix.
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--';

  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(2);
}

/**
 * Format a large number with commas (no abbreviation).
 */
export function formatWithCommas(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--';
  return value.toLocaleString();
}

/**
 * Format a date string to a readable format.
 */
export function formatDate(dateStr: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '--';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '--';

  return date.toLocaleDateString('en-US', options ?? {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a relative date (e.g., "2 days ago").
 */
export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '--';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
