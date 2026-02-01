'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * Returns the appropriate TradingView color theme based on the current app theme.
 * Handles hydration by defaulting to 'light' until mounted.
 */
export function useTradingViewTheme(): 'light' | 'dark' {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to light during SSR/hydration to avoid mismatch
  if (!mounted) return 'light';

  return resolvedTheme === 'dark' ? 'dark' : 'light';
}
