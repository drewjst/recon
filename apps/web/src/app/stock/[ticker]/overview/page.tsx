'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AdvancedChart } from '@/components/dashboard/sections/advanced-chart';
import { SectionCard, DashboardDivider } from '@/components/dashboard/sections/section-card';
import { useStock } from '@/hooks/use-stock';
import type { StockDetailResponse } from '@recon/shared';

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export default function StockOverviewPage({ params }: PageProps) {
  const { ticker } = use(params);
  const { data, isLoading, error } = useStock(ticker);

  if (isLoading) {
    return (
      <div className="min-h-screen border-x border-border max-w-7xl mx-auto bg-background/50 shadow-sm px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-12 bg-muted rounded w-64" />
          <div className="h-[400px] bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen border-x border-border max-w-7xl mx-auto bg-background/50 shadow-sm px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-destructive">Error loading stock data</h2>
          <p className="text-muted-foreground mt-2">Could not load data for {ticker.toUpperCase()}</p>
          <Link href="/" className="text-primary hover:underline mt-4 inline-block">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen border-x border-border max-w-7xl mx-auto bg-background/50 shadow-sm px-4 sm:px-6 lg:px-8">
      <div className="py-8 space-y-6">
        {/* Back Button */}
        <Link
          href={`/?ticker=${ticker.toUpperCase()}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {ticker.toUpperCase()} Distill
        </Link>

        {/* Stock Header */}
        <StockHeader data={data} />

        <DashboardDivider />

        {/* TradingView Chart */}
        <AdvancedChart
          symbol={data.company.ticker}
          exchange={data.company.exchange}
          height={450}
        />

        <DashboardDivider />

        {/* Technical Indicators */}
        <TechnicalIndicatorsSection data={data} />

        <DashboardDivider />

        {/* Company Overview */}
        <CompanyOverviewSection data={data} />

        <DashboardDivider />

        {/* Key Statistics */}
        <KeyStatisticsSection data={data} />
      </div>
    </div>
  );
}

function StockHeader({ data }: { data: StockDetailResponse }) {
  const { company, quote } = data;
  const isPositive = quote.changePercent >= 0;

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toFixed(0)}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-3">
        <span className="font-bold text-3xl tracking-tight">{company.ticker}</span>
        <span className="text-muted-foreground text-xl">{company.name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-4xl font-bold font-mono tracking-tight">
          ${quote.price.toFixed(2)}
        </span>
        <span className={`flex items-center gap-1 text-xl font-mono ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
          {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
        </span>
      </div>
      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-2">
        <span>{company.sector}</span>
        <span className="text-border">•</span>
        <span>{company.industry}</span>
        <span className="text-border">•</span>
        <span className="font-mono">{formatMarketCap(quote.marketCap)}</span>
      </div>
    </div>
  );
}

function TechnicalIndicatorsSection({ data }: { data: StockDetailResponse }) {
  const { quote, performance } = data;

  const priceVs52High = ((quote.price / quote.fiftyTwoWeekHigh) * 100).toFixed(1);
  const priceVs52Low = ((quote.price / quote.fiftyTwoWeekLow) * 100).toFixed(1);
  const rangePosition = ((quote.price - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100;

  const formatVolume = (vol: number) => {
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
    return vol.toString();
  };

  const indicators = [
    {
      label: '52W Range',
      value: `${rangePosition.toFixed(0)}%`,
      subtext: rangePosition > 70 ? 'Near high' : rangePosition < 30 ? 'Near low' : 'Mid range',
      color: rangePosition > 70 ? 'text-success' : rangePosition < 30 ? 'text-destructive' : 'text-muted-foreground',
    },
    {
      label: 'Momentum (1M)',
      value: `${performance.month1Change > 0 ? '+' : ''}${performance.month1Change.toFixed(1)}%`,
      subtext: performance.month1Change > 5 ? 'Bullish' : performance.month1Change < -5 ? 'Bearish' : 'Neutral',
      color: performance.month1Change > 0 ? 'text-success' : 'text-destructive',
    },
    {
      label: 'YTD Trend',
      value: `${performance.ytdChange > 0 ? '+' : ''}${performance.ytdChange.toFixed(1)}%`,
      subtext: performance.ytdChange > 0 ? 'Uptrend' : 'Downtrend',
      color: performance.ytdChange > 0 ? 'text-success' : 'text-destructive',
    },
    {
      label: 'Volume',
      value: formatVolume(quote.volume),
      subtext: 'Today',
      color: 'text-muted-foreground',
    },
    {
      label: '52W High',
      value: `$${quote.fiftyTwoWeekHigh.toFixed(2)}`,
      subtext: `${priceVs52High}% of high`,
      color: 'text-muted-foreground',
    },
    {
      label: '52W Low',
      value: `$${quote.fiftyTwoWeekLow.toFixed(2)}`,
      subtext: `${priceVs52Low}% above low`,
      color: 'text-muted-foreground',
    },
  ];

  return (
    <SectionCard title="Technical Indicators">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {indicators.map((indicator) => (
          <Card key={indicator.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {indicator.label}
              </div>
              <div className={`text-lg font-bold font-mono ${indicator.color}`}>
                {indicator.value}
              </div>
              <div className="text-xs text-muted-foreground">
                {indicator.subtext}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionCard>
  );
}

function CompanyOverviewSection({ data }: { data: StockDetailResponse }) {
  const { company, financials } = data;

  return (
    <SectionCard title="Company Overview">
      {company.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {company.description}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sector</div>
          <div className="text-sm font-medium">{company.sector}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Industry</div>
          <div className="text-sm font-medium">{company.industry}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Exchange</div>
          <div className="text-sm font-medium">{company.exchange || 'N/A'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gross Margin</div>
          <div className="text-sm font-medium font-mono">{financials ? `${(financials.grossMargin * 100).toFixed(1)}%` : 'N/A'}</div>
        </div>
      </div>
    </SectionCard>
  );
}

function KeyStatisticsSection({ data }: { data: StockDetailResponse }) {
  const { quote, valuation, financials } = data;

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toFixed(0)}`;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
    return vol.toString();
  };

  const stats = [
    { label: 'Market Cap', value: formatMarketCap(quote.marketCap) },
    { label: 'Volume', value: formatVolume(quote.volume) },
    { label: '52W High', value: `$${quote.fiftyTwoWeekHigh.toFixed(2)}` },
    { label: '52W Low', value: `$${quote.fiftyTwoWeekLow.toFixed(2)}` },
    { label: 'P/E Ratio', value: valuation?.pe.value ? valuation.pe.value.toFixed(1) : 'N/A' },
    { label: 'Forward P/E', value: valuation?.forwardPe.value ? valuation.forwardPe.value.toFixed(1) : 'N/A' },
    { label: 'PEG Ratio', value: valuation?.peg.value ? valuation.peg.value.toFixed(2) : 'N/A' },
    { label: 'EV/EBITDA', value: valuation?.evToEbitda.value ? valuation.evToEbitda.value.toFixed(1) : 'N/A' },
    { label: 'ROE', value: financials ? `${(financials.roe * 100).toFixed(1)}%` : 'N/A' },
    { label: 'ROIC', value: financials ? `${(financials.roic * 100).toFixed(1)}%` : 'N/A' },
    { label: 'Debt/Equity', value: financials ? financials.debtToEquity.toFixed(2) : 'N/A' },
    { label: 'Current Ratio', value: financials ? financials.currentRatio.toFixed(2) : 'N/A' },
  ];

  return (
    <SectionCard title="Key Statistics">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {stat.label}
            </div>
            <div className="text-sm font-bold font-mono">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
