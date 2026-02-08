'use client';

import { useEffect, useRef, memo } from 'react';

interface TechnicalAnalysisProps {
  symbol?: string;
  colorTheme?: 'light' | 'dark';
  height?: number;
}

function TechnicalAnalysisComponent({
  symbol = 'BITSTAMP:BTCUSD',
  colorTheme = 'light',
  height = 425,
}: TechnicalAnalysisProps) {
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: '1D',
      width: '100%',
      height,
      symbol,
      showIntervalTabs: true,
      isTransparent: true,
      locale: 'en',
      colorTheme,
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

export const TechnicalAnalysis = memo(TechnicalAnalysisComponent);
