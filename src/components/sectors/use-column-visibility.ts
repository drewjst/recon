import { useState, useCallback, useEffect } from 'react';

export type ColumnKey =
  | 'name'
  | 'price'
  | 'marketCap'
  | 'ps'
  | 'pe'
  | 'roic'
  | 'ytd'
  | '1m'
  | '1y'
  | 'from52wHigh'
  | 'chart1Y'
  | 'rsRank'
  | 'sma';

const STORAGE_KEY = 'sector-columns';

const DEFAULT_COLUMNS: ColumnKey[] = [
  'name', 'price', 'marketCap', 'ps', 'pe', 'roic',
  'ytd', '1y', 'from52wHigh', 'chart1Y', 'rsRank', 'sma',
];

function loadColumns(): Set<ColumnKey> {
  if (typeof window === 'undefined') return new Set(DEFAULT_COLUMNS);
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored) as ColumnKey[]);
    }
  } catch {
    // Fall through to default
  }
  return new Set(DEFAULT_COLUMNS);
}

export function useColumnVisibility() {
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    () => new Set(DEFAULT_COLUMNS)
  );

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setVisibleColumns(loadColumns());
  }, []);

  const toggleColumn = useCallback((column: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { visibleColumns, toggleColumn };
}
