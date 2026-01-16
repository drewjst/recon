'use client';

import { useState } from 'react';
import { Bitcoin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CryptoChart } from './crypto-chart';
import { TechnicalAnalysis } from './technical-analysis';
import { SymbolInfo } from './symbol-info';
import { CryptoHeatmap } from './crypto-heatmap';
import { CryptoScreener } from './crypto-screener';
import { CryptoNews } from './crypto-news';

const CRYPTO_SYMBOLS = [
  { label: 'BTC', symbol: 'BITSTAMP:BTCUSD' },
  { label: 'ETH', symbol: 'BITSTAMP:ETHUSD' },
  { label: 'SOL', symbol: 'COINBASE:SOLUSD' },
  { label: 'XRP', symbol: 'BITSTAMP:XRPUSD' },
];

export function CryptoDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState(CRYPTO_SYMBOLS[0].symbol);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <Bitcoin className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Crypto Markets</h1>
            <p className="text-sm text-muted-foreground">
              Real-time cryptocurrency data powered by TradingView
            </p>
          </div>
        </div>

        {/* Symbol Selector */}
        <Tabs value={selectedSymbol} onValueChange={setSelectedSymbol}>
          <TabsList>
            {CRYPTO_SYMBOLS.map((crypto) => (
              <TabsTrigger key={crypto.symbol} value={crypto.symbol}>
                {crypto.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Main Grid Layout - mirrors TradingView crypto-light solution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advanced Chart - spans 2 columns on desktop */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Price Chart
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CryptoChart symbol={selectedSymbol} height={500} />
            </CardContent>
          </Card>
        </div>

        {/* Technical Analysis - single column */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Technical Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TechnicalAnalysis symbol={selectedSymbol} height={468} />
            </CardContent>
          </Card>
        </div>

        {/* Symbol Profile - full width */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Asset Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <SymbolInfo symbol={selectedSymbol} height={250} />
            </CardContent>
          </Card>
        </div>

        {/* Crypto Heatmap - full width */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Market Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CryptoHeatmap height={500} />
            </CardContent>
          </Card>
        </div>

        {/* Crypto Screener - spans 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Market Screener
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CryptoScreener height={500} />
            </CardContent>
          </Card>
        </div>

        {/* Top Stories - single column */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Latest News
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CryptoNews symbol={selectedSymbol} height={468} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attribution */}
      <p className="text-xs text-muted-foreground text-center">
        Charts and market data provided by{' '}
        <a
          href="https://www.tradingview.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          TradingView
        </a>
      </p>
    </div>
  );
}
