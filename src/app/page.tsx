'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, TrendingUp, Users, Database, Sparkles, PieChart, Bookmark, UserCheck, FileSearch } from 'lucide-react';
import { StockDashboard } from '@/components/dashboard/stock-dashboard';
import { TickerSearch } from '@/components/search/ticker-search';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get('ticker');

  if (tickerParam) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="py-8 flex-1">
          {/* key forces remount when ticker changes, ensuring fresh state for ETF/stock detection */}
          <StockDashboard key={tickerParam} ticker={tickerParam} />
        </div>
      </div>
    );
  }

  const quickTickers = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA'];

  const features = [
    {
      icon: FileText,
      title: 'Piotroski F-Score',
      description: '9-point fundamental strength score identifying financially sound companies with strong balance sheets.',
    },
    {
      icon: TrendingUp,
      title: 'Rule of 40',
      description: 'Growth + profitability metric for evaluating sustainable business performance and efficiency.',
    },
    {
      icon: Users,
      title: 'Smart Money Tracking',
      description: 'Track institutional holdings and insider transactions to follow professional investor sentiment.',
    },
  ];

  const roadmap = [
    {
      icon: Bookmark,
      title: 'Watchlists',
      description: 'Save and track your favorite stocks with personalized watchlists',
    },
    {
      icon: UserCheck,
      title: 'Deeper Insider & Congress Insights',
      description: 'Enhanced tracking of insider transactions and congressional trades with detailed analysis',
    },
    {
      icon: FileSearch,
      title: 'SEC Ingestion Engine',
      description: 'Direct SEC filing data for comprehensive and timely financial information',
    },
    {
      icon: PieChart,
      title: 'Sector Comparisons',
      description: 'Compare stocks against sector peers with relative metrics and rankings',
    },
    {
      icon: Sparkles,
      title: 'AI Insights',
      description: 'AI-powered summaries and analysis for faster research',
    },
  ];

  const scrollToSearch = () => {
    document.querySelector('input')?.focus();
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Subtle gradient orb in background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative">
        {/* Hero Section */}
        <section className="py-20 md:py-32 text-center">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Stock research,{' '}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                distilled
              </span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
              Enter a ticker. Get the crux in 30 seconds.
            </p>
          </div>

          {/* Search box with subtle glow on focus */}
          <div className="mt-8 max-w-xl mx-auto px-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-300" />
              <div className="relative">
                <TickerSearch size="lg" autoFocus />
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground text-center">
              Try:{' '}
              {quickTickers.map((ticker, index) => (
                <span key={ticker}>
                  <button
                    onClick={() => router.push(`/?ticker=${ticker}`)}
                    className="text-orange-500 hover:text-orange-400 hover:underline font-medium transition-colors"
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
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-semibold text-center mb-12">
              What you get in seconds
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-xl border border-border bg-card hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-orange-500" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap Timeline Section */}
        <section className="py-16 border-t border-border/50">
          <div className="max-w-2xl mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Roadmap</Badge>
              <h2 className="text-2xl font-semibold">What&apos;s Next</h2>
              <p className="text-muted-foreground mt-2">Building the future of stock research</p>
            </div>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-orange-500/50 via-border to-border" />

              <div className="space-y-6">
                {roadmap.map((item) => (
                  <div key={item.title} className="relative flex gap-6 group">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 border-border bg-background flex items-center justify-center transition-all duration-300 group-hover:border-orange-500/50">
                      <item.icon className="w-4 h-4 text-muted-foreground transition-colors group-hover:text-orange-500/70" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2 transition-all duration-300 group-hover:opacity-100">
                      <h3 className="font-medium mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="max-w-2xl mx-auto px-4">
            <div className="text-center p-8 md:p-12 rounded-2xl bg-gradient-to-b from-orange-500/5 to-transparent border border-orange-500/10">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                Ready to get started?
              </h2>
              <p className="text-muted-foreground mb-6">
                Stop drowning in financial data. Crux distills what matters so you can make informed decisions faster.
              </p>
              <Button size="lg" onClick={scrollToSearch}>
                Distill a Stock
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div className="min-h-screen" />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
