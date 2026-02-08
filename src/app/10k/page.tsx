'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { TickerSearch } from '@/components/search/ticker-search';

function TenKContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get('ticker');

  const quickTickers = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META'];

  // When a ticker is selected, redirect to the financials page
  useEffect(() => {
    if (tickerParam) {
      router.replace(`/stock/${tickerParam.toUpperCase()}/financials`);
    }
  }, [tickerParam, router]);

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Subtle gradient orb in background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative">
        {/* Hero Section */}
        <section className="py-20 md:py-32 text-center">
          <div className="max-w-4xl mx-auto px-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              10-K{' '}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                Distilled
              </span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
              AI-powered analysis of annual reports. Skip the 200 pages.
            </p>
          </div>

          {/* Search box */}
          <div className="mt-8 max-w-xl mx-auto px-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-300" />
              <div className="relative">
                <TickerSearch
                  size="lg"
                  autoFocus
                  placeholder="Enter ticker to analyze 10-K..."
                  onSelect={(ticker) => router.push(`/stock/${ticker.toUpperCase()}/financials`)}
                />
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground text-center">
              Try:{' '}
              {quickTickers.map((ticker, index) => (
                <span key={ticker}>
                  <button
                    onClick={() => router.push(`/stock/${ticker}/financials`)}
                    className="text-blue-500 hover:text-blue-400 hover:underline font-medium transition-colors"
                  >
                    {ticker}
                  </button>
                  {index < quickTickers.length - 1 && ' · '}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 border-t border-border/50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-semibold text-center mb-12">
              What you&apos;ll get
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-2">Risk Factors</h3>
                <p className="text-sm text-muted-foreground">
                  Key risks highlighted and categorized by severity and likelihood.
                </p>
              </div>
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-2">Business Overview</h3>
                <p className="text-sm text-muted-foreground">
                  Concise summary of operations, strategy, and competitive position.
                </p>
              </div>
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-2">MD&A Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Management discussion distilled into actionable takeaways.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function TenKPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div className="min-h-screen" />}>
        <TenKContent />
      </Suspense>
    </div>
  );
}
