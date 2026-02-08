/**
 * Formatting utilities for financial data display.
 * All functions handle null/undefined gracefully.
 */

const THRESHOLDS = {
  TRILLION: 1e12,
  BILLION: 1e9,
  MILLION: 1e6,
  THOUSAND: 1e3,
} as const;

/**
 * Format currency with K/M/B/T suffixes.
 * @example formatCurrency(350000000000) → "$350.0B"
 * @example formatCurrency(1200000) → "$1.2M"
 * @example formatCurrency(892000) → "$892K"
 * @example formatCurrency(-1200000000) → "($1.2B)"
 */
export function formatCurrency(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null || isNaN(value)) return '—';

  const absVal = Math.abs(value);
  const isNegative = value < 0;

  let formatted: string;

  if (absVal >= THRESHOLDS.TRILLION) {
    formatted = `$${(absVal / THRESHOLDS.TRILLION).toFixed(decimals)}T`;
  } else if (absVal >= THRESHOLDS.BILLION) {
    formatted = `$${(absVal / THRESHOLDS.BILLION).toFixed(decimals)}B`;
  } else if (absVal >= THRESHOLDS.MILLION) {
    formatted = `$${(absVal / THRESHOLDS.MILLION).toFixed(decimals)}M`;
  } else if (absVal >= THRESHOLDS.THOUSAND) {
    formatted = `$${(absVal / THRESHOLDS.THOUSAND).toFixed(decimals === 1 ? 0 : decimals)}K`;
  } else {
    formatted = `$${absVal.toFixed(0)}`;
  }

  return isNegative ? `(${formatted})` : formatted;
}

/**
 * Format as percentage.
 * @example formatPercent(57.7) → "57.7%"
 * @example formatPercent(0.577, 1, true) → "57.7%" (multiply by 100)
 */
export function formatPercent(
  value: number | null | undefined,
  decimals = 1,
  isDecimal = false
): string {
  if (value == null || isNaN(value)) return '—';

  const displayValue = isDecimal ? value * 100 : value;
  return `${displayValue.toFixed(decimals)}%`;
}

/**
 * Format growth/change with +/- prefix and color indication.
 * @example formatGrowth(13.9) → "+13.9%"
 * @example formatGrowth(-5.2) → "-5.2%"
 * @example formatGrowth(0) → "0.0%"
 */
export function formatGrowth(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null || isNaN(value)) return '—';

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format number with thousands separators.
 * @example formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(
  value: number | null | undefined,
  decimals = 0
): string {
  if (value == null || isNaN(value)) return '—';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a ratio/multiple.
 * @example formatRatio(15.5) → "15.5x"
 * @example formatRatio(-2.3) → "-2.3x"
 */
export function formatRatio(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null || isNaN(value)) return '—';

  return `${value.toFixed(decimals)}x`;
}

/**
 * Determine the color class for a growth/change value.
 */
export function getGrowthColor(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'text-muted-foreground';
  if (value > 0) return 'text-positive';
  if (value < 0) return 'text-negative';
  return 'text-muted-foreground';
}

/**
 * Format a date for display.
 * @example formatDate("2024-03-31") → "Mar 31, 2024"
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (date == null) return '—';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  return new Intl.DateTimeFormat('en-US', options ?? defaultOptions).format(
    new Date(date)
  );
}

/**
 * Format shares count with M/B suffixes.
 * @example formatShares(1500000000) → "1.5B"
 * @example formatShares(250000000) → "250M"
 */
export function formatShares(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null || isNaN(value)) return '—';

  const absVal = Math.abs(value);

  if (absVal >= THRESHOLDS.BILLION) {
    return `${(value / THRESHOLDS.BILLION).toFixed(decimals)}B`;
  }
  if (absVal >= THRESHOLDS.MILLION) {
    return `${(value / THRESHOLDS.MILLION).toFixed(decimals === 1 ? 0 : decimals)}M`;
  }
  if (absVal >= THRESHOLDS.THOUSAND) {
    return `${(value / THRESHOLDS.THOUSAND).toFixed(0)}K`;
  }
  return value.toFixed(0);
}
