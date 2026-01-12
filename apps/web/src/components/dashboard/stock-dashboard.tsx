'use client';

import Link from 'next/link';
import {
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Search,
  Calculator,
  Shield,
  Award,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useStock } from '@/hooks/use-stock';
import type { StockDetailResponse, Signal as APISignal } from '@recon/shared';

function getPiotroskiLabel(score: number): string {
  if (score >= 7) return 'Strong';
  if (score >= 4) return 'Moderate';
  return 'Weak';
}

function getOverallLabel(grade: string): string {
  const labels: Record<string, string> = {
    'A': 'Excellent',
    'B+': 'Very Good',
    'B': 'Good',
    'C': 'Average',
    'D': 'Below Average',
    'F': 'Poor',
  };
  return labels[grade] || grade;
}

function getOverallVariant(grade: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (grade === 'A' || grade === 'B+') return 'success';
  if (grade === 'B' || grade === 'C') return 'warning';
  return 'destructive';
}

function formatValuationRows(valuation: StockDetailResponse['valuation']) {
  return [
    { metric: 'P/E Ratio', current: valuation.pe.value, sectorMedian: valuation.pe.sectorMedian },
    { metric: 'Forward P/E', current: valuation.forwardPe.value, sectorMedian: valuation.forwardPe.sectorMedian },
    { metric: 'PEG Ratio', current: valuation.peg.value, sectorMedian: valuation.peg.sectorMedian },
    { metric: 'EV/EBITDA', current: valuation.evToEbitda.value, sectorMedian: valuation.evToEbitda.sectorMedian },
    { metric: 'P/FCF', current: valuation.priceToFcf.value, sectorMedian: valuation.priceToFcf.sectorMedian },
    { metric: 'P/B Ratio', current: valuation.priceToBook.value, sectorMedian: valuation.priceToBook.sectorMedian },
  ];
}

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

  const { company, quote, scores, signals, valuation, holdings } = data;
  const isPositive = quote.changePercent >= 0;
  const valuationRows = formatValuationRows(valuation);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{company.ticker}</h1>
            <span className="text-xl text-muted-foreground">{company.name}</span>
          </div>

          <div className="flex items-baseline gap-4">
            <span className="text-4xl font-bold">${quote.price.toFixed(2)}</span>
            <div
              className={`flex items-center gap-1 text-lg font-medium ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isPositive ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
              <span>${Math.abs(quote.change).toFixed(2)}</span>
              <span>({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span><span className="font-medium">Sector:</span> {company.sector}</span>
            <span><span className="font-medium">Industry:</span> {company.industry}</span>
            <span><span className="font-medium">Market Cap:</span> ${(quote.marketCap / 1e12).toFixed(2)}T</span>
            <span><span className="font-medium">52W Range:</span> ${quote.fiftyTwoWeekLow} - ${quote.fiftyTwoWeekHigh}</span>
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          icon={<Calculator className="h-4 w-4" />}
          title="Piotroski F-Score"
          value={`${scores.piotroski.score}/9`}
          badge={getPiotroskiLabel(scores.piotroski.score)}
          badgeVariant={scores.piotroski.score >= 7 ? 'success' : scores.piotroski.score >= 4 ? 'warning' : 'destructive'}
          tooltip="9-point fundamental strength score. 7+ is strong, 4-6 is moderate, below 4 is weak."
        />
        <ScoreCard
          icon={<TrendingUp className="h-4 w-4" />}
          title="Rule of 40"
          value={`${scores.ruleOf40.score.toFixed(0)}%`}
          badge={scores.ruleOf40.passed ? 'Passed' : 'Failed'}
          badgeVariant={scores.ruleOf40.passed ? 'success' : 'destructive'}
          tooltip="Revenue growth + profit margin should exceed 40%."
        />
        <ScoreCard
          icon={<Shield className="h-4 w-4" />}
          title="Altman Z-Score"
          value={scores.altmanZ.score.toFixed(2)}
          badge={scores.altmanZ.zone === 'safe' ? 'Safe' : scores.altmanZ.zone === 'gray' ? 'Gray Zone' : 'Distress'}
          badgeVariant={scores.altmanZ.zone === 'safe' ? 'success' : scores.altmanZ.zone === 'gray' ? 'warning' : 'destructive'}
          tooltip="Bankruptcy risk predictor. Above 2.99 is safe, 1.81-2.99 is gray zone."
        />
        <ScoreCard
          icon={<Award className="h-4 w-4" />}
          title="Overall Grade"
          value={scores.overallGrade}
          badge={getOverallLabel(scores.overallGrade)}
          badgeVariant={getOverallVariant(scores.overallGrade)}
          tooltip="Combined assessment of all fundamental metrics."
          highlighted
        />
      </div>

      {/* Signals Block */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Key Signals
            <Badge variant="outline" className="font-normal">
              {signals.length} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignalGroup
            title="Bullish"
            signals={signals.filter(s => s.type === 'bullish')}
            icon={<TrendingUp className="h-4 w-4" />}
            colorClass="text-green-600 bg-green-50 border-green-200"
          />
          <SignalGroup
            title="Warnings"
            signals={signals.filter(s => s.type === 'warning')}
            icon={<AlertTriangle className="h-4 w-4" />}
            colorClass="text-amber-600 bg-amber-50 border-amber-200"
          />
          <SignalGroup
            title="Bearish"
            signals={signals.filter(s => s.type === 'bearish')}
            icon={<TrendingDown className="h-4 w-4" />}
            colorClass="text-red-600 bg-red-50 border-red-200"
          />
        </CardContent>
      </Card>

      {/* Valuation & Holdings Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Valuation Table */}
        <Card>
          <CardHeader>
            <CardTitle>Valuation</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Sector</TableHead>
                  <TableHead className="text-right">vs Sector</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuationRows.map((row) => {
                  if (row.current === null || row.sectorMedian === null) {
                    return (
                      <TableRow key={row.metric}>
                        <TableCell className="font-medium">{row.metric}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.current !== null ? row.current.toFixed(1) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.sectorMedian !== null ? row.sectorMedian.toFixed(1) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-normal">N/A</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const diff = ((row.current - row.sectorMedian) / row.sectorMedian) * 100;
                  return (
                    <TableRow key={row.metric}>
                      <TableCell className="font-medium">{row.metric}</TableCell>
                      <TableCell className="text-right">{row.current.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.sectorMedian.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={diff < -10 ? 'success' : diff > 10 ? 'destructive' : 'secondary'}
                          className="font-normal"
                        >
                          {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Holdings Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Institutional Holdings</CardTitle>
              <Badge variant="outline" className="font-normal">
                {(holdings.totalInstitutionalOwnership * 100).toFixed(0)}% institutional
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.topInstitutional.slice(0, 5).map((holder) => (
                  <TableRow key={holder.fundCik}>
                    <TableCell className="font-medium">{holder.fundName}</TableCell>
                    <TableCell className="text-right">
                      ${(holder.value / 1e9).toFixed(1)}B
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={holder.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {holder.changePercent >= 0 ? '+' : ''}{holder.changePercent.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="pt-4 border-t text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span>Quote: {new Date(data.meta.priceAsOf).toLocaleDateString()}</span>
          <span>Financials: {data.meta.fundamentalsAsOf}</span>
          <span>Holdings: {data.meta.holdingsAsOf}</span>
        </div>
      </footer>
    </div>
  );
}

interface ScoreCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  badge: string;
  badgeVariant: 'success' | 'warning' | 'destructive' | 'secondary';
  tooltip: string;
  highlighted?: boolean;
}

function ScoreCard({ icon, title, value, badge, badgeVariant, tooltip, highlighted }: ScoreCardProps) {
  return (
    <Card className={highlighted ? 'border-primary/50 bg-primary/5' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <span className="text-primary">{icon}</span>
          {title}
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/70" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <Badge variant={badgeVariant} className="mt-2">
          {badge}
        </Badge>
      </CardContent>
    </Card>
  );
}

interface SignalGroupProps {
  title: string;
  signals: APISignal[];
  icon: React.ReactNode;
  colorClass: string;
}

function SignalGroup({ title, signals, icon, colorClass }: SignalGroupProps) {
  if (signals.length === 0) return null;

  return (
    <div>
      <h4 className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${colorClass.split(' ')[0]}`}>
        {icon}
        {title} ({signals.length})
      </h4>
      <ul className="space-y-2">
        {signals.map((signal, index) => (
          <li key={index} className={`text-sm p-3 rounded-md border ${colorClass}`}>
            <div className="flex items-start justify-between gap-2">
              <span>{signal.message}</span>
              <Badge variant="outline" className="shrink-0 text-xs">
                {signal.category}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
