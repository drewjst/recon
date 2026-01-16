'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, TrendingUp, Users, Link, BarChart3, Newspaper, GitCompare } from 'lucide-react';
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
          <StockDashboard ticker={tickerParam} />
        </div>
      </div>
    );
  }

  const quickTickers = ['AAPL', 'MSFT', 'GOOGL', 'NVDA'];

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
      icon: Link,
      title: 'Creator Portfolios',
      description: 'Track picks from your favorite finance creators',
      timeline: 'Q2 2025',
    },
    {
      icon: BarChart3,
      title: 'Options Flow',
      description: 'See unusual options activity and sentiment',
      timeline: 'Q2 2025',
    },
    {
      icon: Newspaper,
      title: 'News Sentiment',
      description: 'AI-powered news analysis and scoring',
      timeline: 'Q3 2025',
    },
    {
      icon: GitCompare,
      title: 'Compare Mode',
      description: 'Side-by-side stock comparison',
      timeline: 'Q2 2025',
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
        <section className="py-20 md:py-32 text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Stock research,{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              distilled
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
            Enter a ticker. Get the crux in 30 seconds.
          </p>

          {/* Search box with subtle glow on focus */}
          <div className="mt-8 max-w-xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-300" />
              <div className="relative">
                <TickerSearch size="lg" autoFocus />
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
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
        <section className="py-16 border-t border-border/50 px-4">
          <h2 className="text-2xl font-semibold text-center mb-12">
            What you get in seconds
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
        </section>

        {/* Coming Soon Section */}
        <section className="py-16 border-t border-border/50 px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Roadmap</Badge>
            <h2 className="text-2xl font-semibold">Coming Soon</h2>
            <p className="text-muted-foreground mt-2">We&apos;re building more ways to research smarter</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {roadmap.map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-xl border border-dashed border-border bg-muted/30 relative overflow-hidden transition-all duration-300 hover:border-border hover:bg-muted/50"
              >
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs">{item.timeline}</Badge>
                </div>
                <item.icon className="w-5 h-5 text-muted-foreground mb-3" />
                <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center p-8 md:p-12 rounded-2xl bg-gradient-to-b from-orange-500/5 to-transparent border border-orange-500/10">
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
        </section>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="min-h-screen" />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
