'use client';

import { useEffect, useRef, memo } from 'react';

interface AdvancedChartProps {
  symbol: string;
  exchange?: string;
  colorTheme?: 'light' | 'dark';
  height?: number;
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

function AdvancedChartComponent({
  symbol,
  exchange,
  colorTheme = 'light',
  height = 450,
}: AdvancedChartProps) {
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
    widgetContainer.style.height = `${height}px`;
    container.appendChild(widgetContainer);

    // Create and configure the script for advanced chart
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: false,
      symbol: formattedSymbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: colorTheme,
      style: '1',
      locale: 'en',
      allow_symbol_change: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      width: '100%',
      height: height,
      hide_side_toolbar: false,
      withdateranges: true,
      hide_volume: false,
      studies: [],
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol, exchange, colorTheme, height]);

  return (
    <div
      className="tradingview-widget-container w-full rounded-lg overflow-hidden border border-border"
      ref={containerRef}
      style={{ height: height }}
    >
      <div className="tradingview-widget-container__widget w-full h-full" />
    </div>
  );
}

export const AdvancedChart = memo(AdvancedChartComponent);
