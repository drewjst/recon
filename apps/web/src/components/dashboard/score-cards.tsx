import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Info, ExternalLink } from 'lucide-react';
import type { Scores } from '@recon/shared';

interface ScoreCardsProps {
  scores: Scores;
  isLoading?: boolean;
}

export function ScoreCards({ scores, isLoading }: ScoreCardsProps) {
  if (isLoading) {
    return <ScoreCardsSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PiotroskiCard score={scores.piotroski} />
        <RuleOf40Card score={scores.ruleOf40} />
        <AltmanZCard score={scores.altmanZ} />
        <DCFCard dcf={scores.dcfValuation} />
      </div>
    </TooltipProvider>
  );
}

function ScoreCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-5 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PiotroskiCard({ score }: { score: Scores['piotroski'] }) {
  const variant = score.score >= 7 ? 'success' : score.score >= 4 ? 'warning' : 'destructive';
  const label = score.score >= 7 ? 'Strong' : score.score >= 4 ? 'Moderate' : 'Weak';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
          Piotroski F-Score
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>9-point fundamental strength score. 7+ is strong, 4-6 is moderate, below 4 is weak.</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{score.score}/9</div>
        <Badge variant={variant} className="mt-2">
          {label}
        </Badge>
      </CardContent>
    </Card>
  );
}

function RuleOf40Card({ score }: { score: Scores['ruleOf40'] }) {
  const variant = score.passed ? 'success' : 'destructive';
  const displayScore = score.score.toFixed(0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
          Rule of 40
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Revenue growth + profit margin should exceed 40%. A SaaS health metric.</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{displayScore}%</div>
        <Badge variant={variant} className="mt-2">
          {score.passed ? 'Passed' : 'Failed'}
        </Badge>
      </CardContent>
    </Card>
  );
}

function AltmanZCard({ score }: { score: Scores['altmanZ'] }) {
  const variant =
    score.zone === 'safe' ? 'success' : score.zone === 'gray' ? 'warning' : 'destructive';
  const label = score.zone === 'safe' ? 'Safe' : score.zone === 'gray' ? 'Gray Zone' : 'Distress';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
          Altman Z-Score
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Bankruptcy risk predictor. Above 2.99 is safe, 1.81-2.99 is gray zone, below 1.81 is distress.</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{score.score.toFixed(2)}</div>
        <Badge variant={variant} className="mt-2">
          {label}
        </Badge>
      </CardContent>
    </Card>
  );
}

function DCFCard({ dcf }: { dcf: Scores['dcfValuation'] }) {
  const getVariant = (assessment: string) => {
    if (assessment === 'Undervalued') return 'success';
    if (assessment === 'Fairly Valued') return 'secondary';
    if (assessment === 'Overvalued') return 'destructive';
    return 'outline';
  };

  const formatPrice = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
          DCF Valuation
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="mb-2">Discounted Cash Flow intrinsic value vs current price. Undervalued if DCF is 15%+ above price, Overvalued if 15%+ below.</p>
              <a
                href="https://www.investopedia.com/terms/d/dcf.asp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-medium"
              >
                Learn more
                <ExternalLink className="h-3 w-3" />
              </a>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{formatPrice(dcf.intrinsicValue)}</div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={getVariant(dcf.assessment)}>
            {dcf.assessment}
          </Badge>
          {dcf.differencePercent !== 0 && (
            <span className="text-xs text-muted-foreground">
              {formatPercent(dcf.differencePercent)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
