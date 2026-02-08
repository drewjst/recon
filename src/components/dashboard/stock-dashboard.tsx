'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useStock } from '@/hooks/use-stock';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StockDetailResponse } from '@recon/shared';
import {
  HeaderSection,
  ConvictionScoresSection,
} from './sections';
import { CruxAIInsight } from '@/components/cruxai/cruxai-insight';
import { SnapshotSidebar } from '@/components/stock/snapshot-sidebar';

// Skeleton for loading sections
const SectionSkeleton = () => (
  <div className="w-full h-64 p-4 rounded-xl border bg-card text-card-foreground shadow-sm space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-6 w-24" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[90%]" />
      <Skeleton className="h-4 w-[80%]" />
    </div>
  </div>
);

// Compact skeleton for collapsed sections
const CompactSkeleton = () => (
  <div className="w-full p-3 rounded-xl border bg-card text-card-foreground shadow-sm">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-20" />
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

const SmartMoneySummary = dynamic(
  () => import('./sections/smart-money-summary').then((mod) => mod.SmartMoneySummary),
  { loading: () => <CompactSkeleton /> }
);

const ValuationCompact = dynamic(
  () => import('./sections/valuation-compact').then((mod) => mod.ValuationCompact),
  { loading: () => <CompactSkeleton /> }
);

const GrowthCompact = dynamic(
  () => import('./sections/growth-compact').then((mod) => mod.GrowthCompact),
  { loading: () => <CompactSkeleton /> }
);

const ProfitabilityCompact = dynamic(
  () => import('./sections/profitability-compact').then((mod) => mod.ProfitabilityCompact),
  { loading: () => <CompactSkeleton /> }
);

const FinancialHealthCompact = dynamic(
  () => import('./sections/financial-health-compact').then((mod) => mod.FinancialHealthCompact),
  { loading: () => <CompactSkeleton /> }
);

const EarningsQualityCompact = dynamic(
  () => import('./sections/earnings-quality-compact').then((mod) => mod.EarningsQualityCompact),
  { loading: () => <CompactSkeleton /> }
);

const FooterSection = dynamic(
  () => import('./sections/footer-section').then((mod) => mod.FooterSection),
  { loading: () => <SectionSkeleton /> }
);

const ETFView = dynamic(
  () => import('./etf-view').then((mod) => mod.ETFView),
  { loading: () => (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Loading ETF data...</p>
    </div>
  )}
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

  // Stock view - Compact layout with collapsible sections
  return (
    <div className="w-full max-w-6xl mx-auto flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header with price & performance */}
        <HeaderSection data={data} />

        {/* CruxAI Insights - Position Summary and News Sentiment side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <CruxAIInsight ticker={ticker} section="position-summary" />
          <CruxAIInsight ticker={ticker} section="news-sentiment" />
        </div>

        {/* Key Signals + Health Scores - Two column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <SignalsSection data={data} />
          <ConvictionScoresSection data={data} />
        </div>

        {/* Smart Money - Condensed one-line summary */}
        <SmartMoneySummary data={data} ticker={ticker} />

        {/* Valuation - Collapsible, collapsed by default */}
        <ValuationCompact data={data} />

        {/* Growth - Collapsible, collapsed by default */}
        <GrowthCompact data={data} />

        {/* Margins & Returns - Collapsible, collapsed by default */}
        <ProfitabilityCompact data={data} />

        {/* Balance Sheet - Collapsible, collapsed by default */}
        <FinancialHealthCompact data={data} />

        {/* Operating Metrics - Collapsible, collapsed by default */}
        <EarningsQualityCompact data={data} />

        {/* Footer */}
        <FooterSection data={data} />
      </div>

      {/* Snapshot Sidebar - Bloomberg-style persistent sidebar */}
      <SnapshotSidebar data={data} />
    </div>
  );
}
