'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, TrendingUp, Calculator, Users, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StockDashboard } from '@/components/dashboard/stock-dashboard';
import { TickerSearch } from '@/components/search/ticker-search';

// Wrapper to handle Suspense for useSearchParams
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get('ticker');
  const [localTicker, setLocalTicker] = useState('');

  // Update local input when param changes, but only if empty to avoid fighting user
  useEffect(() => {
    if (tickerParam && !localTicker) {
      setLocalTicker(tickerParam);
    }
  }, [tickerParam]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const normalizedTicker = localTicker.trim().toUpperCase();
    if (normalizedTicker) {
      router.push(`/?ticker=${normalizedTicker}`);
    } else {
      router.push('/');
    }
  };

  const clearSearch = () => {
    setLocalTicker('');
    router.push('/');
  };

  // If a ticker is selected, we show the dashboard view (condensed header + dashboard)
  if (tickerParam) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* Condensed Header / Search Bar */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40">
           <div className="container py-4 flex items-center gap-4">
             <div className="max-w-lg flex-1">
               <TickerSearch />
             </div>
             <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>Clear</Button>
           </div>
        </div>

        {/* Dashboard Content */}
        <div className="container py-8 flex-1">
          <StockDashboard ticker={tickerParam} />
        </div>
      </div>
    );
  }

  // Otherwise, show the original Landing Page
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center py-24 md:py-14">
        <div className="mx-auto max-w-3xl text-center space-y-8 px-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Stock research,{' '}
            <span className="text-primary">distilled</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enter a ticker. Get the crux in 30 seconds.
          </p>

          {/* Search Box */}
          <div className="w-full max-w-lg mx-auto space-y-2">
            <TickerSearch size="lg" autoFocus />

            <p className="text-sm text-muted-foreground text-left px-1">
              Try:{' '}
              <button onClick={() => router.push('/?ticker=AAPL')} className="text-primary hover:underline font-medium">
                AAPL
              </button>
              {' · '}
              <button onClick={() => router.push('/?ticker=MSFT')} className="text-primary hover:underline font-medium">
                MSFT
              </button>
              {' · '}
              <button onClick={() => router.push('/?ticker=GOOGL')} className="text-primary hover:underline font-medium">
                GOOGL
              </button>
              {' · '}
              <button onClick={() => router.push('/?ticker=NVDA')} className="text-primary hover:underline font-medium">
                NVDA
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 border-t border-border/50">
        <div className="px-4 md:px-6"> 
          {/* Note: using px-4 instead of container to allow border to control width if needed, but keeping simple for now */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Calculator className="h-5 w-5" />}
              title="Piotroski F-Score"
              description="9-point fundamental strength score that identifies financially sound companies with strong balance sheets."
            />
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Rule of 40"
              description="Growth + profitability metric for evaluating sustainable business performance and efficiency."
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Smart Money Tracking"
              description="Track institutional holdings and insider transactions to follow professional investor sentiment."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Signal Detection"
              description="Automated analysis that surfaces bullish and bearish signals from fundamental data patterns."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="px-4">
          <div className="rounded-2xl bg-gradient-to-br from-secondary to-muted p-8 md:p-12 lg:p-16">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Ready to get started?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Stop drowning in financial data. Recon distills what matters so you can make informed decisions faster.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => router.push('/?ticker=AAPL')}>
                  Try the Demo
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#features">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen border-x border-border max-w-7xl mx-auto bg-background/50 shadow-sm">
      <Suspense fallback={<div className="min-h-screen" />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Orange accent border on left */}
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-primary" />

      <div className="pl-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-primary">{icon}</div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
