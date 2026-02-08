'use client';

import { useEffect, useRef, memo } from 'react';

interface CryptoScreenerProps {
  colorTheme?: 'light' | 'dark';
  height?: number;
}

function CryptoScreenerComponent({
  colorTheme = 'light',
  height = 500,
}: CryptoScreenerProps) {
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: '100%',
      height,
      defaultColumn: 'overview',
      screener_type: 'crypto_mkt',
      displayCurrency: 'USD',
      colorTheme,
      locale: 'en',
      isTransparent: true,
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [colorTheme, height]);

  return (
    <div
      className="tradingview-widget-container w-full rounded-lg overflow-hidden border border-border"
      ref={containerRef}
      style={{ height }}
    />
  );
}

export const CryptoScreener = memo(CryptoScreenerComponent);
