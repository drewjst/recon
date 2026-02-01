'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useValuation } from '@/hooks/use-valuation';
import { CruxAIInsight } from '@/components/cruxai';
import { ValuationHeroSection } from '@/components/valuation/valuation-hero-section';
import { KeyMetricsSection } from '@/components/valuation/key-metrics-section';
import { HistoricalChartSection } from '@/components/valuation/historical-chart-section';
import { PeerComparisonSection } from '@/components/valuation/peer-comparison-section';
import { GrowthJustificationSection } from '@/components/valuation/growth-justification-section';
import { DCFSection } from '@/components/valuation/dcf-section';
import { ValuationSignalsSection } from '@/components/valuation/valuation-signals-section';
import { DashboardDivider } from '@/components/dashboard/sections/section-card';

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export default function ValuationPage({ params }: PageProps) {
  const { ticker } = use(params);
  const { data, isLoading, error } = useValuation(ticker);

  if (isLoading) {
    return (
      <div className="min-h-screen border-x border-border max-w-4xl mx-auto bg-background/50 shadow-sm px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-80 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen border-x border-border max-w-4xl mx-auto bg-background/50 shadow-sm px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-destructive">Error loading valuation data</h2>
          <p className="text-muted-foreground mt-2">Could not load valuation data for {ticker.toUpperCase()}</p>
          <Link href={`/stock/${ticker.toUpperCase()}`} className="text-primary hover:underline mt-4 inline-block">
            Return to stock page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen border-x border-border max-w-4xl mx-auto bg-background/50 shadow-sm px-4 sm:px-6 lg:px-8">
      <div className="py-8 space-y-6">
        {/* Back Link */}
        <Link
          href={`/stock/${ticker.toUpperCase()}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {ticker.toUpperCase()}
        </Link>

        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {data.ticker} Valuation Deep Dive
          </h1>
          <p className="text-muted-foreground">{data.companyName}</p>
        </div>

        {/* CruxAI Valuation Summary */}
        <CruxAIInsight ticker={ticker} section="valuation-summary" />

        {/* 1. Valuation Verdict Hero */}
        <ValuationHeroSection data={data} />

        <DashboardDivider />

        {/* 2. Key Metrics Table */}
        <KeyMetricsSection data={data} />

        <DashboardDivider />

        {/* 3. Historical Valuation Chart */}
        <HistoricalChartSection data={data} />

        <DashboardDivider />

        {/* 4 & 5. Peer Comparison (full width) + Growth Justification (below) */}
        <div className="space-y-6">
          <PeerComparisonSection data={data} />
          <GrowthJustificationSection data={data} />
        </div>

        <DashboardDivider />

        {/* 6. DCF & Intrinsic Value (includes Owner Earnings) */}
        <DCFSection data={data} />

        <DashboardDivider />

        {/* 7. Valuation Signals Summary */}
        <ValuationSignalsSection data={data} />
      </div>
    </div>
  );
}
