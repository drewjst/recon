import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FORMAT_THRESHOLDS } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COMPACT_CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    return COMPACT_CURRENCY_FORMATTER.format(value);
  }
  return CURRENCY_FORMATTER.format(value);
}

/**
 * Format currency with K/M/B/T suffixes for compact display.
 * More predictable than Intl compact notation.
 */
export function formatCompactCurrency(value: number): string {
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absVal >= FORMAT_THRESHOLDS.TRILLION) {
    return `${sign}$${(absVal / FORMAT_THRESHOLDS.TRILLION).toFixed(1)}T`;
  }
  if (absVal >= FORMAT_THRESHOLDS.BILLION) {
    return `${sign}$${(absVal / FORMAT_THRESHOLDS.BILLION).toFixed(1)}B`;
  }
  if (absVal >= FORMAT_THRESHOLDS.MILLION) {
    return `${sign}$${(absVal / FORMAT_THRESHOLDS.MILLION).toFixed(1)}M`;
  }
  if (absVal >= FORMAT_THRESHOLDS.THOUSAND) {
    return `${sign}$${(absVal / FORMAT_THRESHOLDS.THOUSAND).toFixed(0)}K`;
  }
  return `${sign}$${absVal.toFixed(0)}`;
}

/**
 * Format market cap with appropriate suffix.
 */
export function formatMarketCap(value: number): string {
  return formatCompactCurrency(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDate(date: string | Date): string {
  return DATE_FORMATTER.format(new Date(date));
}

// eslint-disable-next-line
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced as T & { cancel: () => void };
}
