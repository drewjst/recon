'use client';

import { memo, useMemo } from 'react';
import { Info, ExternalLink } from 'lucide-react';
import { SectionCard } from './section-card';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { StockDetailResponse, AnalystEstimates } from '@recon/shared';

interface ConvictionScoresSectionProps {
  data: StockDetailResponse;
}

interface ScoreBoxProps {
  label: string;
  value: string;
  description: string;
  status: 'positive' | 'neutral' | 'negative';
  tooltip: string;
  learnMoreUrl?: string;
  /** Optional breakdown shown below description (e.g., "Growth: 25% + Margin: 27%") */
  breakdown?: string;
}

const statusColors = {
  positive: 'border-success/30 bg-success/5',
  neutral: 'border-border/50',
  negative: 'border-destructive/30 bg-destructive/5',
};

const valueColors = {
  positive: 'text-success',
  neutral: 'text-foreground',
  negative: 'text-destructive',
};

const ScoreBox = memo(function ScoreBox({ label, value, description, status, tooltip, learnMoreUrl, breakdown }: ScoreBoxProps) {
  return (
    <Card className={`p-4 text-center transition-all duration-300 ${statusColors[status]}`}>
      <div className="flex items-center justify-center gap-1 mb-2">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-1 hover:bg-muted/50 active:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-manipulation"
              aria-label={`Info about ${label}`}
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className="w-64 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">{tooltip}</p>
            {learnMoreUrl && (
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-medium"
              >
                Learn more
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className={`text-2xl font-bold font-mono mb-1 ${valueColors[status]}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
      {breakdown && (
        <div className="text-[10px] text-muted-foreground/70 mt-1 font-mono">{breakdown}</div>
      )}
    </Card>
  );
});

const getPiotroskiStatus = (score: number): 'positive' | 'neutral' | 'negative' => {
  if (score >= 7) return 'positive';
  if (score >= 4) return 'neutral';
  return 'negative';
};

const getAltmanStatus = (zone: string): 'positive' | 'neutral' | 'negative' => {
  if (zone === 'safe') return 'positive';
  if (zone === 'gray') return 'neutral';
  return 'negative';
};

interface AnalystConsensusProps {
  estimates: AnalystEstimates;
  currentPrice: number;
}

const AnalystConsensus = memo(function AnalystConsensus({ estimates, currentPrice }: AnalystConsensusProps) {
  const buyCount = estimates.strongBuyCount + estimates.buyCount;
  const holdCount = estimates.holdCount;
  const sellCount = estimates.sellCount + estimates.strongSellCount;
  const total = buyCount + holdCount + sellCount;

  if (total === 0) {
    return (
      <Card className="p-4 mt-4 border-border/50">
        <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Analyst Consensus</div>
        <div className="text-sm text-muted-foreground">No analyst coverage</div>
      </Card>
    );
  }

  const buyPercent = (buyCount / total) * 100;
  const holdPercent = (holdCount / total) * 100;
  const sellPercent = (sellCount / total) * 100;

  const targetPrice = estimates.priceTargetAverage;
  const upside = currentPrice > 0 ? ((targetPrice - currentPrice) / currentPrice) * 100 : 0;
  const isPositive = upside >= 0;

  return (
    <Card className="p-4 mt-4 border-border/50">
      <div className="flex items-center gap-1 mb-3">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">Analyst Consensus</div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-1 hover:bg-muted/50 active:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-manipulation"
              aria-label="Info about Analyst Consensus"
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-64 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Wall Street analyst ratings aggregated from major brokerages. Buy includes Strong Buy ratings, Sell includes Strong Sell ratings.
            </p>
          </PopoverContent>
        </Popover>
      </div>

      {/* Stacked bar */}
      <div className="h-2 rounded-full overflow-hidden flex mb-3">
        {buyPercent > 0 && (
          <div
            className="bg-success h-full"
            style={{ width: `${buyPercent}%` }}
          />
        )}
        {holdPercent > 0 && (
          <div
            className="bg-muted-foreground/40 h-full"
            style={{ width: `${holdPercent}%` }}
          />
        )}
        {sellPercent > 0 && (
          <div
            className="bg-destructive h-full"
            style={{ width: `${sellPercent}%` }}
          />
        )}
      </div>

      {/* Labels row */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-success font-medium">{buyCount}</span>
          <span className="text-muted-foreground"> Buy</span>
          <span className="text-muted-foreground mx-1.5">·</span>
          <span className="text-muted-foreground font-medium">{holdCount}</span>
          <span className="text-muted-foreground"> Hold</span>
          <span className="text-muted-foreground mx-1.5">·</span>
          <span className="text-destructive font-medium">{sellCount}</span>
          <span className="text-muted-foreground"> Sell</span>
        </div>

        {targetPrice > 0 && (
          <div className="text-right">
            <div className="text-sm font-medium">${targetPrice.toFixed(0)} Target</div>
            <div className={`text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{upside.toFixed(0)}% {isPositive ? 'upside' : 'downside'}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

function ConvictionScoresSectionComponent({ data }: ConvictionScoresSectionProps) {
  const { company, scores, analystEstimates, quote } = data;
  if (!scores) return null;

  const shareText = useMemo(() => {
    const piotroskiVerdict = scores.piotroski.score >= 7 ? 'Strong' : scores.piotroski.score >= 4 ? 'Moderate' : 'Weak';
    const ruleOf40Verdict = scores.ruleOf40.passed ? 'Passed' : 'Failed';
    const altmanVerdict = scores.altmanZ.zone === 'safe' ? 'Safe' : scores.altmanZ.zone === 'gray' ? 'Gray Zone' : 'Distress';

    const ruleOf40Breakdown = `Growth ${scores.ruleOf40.revenueGrowthPercent >= 0 ? '+' : ''}${scores.ruleOf40.revenueGrowthPercent.toFixed(0)}% + Margin ${scores.ruleOf40.profitMarginPercent >= 0 ? '+' : ''}${scores.ruleOf40.profitMarginPercent.toFixed(0)}%`;

    const metrics = [
      `Piotroski F-Score: ${scores.piotroski.score}/9 (${piotroskiVerdict})`,
      `Rule of 40: ${scores.ruleOf40.score.toFixed(0)}% (${ruleOf40Verdict}) [${ruleOf40Breakdown}]`,
      `Altman Z-Score: ${scores.altmanZ.score.toFixed(2)} (${altmanVerdict})`,
    ];

    if (analystEstimates && analystEstimates.analystCount > 0) {
      const buyCount = analystEstimates.strongBuyCount + analystEstimates.buyCount;
      const sellCount = analystEstimates.sellCount + analystEstimates.strongSellCount;
      metrics.push(`Analyst Rating: ${buyCount} Buy / ${analystEstimates.holdCount} Hold / ${sellCount} Sell`);
    }

    return `$${company.ticker} Financial Health\n\n${metrics.join('\n')}`;
  }, [scores, analystEstimates, company.ticker]);

  return (
    <SectionCard
      title="Financial Health Scores"
      shareTicker={company.ticker}
      shareText={shareText}
    >
      <div className="grid grid-cols-3 gap-4">
        <ScoreBox
          label="Piotroski"
          value={`${scores.piotroski.score}/9`}
          description={scores.piotroski.score >= 7 ? 'Strong' : scores.piotroski.score >= 4 ? 'Moderate' : 'Weak'}
          status={getPiotroskiStatus(scores.piotroski.score)}
          tooltip="9-point fundamental strength score based on profitability, leverage, and efficiency. 7-9 is strong, 0-3 is weak."
          learnMoreUrl="https://www.investopedia.com/terms/p/piotroski-score.asp"
        />
        <ScoreBox
          label="Rule of 40"
          value={`${scores.ruleOf40.score.toFixed(0)}%`}
          description={scores.ruleOf40.passed ? 'Passed' : 'Failed'}
          status={scores.ruleOf40.passed ? 'positive' : 'negative'}
          tooltip="Revenue growth % + profit margin % should exceed 40% for healthy growth companies. Balances growth against profitability."
          learnMoreUrl="https://www.wallstreetprep.com/knowledge/rule-of-40/"
          breakdown={`Growth: ${scores.ruleOf40.revenueGrowthPercent >= 0 ? '+' : ''}${scores.ruleOf40.revenueGrowthPercent.toFixed(0)}% + Margin: ${scores.ruleOf40.profitMarginPercent >= 0 ? '+' : ''}${scores.ruleOf40.profitMarginPercent.toFixed(0)}%`}
        />
        <ScoreBox
          label="Altman Z"
          value={scores.altmanZ.score.toFixed(2)}
          description={scores.altmanZ.zone === 'safe' ? 'Safe Zone' : scores.altmanZ.zone === 'gray' ? 'Gray Zone' : 'Distress'}
          status={getAltmanStatus(scores.altmanZ.zone)}
          tooltip="Bankruptcy risk predictor. Above 2.99 is safe, 1.81-2.99 is gray zone, below 1.81 indicates distress."
          learnMoreUrl="https://www.investopedia.com/terms/a/altman.asp"
        />
      </div>

      {analystEstimates && (
        <AnalystConsensus estimates={analystEstimates} currentPrice={quote.price} />
      )}
    </SectionCard>
  );
}

export const ConvictionScoresSection = memo(ConvictionScoresSectionComponent);
