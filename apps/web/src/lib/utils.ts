import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FORMAT_THRESHOLDS } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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

export function formatNumber(value: number, compact = false): string {
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}
