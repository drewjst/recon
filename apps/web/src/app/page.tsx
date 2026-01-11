import Link from 'next/link';
import { Search, TrendingUp, Calculator, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container flex flex-col items-center justify-center py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Stock research,{' '}
            <span className="text-primary">distilled</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enter a ticker. Get the crux in 30 seconds.
          </p>

          {/* Search Box */}
          <div className="flex w-full max-w-lg mx-auto gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter ticker symbol (e.g., AAPL)"
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button size="lg" className="h-12 px-8" asChild>
              <Link href="/stock/AAPL">Distill</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Try:{' '}
            <Link href="/stock/AAPL" className="text-primary hover:underline font-medium">
              AAPL
            </Link>
            {' · '}
            <Link href="/stock/MSFT" className="text-primary hover:underline font-medium">
              MSFT
            </Link>
            {' · '}
            <Link href="/stock/GOOGL" className="text-primary hover:underline font-medium">
              GOOGL
            </Link>
            {' · '}
            <Link href="/stock/NVDA" className="text-primary hover:underline font-medium">
              NVDA
            </Link>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-16 md:py-24">
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
      </section>

      {/* CTA Section */}
      <section className="container py-16 md:py-24">
        <div className="rounded-2xl bg-gradient-to-br from-secondary to-muted p-8 md:p-12 lg:p-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Stop drowning in financial data. Recon distills what matters so you can make informed decisions faster.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="/stock/AAPL">Try the Demo</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
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
