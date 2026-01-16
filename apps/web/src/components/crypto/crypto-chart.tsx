'use client';

import { useEffect, useRef, memo } from 'react';

interface CryptoChartProps {
  symbol?: string;
  colorTheme?: 'light' | 'dark';
  height?: number;
}

function CryptoChartComponent({
  symbol = 'BITSTAMP:BTCUSD',
  colorTheme = 'light',
  height = 500,
}: CryptoChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = `${height}px`;
    container.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: false,
      symbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: colorTheme,
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      width: '100%',
      height,
      hide_side_toolbar: false,
      withdateranges: true,
      hide_volume: false,
      studies: ['STD;MACD'],
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol, colorTheme, height]);

  return (
    <div
      className="tradingview-widget-container w-full rounded-lg overflow-hidden border border-border"
      ref={containerRef}
      style={{ height }}
    />
  );
}

export const CryptoChart = memo(CryptoChartComponent);
