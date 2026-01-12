'use client';

import dynamic from 'next/dynamic';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useStock } from '@/hooks/use-stock';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HeaderSection,
  ConvictionScoresSection,
  DashboardDivider,
} from './sections';

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

const GrowthSection = dynamic(
  () => import('./sections/growth-section').then((mod) => mod.GrowthSection),
  { loading: () => <SectionSkeleton /> }
);

const ValuationSection = dynamic(
  () => import('./sections/valuation-section').then((mod) => mod.ValuationSection),
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
}

export function StockDashboard({ ticker }: StockDashboardProps) {
  const { data, isLoading, error } = useStock(ticker);

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
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Failed to load stock data</h2>
        <p className="mt-2 text-muted-foreground">
          {error instanceof Error ? error.message : 'Unable to fetch data for this ticker'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <HeaderSection data={data} />

      <DashboardDivider />
      <ConvictionScoresSection data={data} />

      <DashboardDivider />
      <SignalsSection data={data} />

      <DashboardDivider />
      <GrowthSection data={data} />

      <DashboardDivider />
      <ValuationSection data={data} />

      <DashboardDivider />
      <SmartMoneySection data={data} />

      <DashboardDivider />
      <FooterSection data={data} />
    </div>
  );
}
