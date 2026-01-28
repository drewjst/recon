'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useStock } from '@/hooks/use-stock';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HeaderSection,
  ConvictionScoresSection,
  DashboardDivider,
} from './sections';
import { ETFView } from './etf-view';
import { CruxAIInsight } from '@/components/cruxai/cruxai-insight';
import type { StockDetailResponse } from '@recon/shared';

// Skeleton for loading sections
const SectionSkeleton = () => (
  <div className="w-full h-64 p-6 rounded-xl border bg-card text-card-foreground shadow-sm space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[90%]" />
      <Skeleton className="h-4 w-[80%]" />
    </div>
  </div>
);

// ⚡ Bolt Optimization: Lazy load below-the-fold sections
// Reduces initial bundle size and hydration cost.
// Impact: Improved Time to Interactive (TTI) and First Input Delay (FID).
// The sections below are likely not visible on initial load.

const SignalsSection = dynamic(
  () => import('./sections/signals-section').then((mod) => mod.SignalsSection),
  { loading: () => <SectionSkeleton /> }
);

const ValuationSection = dynamic(
  () => import('./sections/valuation-section').then((mod) => mod.ValuationSection),
  { loading: () => <SectionSkeleton /> }
);

const ProfitabilitySection = dynamic(
  () => import('./sections/profitability-section').then((mod) => mod.ProfitabilitySection),
  { loading: () => <SectionSkeleton /> }
);

const FinancialHealthSection = dynamic(
  () => import('./sections/financial-health-section').then((mod) => mod.FinancialHealthSection),
  { loading: () => <SectionSkeleton /> }
);

const GrowthSection = dynamic(
  () => import('./sections/growth-section').then((mod) => mod.GrowthSection),
  { loading: () => <SectionSkeleton /> }
);

const EarningsQualitySection = dynamic(
  () => import('./sections/earnings-quality-section').then((mod) => mod.EarningsQualitySection),
  { loading: () => <SectionSkeleton /> }
);

const SmartMoneySection = dynamic(
  () => import('./sections/smart-money-section').then((mod) => mod.SmartMoneySection),
  { loading: () => <SectionSkeleton /> }
);

const FooterSection = dynamic(
  () => import('./sections/footer-section').then((mod) => mod.FooterSection),
  { loading: () => <SectionSkeleton /> }
);

interface StockDashboardProps {
  ticker: string;
  initialData?: StockDetailResponse | null;
}

export function StockDashboard({ ticker, initialData }: StockDashboardProps) {
  const router = useRouter();
  const { data, isLoading, error } = useStock(ticker, initialData);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading stock data for {ticker}...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-in fade-in zoom-in-95 duration-300">
        <div className="p-4 rounded-full bg-destructive/10 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Unable to load stock data</h2>
        <p className="mt-2 text-muted-foreground text-center max-w-md mx-auto">
          {error instanceof Error
            ? error.message
            : `We couldn't retrieve data for ${ticker}. It might be delisted or invalid.`}
        </p>
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="mt-6"
        >
          Search Again
        </Button>
      </div>
    );
  }

  // Render ETF view for ETFs
  if (data.assetType === 'etf') {
    return <ETFView data={data} />;
  }

  // Stock view - Modern minimalist layout with strategic pairing
  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with price & performance */}
      <HeaderSection data={data} />

      {/* CruxAI Position Summary */}
      <CruxAIInsight ticker={ticker} section="position-summary" />

      {/* Row 1: Signals + Scores - Quick overview at a glance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SignalsSection data={data} />
        <ConvictionScoresSection data={data} />
      </div>

      {/* Row 2: Smart Money - Institutional & Insider activity */}
      <SmartMoneySection data={data} />

      {/* Row 3: Valuation - Full width with verdict header and deep dive link */}
      <ValuationSection data={data} />

      {/* Row 4: Growth - Full width for growth story */}
      <GrowthSection data={data} />

      {/* Row 5: Profitability - Margins & Returns */}
      <ProfitabilitySection data={data} />

      {/* Row 6: Operating Metrics - Efficiency indicators */}
      <EarningsQualitySection data={data} />

      {/* Row 7: Balance Sheet - Debt & Liquidity */}
      <FinancialHealthSection data={data} />

      {/* Footer */}
      <FooterSection data={data} />
    </div>
  );
}
