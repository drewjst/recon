'use client';

import { useEffect, useRef, useState, memo } from 'react';
import { formatTradingViewSymbol, formatTradingViewSymbolsUrl } from '@/lib/tradingview';

interface MiniChartProps {
  symbol: string;
  exchange?: string;
  colorTheme?: 'light' | 'dark';
  dateRange?: '1D' | '1M' | '3M' | '12M' | '60M' | 'ALL';
  width?: string | number;
  height?: string | number;
  chartOnly?: boolean;
}

const SCRIPT_LOAD_TIMEOUT_MS = 8000;

function MiniChartComponent({
  symbol,
  exchange,
  colorTheme = 'light',
  dateRange = '12M',
  width = '100%',
  height = 220,
  chartOnly = false,
}: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setStatus('loading');
    container.innerHTML = '';

    const formattedSymbol = formatTradingViewSymbol(symbol, exchange);
    const symbolsUrl = formatTradingViewSymbolsUrl(symbol, exchange);

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: formattedSymbol,
      width: '100%',
      height: height,
      locale: 'en',
      dateRange: dateRange,
      colorTheme: colorTheme,
      isTransparent: false,
      autosize: false,
      largeChartUrl: symbolsUrl,
      noTimeScale: false,
      chartOnly: chartOnly,
    });

    script.onload = () => setStatus('ready');
    script.onerror = () => setStatus('error');

    const timeout = setTimeout(() => {
      setStatus((prev) => (prev === 'loading' ? 'error' : prev));
    }, SCRIPT_LOAD_TIMEOUT_MS);

    container.appendChild(script);

    return () => {
      clearTimeout(timeout);
      container.innerHTML = '';
    };
  }, [symbol, exchange, colorTheme, dateRange, width, height, chartOnly]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: height }}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <span className="text-xs text-muted-foreground">Chart unavailable</span>
        </div>
      )}
      <div
        className="tradingview-widget-container w-full h-full"
        ref={containerRef}
        style={{ minHeight: height }}
      />
    </div>
  );
}

export const MiniChart = memo(MiniChartComponent);
