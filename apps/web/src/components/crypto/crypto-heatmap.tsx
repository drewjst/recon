'use client';

import { useEffect, useRef, memo } from 'react';

interface CryptoHeatmapProps {
  colorTheme?: 'light' | 'dark';
  height?: number;
}

function CryptoHeatmapComponent({
  colorTheme = 'light',
  height = 500,
}: CryptoHeatmapProps) {
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      dataSource: 'Crypto',
      blockSize: 'market_cap_calc',
      blockColor: 'change',
      locale: 'en',
      symbolUrl: '',
      colorTheme,
      hasTopBar: true,
      isDataSet498Enabled: true,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: '100%',
      height,
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

export const CryptoHeatmap = memo(CryptoHeatmapComponent);
