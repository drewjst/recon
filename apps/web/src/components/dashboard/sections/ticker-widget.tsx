'use client';

import { useEffect, useRef, memo } from 'react';

interface TickerWidgetProps {
  symbol: string;
  exchange?: string;
  colorTheme?: 'light' | 'dark';
}

/**
 * Formats a ticker symbol for TradingView.
 * TradingView expects format like "NASDAQ:AAPL" or "NYSE:IBM".
 */
function formatTradingViewSymbol(ticker: string, exchange?: string): string {
  if (!exchange) {
    return ticker;
  }
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

function TickerWidgetComponent({
  symbol,
  exchange,
  colorTheme = 'light',
}: TickerWidgetProps) {
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: formattedSymbol,
      width: '100%',
      isTransparent: true,
      colorTheme: colorTheme,
      locale: 'en',
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol, exchange, colorTheme]);

  return (
    <div
      className="tradingview-widget-container w-full"
      ref={containerRef}
      style={{ minHeight: 46 }}
    >
      <div className="tradingview-widget-container__widget w-full" />
    </div>
  );
}

export const TickerWidget = memo(TickerWidgetComponent);
