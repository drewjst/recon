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
import { AreaChart } from '@tremor/react';

// Mock data for AAPL
const mockData = {
  company: {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
  },
  quote: {
    price: 185.92,
    change: 2.34,
    changePercent: 1.27,
    marketCap: 2890000000000,
    fiftyTwoWeekHigh: 199.62,
    fiftyTwoWeekLow: 164.08,
  },
  scores: {
    piotroski: { score: 8, label: 'Strong' },
    ruleOf40: { score: 52, passed: true },
    altmanZ: { score: 8.42, zone: 'safe' },
    overall: 'A',
  },
  signals: [
    { type: 'bullish', message: 'Strong Piotroski F-Score of 8 indicates solid fundamentals', category: 'Fundamental' },
    { type: 'bullish', message: 'Institutional ownership increased 3 consecutive quarters', category: 'Ownership' },
    { type: 'bullish', message: 'Altman Z-Score of 8.42 indicates excellent financial health', category: 'Fundamental' },
    { type: 'warning', message: 'P/E ratio 15% above sector median', category: 'Valuation' },
    { type: 'bearish', message: 'Revenue growth slowing vs prior year', category: 'Growth' },
  ],
  valuation: [
    { metric: 'P/E Ratio', current: 29.4, sectorMedian: 25.6 },
    { metric: 'Forward P/E', current: 27.8, sectorMedian: 23.2 },
    { metric: 'PEG Ratio', current: 2.1, sectorMedian: 1.8 },
    { metric: 'EV/EBITDA', current: 22.3, sectorMedian: 18.9 },
    { metric: 'P/FCF', current: 26.8, sectorMedian: 22.1 },
    { metric: 'P/B Ratio', current: 47.2, sectorMedian: 8.4 },
  ],
  holdings: [
    { name: 'Vanguard Group', shares: 1340000000, value: 249100000000, change: 2.3 },
    { name: 'BlackRock Inc.', shares: 1020000000, value: 189700000000, change: 1.1 },
    { name: 'Berkshire Hathaway', shares: 915000000, value: 170100000000, change: 0.0 },
    { name: 'State Street Corp', shares: 623000000, value: 115800000000, change: -0.8 },
    { name: 'FMR LLC (Fidelity)', shares: 412000000, value: 76600000000, change: 3.2 },
  ],
  revenueHistory: [
    { quarter: 'Q1 2024', Revenue: 119600 },
    { quarter: 'Q2 2024', Revenue: 94930 },
    { quarter: 'Q3 2024', Revenue: 85780 },
    { quarter: 'Q4 2024', Revenue: 89500 },
    { quarter: 'Q1 2025', Revenue: 124300 },
  ],
};

export default function StockDashboard() {
  const { company, quote, scores, signals, valuation, holdings, revenueHistory } = mockData;
  const isPositive = quote.changePercent >= 0;

  return (
    <div className="container py-8 space-y-8">
        {/* Header with Search */}
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

          <div className="flex gap-2 w-full lg:w-80">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search ticker..." className="pl-9" />
            </div>
            <Button>Distill</Button>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard
            icon={<Calculator className="h-4 w-4" />}
            title="Piotroski F-Score"
            value={`${scores.piotroski.score}/9`}
            badge={scores.piotroski.label}
            badgeVariant="success"
            tooltip="9-point fundamental strength score. 7+ is strong, 4-6 is moderate, below 4 is weak."
          />
          <ScoreCard
            icon={<TrendingUp className="h-4 w-4" />}
            title="Rule of 40"
            value={`${scores.ruleOf40.score}%`}
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
            value={scores.overall}
            badge="Excellent"
            badgeVariant="success"
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
                  {valuation.map((row) => {
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
                <Badge variant="outline" className="font-normal">73% institutional</Badge>
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
                  {holdings.map((holder) => (
                    <TableRow key={holder.name}>
                      <TableCell className="font-medium">{holder.name}</TableCell>
                      <TableCell className="text-right">
                        ${(holder.value / 1e9).toFixed(1)}B
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={holder.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {holder.change >= 0 ? '+' : ''}{holder.change.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart
              className="h-72"
              data={revenueHistory}
              index="quarter"
              categories={['Revenue']}
              colors={['orange']}
              valueFormatter={(value: number) => `$${(value / 1000).toFixed(1)}B`}
              showAnimation
              showLegend={false}
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="pt-4 border-t text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span>Quote: Real-time</span>
            <span>Financials: Q1 2025</span>
            <span>Holdings: Q4 2024</span>
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

interface Signal {
  type: string;
  message: string;
  category: string;
}

interface SignalGroupProps {
  title: string;
  signals: Signal[];
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
