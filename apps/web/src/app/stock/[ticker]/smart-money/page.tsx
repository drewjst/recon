'use client';

import Link from 'next/link';
import { ArrowLeft, Users, UserCheck, Landmark } from 'lucide-react';
import { useEffect } from 'react';
import { useStock } from '@/hooks/use-stock';
import { CruxAIInsight } from '@/components/cruxai';
import { DashboardDivider } from '@/components/dashboard/sections/section-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  QuickStatsSection,
  InstitutionalTab,
  InsidersTab,
  CongressTab,
} from '@/components/smart-money';

interface PageProps {
  params: { ticker: string };
}

export default function SmartMoneyPage({ params }: PageProps) {
  const { ticker } = params;
  const { data, isLoading, error } = useStock(ticker);

  // Set dynamic page title
  useEffect(() => {
    if (data?.company.name) {
      document.title = `${ticker.toUpperCase()} Smart Money Activity | Crux`;
    }
  }, [data, ticker]);

  if (isLoading) {
    return (
      <div className="min-h-screen border-x border-border max-w-4xl mx-auto bg-background/50 shadow-sm px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen border-x border-border max-w-4xl mx-auto bg-background/50 shadow-sm px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-destructive">
            Error loading smart money data
          </h2>
          <p className="text-muted-foreground mt-2">
            Could not load smart money data for {ticker.toUpperCase()}
          </p>
          <Link
            href={`/stock/${ticker.toUpperCase()}`}
            className="text-primary hover:underline mt-4 inline-block"
          >
            Return to stock page
          </Link>
        </div>
      </div>
    );
  }

  // Determine default tab based on data availability
  const hasCongressActivity = (data.congressTrades?.length ?? 0) > 0;
  const defaultTab = hasCongressActivity ? 'congress' : 'institutional';

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
            Smart Money Activity
          </h1>
          <p className="text-muted-foreground">{data.company.name}</p>
        </div>

        {/* CruxAI Smart Money Summary */}
        <CruxAIInsight ticker={ticker} section="smart-money-summary" />

        {/* Quick Stats Cards */}
        <QuickStatsSection data={data} />

        <DashboardDivider />

        {/* Tabbed Content */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="institutional" className="gap-1.5">
              <Users className="h-4 w-4" />
              Institutional
            </TabsTrigger>
            <TabsTrigger value="insiders" className="gap-1.5">
              <UserCheck className="h-4 w-4" />
              Insiders
            </TabsTrigger>
            <TabsTrigger value="congress" className="gap-1.5">
              <Landmark className="h-4 w-4" />
              Congress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="institutional">
            <InstitutionalTab data={data} />
          </TabsContent>

          <TabsContent value="insiders">
            <InsidersTab data={data} />
          </TabsContent>

          <TabsContent value="congress">
            <CongressTab data={data} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
