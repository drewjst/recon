'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useStock } from '@/hooks/use-stock';
import {
  HeaderSection,
  PerformanceSection,
  ConvictionScoresSection,
  SignalsSection,
  GrowthSection,
  ValuationSection,
  SmartMoneySection,
  FooterSection,
  DashboardDivider,
} from './sections';

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
      <PerformanceSection data={data} />

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
