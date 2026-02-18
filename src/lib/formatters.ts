/**
 * Shared formatting utilities for displaying financial data.
 * All formatting should use these functions to ensure consistency.
 */

export type MetricFormat = 'percent' | 'ratio' | 'currency' | 'currencyMillions' | 'multiple' | 'number';

// Null placeholder for missing values
const NULL_DISPLAY = '--';

/**
 * Format a numeric value based on the metric type.
 */
export function formatMetricValue(value: number | null | undefined, format: MetricFormat): string {
  if (value === null || value === undefined) return NULL_DISPLAY;

  switch (format) {
    case 'percent':
      return formatPercent(value, { showSign: true });
    case 'ratio':
      return formatRatio(value);
    case 'currency':
      return formatCurrency(value);
    case 'currencyMillions':
      // Value is already in millions, convert to raw for formatting
      return formatCurrency(value * 1_000_000);
    case 'multiple':
      return formatMultiple(value);
    case 'number':
    default:
      return formatCompact(value);
  }
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number | null | undefined, options?: { showSign?: boolean; decimals?: number }): string {
  if (value === null || value === undefined) return NULL_DISPLAY;

  const decimals = options?.decimals ?? 2;
  // Convert decimal to percentage if needed (0.25 -> 25%)
  const pctValue = Math.abs(value) < 1 && Math.abs(value) > 0 ? value * 100 : value;
  const sign = options?.showSign && pctValue > 0 ? '+' : '';
  return `${sign}${pctValue.toFixed(decimals)}%`;
}

/**
 * Format a ratio value (P/E, PEG, etc.).
 * Returns '--' for zero or negative values.
 */
export function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined || value <= 0) return NULL_DISPLAY;
  return value.toFixed(2);
}

/**
 * Format a currency value with appropriate suffix (K, M, B, T).
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return NULL_DISPLAY;

  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(2)}`;
}

/**
 * Format a price (always 2 decimals, no abbreviation).
 */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return NULL_DISPLAY;
  return `$${value.toFixed(2)}`;
}

/**
 * Format a multiple value (e.g., "12.5x").
 */
export function formatMultiple(value: number | null | undefined): string {
  if (value === null || value === undefined) return NULL_DISPLAY;
  if (value >= 100) return `${value.toFixed(0)}x`;
  if (value >= 10) return `${value.toFixed(1)}x`;
  return `${value.toFixed(2)}x`;
}

/**
 * Format a number with compact suffix (K, M, B).
 */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return NULL_DISPLAY;

  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(2);
}

/**
 * Format shares/volume with compact notation.
 */
export function formatShares(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return NULL_DISPLAY;

  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
}

/**
 * Format a decimal as 2-digit fixed (for beta, ratios without 'x').
 */
export function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined) return NULL_DISPLAY;
  return value.toFixed(2);
}

/**
 * Format growth/change with +/- prefix.
 * @example formatGrowth(13.9) → "+13.9%"
 * @example formatGrowth(-5.2) → "-5.2%"
 */
export function formatGrowth(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return NULL_DISPLAY;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Determine the Tailwind color class for a growth/change value.
 */
export function getGrowthColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-muted-foreground';
  if (value > 0) return 'text-positive';
  if (value < 0) return 'text-negative';
  return 'text-muted-foreground';
}

const NUMBER_FORMATTERS = new Map<number, Intl.NumberFormat>();

/**
 * Format number with thousands separators.
 * @example formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return NULL_DISPLAY;
  let formatter = NUMBER_FORMATTERS.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    NUMBER_FORMATTERS.set(decimals, formatter);
  }
  return formatter.format(value);
}

/**
 * Format a date string to a readable format.
 */
export function formatDate(dateStr: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return NULL_DISPLAY;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return NULL_DISPLAY;

  return date.toLocaleDateString('en-US', options ?? {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a date as month/year only.
 */
export function formatMonthYear(dateStr: string | null | undefined): string {
  return formatDate(dateStr, { year: 'numeric', month: 'short' });
}
