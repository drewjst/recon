'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, TrendingUp, BarChart3, Wallet } from 'lucide-react';
import { TickerSearch } from '@/components/search/ticker-search';

export default function FinancialsLandingPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = '10-K Financial Statements | Crux';
  }, []);

  const handleTickerSelect = (ticker: string) => {
    router.push(`/stock/${ticker.toUpperCase()}/financials`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-xl shadow-orange-500/25 mb-8">
            <FileSpreadsheet className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            10-K Financial Statements
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Dive deep into income statements, balance sheets, and cash flows.
            Finance for nerds.
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-lg mx-auto mb-16">
          <TickerSearch
            onSelect={handleTickerSelect}
            placeholder="Search for a stock..."
            buttonLabel="View 10-K"
            size="lg"
            autoFocus
          />
          <p className="text-sm text-muted-foreground text-center mt-4">
            Enter a ticker symbol to view financial statements
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-card/50 rounded-xl border border-border/50 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 mb-4">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Income Statement</h3>
            <p className="text-sm text-muted-foreground">
              Revenue, margins, and profitability trends over time
            </p>
          </div>

          <div className="bg-card/50 rounded-xl border border-border/50 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 mb-4">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Balance Sheet</h3>
            <p className="text-sm text-muted-foreground">
              Assets, liabilities, and shareholder equity analysis
            </p>
          </div>

          <div className="bg-card/50 rounded-xl border border-border/50 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 mb-4">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Cash Flow</h3>
            <p className="text-sm text-muted-foreground">
              Operating, investing, and financing cash flows
            </p>
          </div>
        </div>

        {/* Popular Tickers */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4 font-medium">
            Popular Stocks
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B'].map((ticker) => (
              <button
                key={ticker}
                onClick={() => handleTickerSelect(ticker)}
                className="px-4 py-2 text-sm font-mono font-medium rounded-lg border border-border/50 bg-card/50 hover:bg-muted hover:border-border shadow-sm hover:shadow transition-all"
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
