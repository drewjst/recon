import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
  it('formats a date string correctly', () => {
    const date = '2023-01-01';
    expect(formatDate(date)).toBe('Jan 1, 2023');
  });

  it('formats a Date object correctly', () => {
    const date = new Date('2023-12-25');
    expect(formatDate(date)).toBe('Dec 25, 2023');
  });

  it('handles leap years correctly', () => {
    const date = '2024-02-29';
    expect(formatDate(date)).toBe('Feb 29, 2024');
  });

  it('throws for invalid date strings', () => {
    expect(() => formatDate('invalid-date')).toThrow();
  });
});
