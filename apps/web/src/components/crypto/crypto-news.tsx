'use client';

import { useEffect, useRef, memo } from 'react';

interface CryptoNewsProps {
  symbol?: string;
  colorTheme?: 'light' | 'dark';
  height?: number;
}

function CryptoNewsComponent({
  symbol = 'BITSTAMP:BTCUSD',
  colorTheme = 'light',
  height = 600,
}: CryptoNewsProps) {
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      feedMode: 'symbol',
      symbol,
      isTransparent: true,
      displayMode: 'regular',
      width: '100%',
      height,
      colorTheme,
      locale: 'en',
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

export const CryptoNews = memo(CryptoNewsComponent);
