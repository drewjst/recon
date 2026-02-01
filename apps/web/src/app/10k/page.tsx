'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, ArrowLeft, Clock } from 'lucide-react';
import { TickerSearch } from '@/components/search/ticker-search';
import { Card, CardContent } from '@/components/ui/card';

function TenKContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get('ticker');

  const quickTickers = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META'];

  // When a ticker is selected, show the analysis page
  if (tickerParam) {
    return (
      <div className="flex flex-col min-h-screen relative">
        {/* Subtle gradient orb in background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Header with back button and search */}
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <button
                onClick={() => router.push('/10k')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to 10-K Search
              </button>
              <div className="w-full sm:w-64">
                <TickerSearch
                  placeholder="Analyze another..."
                  onSelect={(ticker) => router.push(`/10k?ticker=${ticker}`)}
                />
              </div>
            </div>
          </div>

          {/* Ticker Header */}
          <section className="py-8 text-center">
            <div className="max-w-4xl mx-auto px-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                {tickerParam.toUpperCase()}{' '}
                <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  10-K Analysis
                </span>
              </h1>
              <p className="text-muted-foreground">
                Annual report insights powered by AI
              </p>
            </div>
          </section>

          {/* Coming Soon Card */}
          <section className="py-8">
            <div className="max-w-2xl mx-auto px-4">
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-6 h-6 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
                  <p className="text-muted-foreground mb-6">
                    We&apos;re building AI-powered 10-K analysis for {tickerParam.toUpperCase()}.
                    Check back soon for risk factors, business overview, and MD&A insights.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-sm">
                    {quickTickers.filter(t => t !== tickerParam.toUpperCase()).slice(0, 4).map((ticker) => (
                      <button
                        key={ticker}
                        onClick={() => router.push(`/10k?ticker=${ticker}`)}
                        className="px-3 py-1.5 rounded-full border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors"
                      >
                        Try {ticker}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Features Preview */}
          <section className="py-12 border-t border-border/50">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-lg font-semibold text-center mb-8 text-muted-foreground">
                What you&apos;ll get for {tickerParam.toUpperCase()}
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
                  onSelect={(ticker) => router.push(`/10k?ticker=${ticker}`)}
                />
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground text-center">
              Try:{' '}
              {quickTickers.map((ticker, index) => (
                <span key={ticker}>
                  <button
                    onClick={() => router.push(`/10k?ticker=${ticker}`)}
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
