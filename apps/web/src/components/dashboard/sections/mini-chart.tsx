'use client';

import { useEffect, useRef, memo } from 'react';

interface MiniChartProps {
  symbol: string;
  exchange?: string;
  colorTheme?: 'light' | 'dark';
  dateRange?: '1D' | '1M' | '3M' | '12M' | '60M' | 'ALL';
  width?: string | number;
  height?: string | number;
  chartOnly?: boolean;
}

/**
 * Formats a ticker symbol for TradingView.
 * TradingView expects format like "NASDAQ:AAPL" or "NYSE:IBM".
 */
function formatTradingViewSymbol(ticker: string, exchange?: string): string {
  if (!exchange) {
    return ticker;
  }
  // Normalize exchange names to TradingView format
  const exchangeMap: Record<string, string> = {
    NASDAQ: 'NASDAQ',
    NYSE: 'NYSE',
    AMEX: 'AMEX',
    'NYSE ARCA': 'AMEX',
    'NYSE MKT': 'AMEX',
  };
  const tvExchange = exchangeMap[exchange.toUpperCase()] || exchange.toUpperCase();
  return `${tvExchange}:${ticker}`;
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
      width: width,
      height: height,
      locale: 'en',
      dateRange: dateRange,
      colorTheme: colorTheme,
      isTransparent: true,
      autosize: false,
      largeChartUrl: `https://www.tradingview.com/chart/?symbol=${formattedSymbol}`,
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
