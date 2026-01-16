'use client';

import { useEffect, useRef, memo } from 'react';
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any existing content
    container.innerHTML = '';

    const formattedSymbol = formatTradingViewSymbol(symbol, exchange);
    const symbolsUrl = formatTradingViewSymbolsUrl(symbol, exchange);

    // Create the widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetContainer);

    // Create and configure the script
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

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol, exchange, colorTheme, dateRange, width, height, chartOnly]);

  return (
    <div
      className="tradingview-widget-container w-full h-full"
      ref={containerRef}
      style={{ minHeight: height }}
    >
      <div className="tradingview-widget-container__widget w-full h-full" />
    </div>
  );
}

export const MiniChart = memo(MiniChartComponent);
