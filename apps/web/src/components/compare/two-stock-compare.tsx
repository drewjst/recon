'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { ArrowUp, ArrowDown, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { InlineShareLinks } from '@/components/ui/share-button';
import { cn, formatCompactCurrency } from '@/lib/utils';
import {
  formatMarketCap,
  formatSignedCurrency,
  determineWinner,
  COMPARE_METRICS,
  getNestedValue,
  findWinner,
} from '@/lib/compare-utils';
import type { StockDetailResponse, RankingResult } from '@recon/shared';

const BASE_URL = 'https://cruxit.finance';

interface TwoStockCompareProps {
  left: StockDetailResponse;
  right: StockDetailResponse;
  rankings: RankingResult[];
}

export const TwoStockCompare = memo(function TwoStockCompare({
  left,
  right,
  rankings,
}: TwoStockCompareProps) {
  const tickers = [left.company.ticker, right.company.ticker];
  const shareUrl = `${BASE_URL}/compare/${tickers.join('/')}`;

  // Build share text for financial health scores
  const financialHealthShareText = useMemo(() => {
    const leftTicker = left.company.ticker;
    const rightTicker = right.company.ticker;
    const leftPiotroski = left.scores?.piotroski.score;
    const rightPiotroski = right.scores?.piotroski.score;
    const leftRuleOf40 = left.scores?.ruleOf40.score;
    const rightRuleOf40 = right.scores?.ruleOf40.score;
    const leftAltmanZ = left.scores?.altmanZ.score;
    const rightAltmanZ = right.scores?.altmanZ.score;

    return `Financial Health: $${leftTicker} vs $${rightTicker}\n` +
      `Piotroski: ${leftPiotroski ?? '-'}/9 vs ${rightPiotroski ?? '-'}/9\n` +
      `Rule of 40: ${leftRuleOf40 != null ? `${leftRuleOf40.toFixed(0)}%` : '-'} vs ${rightRuleOf40 != null ? `${rightRuleOf40.toFixed(0)}%` : '-'}\n` +
      `Altman Z: ${leftAltmanZ?.toFixed(2) ?? '-'} vs ${rightAltmanZ?.toFixed(2) ?? '-'}`;
  }, [left, right]);

  return (
    <div className="space-y-6">
      {/* Stock Headers */}
      <div className="grid grid-cols-2 gap-8">
        <StockHeader stock={left} align="right" />
        <StockHeader stock={right} align="left" />
      </div>

      {/* Summary at top */}
      <SummarySection left={left} right={right} rankings={rankings} />

      {/* Comparison Sections */}
      <Card>
        <CardContent className="p-0">
          {/* Financial Health Scores - matches Conviction Scores in single stock view */}
          <CompareSection
            title="FINANCIAL HEALTH SCORES"
            headerRight={<InlineShareLinks text={financialHealthShareText} url={shareUrl} />}
          >
            <ScoreBarRow
              label="Piotroski"
              leftValue={left.scores?.piotroski.score}
              rightValue={right.scores?.piotroski.score}
              maxValue={9}
              format={(v) => `${v}/9`}
            />
            <ScoreBarRow
              label="Rule of 40"
              leftValue={left.scores?.ruleOf40.score}
              rightValue={right.scores?.ruleOf40.score}
              maxValue={100}
              format={(v) => `${v.toFixed(0)}%`}
            />
            <ScoreBarRow
              label="Altman Z"
              leftValue={left.scores?.altmanZ.score}
              rightValue={right.scores?.altmanZ.score}
              maxValue={15}
              format={(v) => v.toFixed(2)}
            />
          </CompareSection>

          {/* Signals Summary */}
          <SignalsSummary left={left} right={right} />

          {/* Valuation Section */}
          <CompareSection title="VALUATION">
            <MetricRow
              label="P/E"
              leftValue={left.valuation?.pe.value}
              rightValue={right.valuation?.pe.value}
              format={(v) => v.toFixed(1)}
              lowerIsBetter
              showUnprofitableForNegative
            />
            <MetricRow
              label="Forward P/E"
              leftValue={left.valuation?.forwardPe.value}
              rightValue={right.valuation?.forwardPe.value}
              format={(v) => v.toFixed(1)}
              lowerIsBetter
              showUnprofitableForNegative
            />
            <MetricRow
              label="PEG Ratio"
              leftValue={left.valuation?.peg.value}
              rightValue={right.valuation?.peg.value}
              format={(v) => v.toFixed(2)}
              lowerIsBetter
              showUnprofitableForNegative
            />
            <MetricRow
              label="EV/EBITDA"
              leftValue={left.valuation?.evToEbitda.value}
              rightValue={right.valuation?.evToEbitda.value}
              format={(v) => v.toFixed(1)}
              lowerIsBetter
              showUnprofitableForNegative
            />
            <MetricRow
              label="Price/FCF"
              leftValue={left.valuation?.priceToFcf.value}
              rightValue={right.valuation?.priceToFcf.value}
              format={(v) => v.toFixed(1)}
              lowerIsBetter
              showUnprofitableForNegative
            />
            <MetricRow
              label="Price/Book"
              leftValue={left.valuation?.priceToBook.value}
              rightValue={right.valuation?.priceToBook.value}
              format={(v) => v.toFixed(2)}
              lowerIsBetter
              showUnprofitableForNegative
            />
          </CompareSection>

          {/* Growth Section */}
          <CompareSection title="GROWTH">
            <MetricRow
              label="Revenue YoY"
              leftValue={left.growth?.revenueGrowthYoY.value}
              rightValue={right.growth?.revenueGrowthYoY.value}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <MetricRow
              label="EPS YoY"
              leftValue={left.growth?.epsGrowthYoY.value}
              rightValue={right.growth?.epsGrowthYoY.value}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <MetricRow
              label="Proj. EPS Growth"
              leftValue={left.growth?.projectedEpsGrowth?.value}
              rightValue={right.growth?.projectedEpsGrowth?.value}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <MetricRow
              label="Cash Flow YoY"
              leftValue={left.growth?.cashFlowGrowthYoY?.value}
              rightValue={right.growth?.cashFlowGrowthYoY?.value}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
          </CompareSection>

          {/* Margins & Returns Section */}
          <CompareSection title="MARGINS & RETURNS">
            <MetricRow
              label="Gross Margin"
              leftValue={left.profitability?.grossMargin?.value}
              rightValue={right.profitability?.grossMargin?.value}
              format={(v) => `${v.toFixed(1)}%`}
            />
            <MetricRow
              label="Op. Margin"
              leftValue={left.profitability?.operatingMargin.value}
              rightValue={right.profitability?.operatingMargin.value}
              format={(v) => `${v.toFixed(1)}%`}
            />
            <MetricRow
              label="Net Margin"
              leftValue={left.profitability?.netMargin?.value}
              rightValue={right.profitability?.netMargin?.value}
              format={(v) => `${v.toFixed(1)}%`}
            />
            <MetricRow
              label="ROE"
              leftValue={left.profitability?.roe.value}
              rightValue={right.profitability?.roe.value}
              format={(v) => `${v.toFixed(1)}%`}
            />
            <MetricRow
              label="ROIC"
              leftValue={left.profitability?.roic.value}
              rightValue={right.profitability?.roic.value}
              format={(v) => `${v.toFixed(1)}%`}
            />
          </CompareSection>

          {/* Operating Metrics Section */}
          <CompareSection title="OPERATING METRICS">
            <MetricRow
              label="Rev/Employee"
              leftValue={left.earningsQuality?.revenuePerEmployee?.value}
              rightValue={right.earningsQuality?.revenuePerEmployee?.value}
              format={(v) => formatCompactCurrency(v)}
            />
            <MetricRow
              label="Income/Employee"
              leftValue={left.earningsQuality?.incomePerEmployee?.value}
              rightValue={right.earningsQuality?.incomePerEmployee?.value}
              format={(v) => formatCompactCurrency(v)}
            />
            <MetricRow
              label="Accrual Ratio"
              leftValue={left.earningsQuality?.accrualRatio.value}
              rightValue={right.earningsQuality?.accrualRatio.value}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
              lowerIsBetter
            />
            <MetricRow
              label="Buyback Yield"
              leftValue={left.earningsQuality?.buybackYield.value}
              rightValue={right.earningsQuality?.buybackYield.value}
              format={(v) => `${v.toFixed(2)}%`}
            />
          </CompareSection>

          {/* Balance Sheet Section */}
          <CompareSection title="BALANCE SHEET">
            <MetricRow
              label="Debt/Equity"
              leftValue={left.financialHealth?.debtToEquity.value}
              rightValue={right.financialHealth?.debtToEquity.value}
              format={(v) => `${v.toFixed(2)}x`}
              lowerIsBetter
            />
            <MetricRow
              label="Current Ratio"
              leftValue={left.financialHealth?.currentRatio.value}
              rightValue={right.financialHealth?.currentRatio.value}
              format={(v) => `${v.toFixed(2)}x`}
            />
            <MetricRow
              label="Asset Turnover"
              leftValue={left.financialHealth?.assetTurnover.value}
              rightValue={right.financialHealth?.assetTurnover.value}
              format={(v) => `${v.toFixed(2)}x`}
            />
          </CompareSection>

          {/* Smart Money Section */}
          <CompareSection title="SMART MONEY">
            <MetricRow
              label="Inst. Ownership"
              leftValue={left.holdings?.totalInstitutionalOwnership}
              rightValue={right.holdings?.totalInstitutionalOwnership}
              format={(v) => `${(v * 100).toFixed(1)}%`}
            />
            <MetricRow
              label="Accum. Quarters"
              leftValue={left.holdings?.netChangeQuarters}
              rightValue={right.holdings?.netChangeQuarters}
              format={(v) => `${v > 0 ? '+' : ''}${v}`}
            />
            <InsiderRow left={left} right={right} />
          </CompareSection>

          {/* Analyst Estimates Section */}
          <CompareSection title="ANALYST CONSENSUS">
            <AnalystRatingRow left={left} right={right} />
            <AnalystBreakdownRow left={left} right={right} />
            <TargetUpsideRow left={left} right={right} />
            <MetricRow
              label="EPS Growth Est."
              leftValue={left.analystEstimates?.epsGrowthNextYear}
              rightValue={right.analystEstimates?.epsGrowthNextYear}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <MetricRow
              label="Rev Growth Est."
              leftValue={left.analystEstimates?.revenueGrowthNextYear}
              rightValue={right.analystEstimates?.revenueGrowthNextYear}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
          </CompareSection>

          {/* Performance Section */}
          <CompareSection title="PERFORMANCE">
            <MetricRow
              label="1D Change"
              leftValue={left.performance?.day1Change}
              rightValue={right.performance?.day1Change}
              format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <MetricRow
              label="1W Change"
              leftValue={left.performance?.week1Change}
              rightValue={right.performance?.week1Change}
              format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <MetricRow
              label="1M Change"
              leftValue={left.performance?.month1Change}
              rightValue={right.performance?.month1Change}
              format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <MetricRow
              label="YTD Return"
              leftValue={left.performance?.ytdChange}
              rightValue={right.performance?.ytdChange}
              format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <MetricRow
              label="1Y Return"
              leftValue={left.performance?.year1Change}
              rightValue={right.performance?.year1Change}
              format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <MetricRow
              label="% of 52W High"
              leftValue={left.performance?.percentOf52WeekHigh}
              rightValue={right.performance?.percentOf52WeekHigh}
              format={(v) => `${v.toFixed(0)}%`}
            />
          </CompareSection>
        </CardContent>
      </Card>
    </div>
  );
});

function StockHeader({ stock, align }: { stock: StockDetailResponse; align: 'left' | 'right' }) {
  const { company, quote } = stock;
  const isPositive = quote.changePercent >= 0;

  return (
    <Link href={`/stock/${company.ticker}/overview`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className={cn('p-6', align === 'right' ? 'text-right' : 'text-left')}>
          <div className="text-2xl font-bold">{company.ticker}</div>
          <div className="text-sm text-muted-foreground truncate">{company.name}</div>
          <div className="text-3xl font-bold font-mono mt-2">${quote.price.toFixed(2)}</div>
          <div className={cn(
            'flex items-center gap-1 text-sm font-mono mt-1',
            align === 'right' ? 'justify-end' : 'justify-start',
            isPositive ? 'text-positive' : 'text-negative'
          )}>
            {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatMarketCap(quote.marketCap)} · {company.sector}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CompareSection({
  title,
  children,
  headerRight,
}: {
  title: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="bg-muted/50 px-4 py-2 flex items-center justify-center relative">
        <span className="text-xs font-semibold tracking-widest text-primary">{title}</span>
        {headerRight && (
          <div className="absolute right-2">{headerRight}</div>
        )}
      </div>
      <div className="divide-y divide-border/50">
        {children}
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  leftValue: number | null | undefined;
  rightValue: number | null | undefined;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
  /** If true, negative values are shown as "—" with "(unprofitable)" label */
  showUnprofitableForNegative?: boolean;
}

function MetricRow({ label, leftValue, rightValue, format, lowerIsBetter, showUnprofitableForNegative }: MetricRowProps) {
  // For metrics where negative is invalid (like P/E), treat them as null for winner calculation
  const effectiveLeft = showUnprofitableForNegative && leftValue != null && leftValue <= 0 ? null : leftValue;
  const effectiveRight = showUnprofitableForNegative && rightValue != null && rightValue <= 0 ? null : rightValue;

  const winner = determineWinner(effectiveLeft, effectiveRight, !lowerIsBetter);
  const leftWins = winner === 'left';
  const rightWins = winner === 'right';

  const formatValue = (value: number | null | undefined, isWinner: boolean) => {
    if (value == null) return '-';
    if (showUnprofitableForNegative && value <= 0) {
      return (
        <span className="text-muted-foreground">
          — <span className="text-xs">(unprofitable)</span>
        </span>
      );
    }
    return format(value);
  };

  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center py-2 px-4">
      <div className={cn(
        'text-right font-mono',
        leftWins && 'text-positive font-semibold'
      )}>
        {formatValue(leftValue, leftWins)}
        {leftWins && <Trophy className="inline ml-1 h-3 w-3 text-warning" />}
      </div>
      <div className="text-center text-sm text-muted-foreground">{label}</div>
      <div className={cn(
        'text-left font-mono',
        rightWins && 'text-positive font-semibold'
      )}>
        {rightWins && <Trophy className="inline mr-1 h-3 w-3 text-warning" />}
        {formatValue(rightValue, rightWins)}
      </div>
    </div>
  );
}

interface ScoreBarRowProps {
  label: string;
  leftValue: number | null | undefined;
  rightValue: number | null | undefined;
  maxValue: number;
  format: (v: number) => string;
}

function ScoreBarRow({ label, leftValue, rightValue, maxValue, format }: ScoreBarRowProps) {
  const leftPercent = leftValue != null ? Math.min((leftValue / maxValue) * 100, 100) : 0;
  const rightPercent = rightValue != null ? Math.min((rightValue / maxValue) * 100, 100) : 0;

  const leftWins = leftValue != null && rightValue != null && leftValue > rightValue;
  const rightWins = leftValue != null && rightValue != null && rightValue > leftValue;

  return (
    <div className="py-2 px-4">
      <div className="text-center text-sm text-muted-foreground mb-1">{label}</div>
      <div className="grid grid-cols-[1fr_40px_1fr] items-center gap-2">
        {/* Left bar (grows right-to-left) */}
        <div className="flex items-center justify-end gap-2">
          <span className={cn(
            'font-mono text-sm',
            leftWins && 'text-positive font-semibold'
          )}>
            {leftValue != null ? format(leftValue) : '-'}
          </span>
          <div className="w-24 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all float-right',
                leftWins ? 'bg-positive' : 'bg-primary/60'
              )}
              style={{ width: `${leftPercent}%` }}
            />
          </div>
        </div>

        {/* Center spacer */}
        <div className="text-center text-xs text-muted-foreground">vs</div>

        {/* Right bar (grows left-to-right) */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                rightWins ? 'bg-positive' : 'bg-primary/60'
              )}
              style={{ width: `${rightPercent}%` }}
            />
          </div>
          <span className={cn(
            'font-mono text-sm',
            rightWins && 'text-positive font-semibold'
          )}>
            {rightValue != null ? format(rightValue) : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}


function InsiderRow({ left, right }: { left: StockDetailResponse; right: StockDetailResponse }) {
  const leftActivity = left.insiderActivity;
  const rightActivity = right.insiderActivity;

  const formatInsider = (activity: typeof leftActivity) => {
    if (!activity) return '-';
    const buys = activity.buyCount90d;
    const sells = activity.sellCount90d;
    const net = activity.netValue90d;
    return (
      <div className="text-xs space-y-0.5">
        <div className="text-positive">{buys} buys</div>
        <div className="text-negative">{sells} sells</div>
        <div className={net >= 0 ? 'text-positive' : 'text-negative'}>
          Net: {formatSignedCurrency(net)}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center py-2 px-4">
      <div className="text-right">{formatInsider(leftActivity)}</div>
      <div className="text-center text-sm text-muted-foreground">Insider 90d</div>
      <div className="text-left">{formatInsider(rightActivity)}</div>
    </div>
  );
}

function AnalystRatingRow({ left, right }: { left: StockDetailResponse; right: StockDetailResponse }) {
  const getRatingColor = (score: number | undefined) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 4) return 'text-positive';
    if (score >= 3) return 'text-warning';
    return 'text-negative';
  };

  const leftScore = left.analystEstimates?.ratingScore;
  const rightScore = right.analystEstimates?.ratingScore;
  const leftWins = leftScore && rightScore && leftScore > rightScore;
  const rightWins = rightScore && leftScore && rightScore > leftScore;

  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center py-2 px-4">
      <div className={cn('text-right', leftWins && 'font-semibold')}>
        {left.analystEstimates ? (
          <span className={getRatingColor(leftScore)}>
            {left.analystEstimates.rating}
            {leftWins && <Trophy className="inline ml-1 h-3 w-3 text-warning" />}
          </span>
        ) : '-'}
      </div>
      <div className="text-center text-sm text-muted-foreground">Rating</div>
      <div className={cn('text-left', rightWins && 'font-semibold')}>
        {right.analystEstimates ? (
          <span className={getRatingColor(rightScore)}>
            {rightWins && <Trophy className="inline mr-1 h-3 w-3 text-warning" />}
            {right.analystEstimates.rating}
          </span>
        ) : '-'}
      </div>
    </div>
  );
}

function AnalystBreakdownRow({ left, right }: { left: StockDetailResponse; right: StockDetailResponse }) {
  const formatBreakdown = (estimates: typeof left.analystEstimates) => {
    if (!estimates) return '-';
    const buy = (estimates.strongBuyCount || 0) + (estimates.buyCount || 0);
    const hold = estimates.holdCount || 0;
    const sell = (estimates.sellCount || 0) + (estimates.strongSellCount || 0);
    return (
      <span className="text-xs">
        <span className="text-positive">{buy}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-warning">{hold}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-negative">{sell}</span>
      </span>
    );
  };

  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center py-2 px-4">
      <div className="text-right font-mono">{formatBreakdown(left.analystEstimates)}</div>
      <div className="text-center text-sm text-muted-foreground">Buy/Hold/Sell</div>
      <div className="text-left font-mono">{formatBreakdown(right.analystEstimates)}</div>
    </div>
  );
}

function TargetUpsideRow({ left, right }: { left: StockDetailResponse; right: StockDetailResponse }) {
  const calcUpside = (stock: StockDetailResponse) => {
    const target = stock.analystEstimates?.priceTargetAverage;
    const price = stock.quote.price;
    if (!target || !price) return null;
    return ((target - price) / price) * 100;
  };

  const leftUpside = calcUpside(left);
  const rightUpside = calcUpside(right);
  const leftWins = leftUpside !== null && rightUpside !== null && leftUpside > rightUpside;
  const rightWins = rightUpside !== null && leftUpside !== null && rightUpside > leftUpside;

  const formatUpside = (upside: number | null) => {
    if (upside === null) return '-';
    const sign = upside >= 0 ? '+' : '';
    const colorClass = upside >= 0 ? 'text-positive' : 'text-negative';
    return <span className={colorClass}>{sign}{upside.toFixed(0)}%</span>;
  };

  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center py-2 px-4">
      <div className={cn('text-right font-mono', leftWins && 'font-semibold')}>
        {formatUpside(leftUpside)}
        {leftWins && <Trophy className="inline ml-1 h-3 w-3 text-warning" />}
      </div>
      <div className="text-center text-sm text-muted-foreground">Target Upside</div>
      <div className={cn('text-left font-mono', rightWins && 'font-semibold')}>
        {rightWins && <Trophy className="inline mr-1 h-3 w-3 text-warning" />}
        {formatUpside(rightUpside)}
      </div>
    </div>
  );
}

function SignalsSummary({ left, right }: { left: StockDetailResponse; right: StockDetailResponse }) {
  const countSignals = (signals: typeof left.signals) => {
    const bullish = signals.filter(s => s.type === 'bullish').length;
    const bearish = signals.filter(s => s.type === 'bearish').length;
    const warning = signals.filter(s => s.type === 'warning').length;
    return { bullish, bearish, warning };
  };

  const leftSignals = countSignals(left.signals);
  const rightSignals = countSignals(right.signals);

  const leftWinsBullish = leftSignals.bullish > rightSignals.bullish;
  const rightWinsBullish = rightSignals.bullish > leftSignals.bullish;
  const leftWinsBearish = leftSignals.bearish < rightSignals.bearish; // Fewer bearish is better
  const rightWinsBearish = rightSignals.bearish < leftSignals.bearish;

  return (
    <CompareSection title="SIGNALS">
      <div className="grid grid-cols-[1fr_120px_1fr] items-center py-2 px-4">
        <div className={cn(
          'text-right font-mono',
          leftWinsBullish && 'text-positive font-semibold'
        )}>
          {leftSignals.bullish}
          {leftWinsBullish && <Trophy className="inline ml-1 h-3 w-3 text-warning" />}
        </div>
        <div className="text-center text-sm text-muted-foreground">Bullish</div>
        <div className={cn(
          'text-left font-mono',
          rightWinsBullish && 'text-positive font-semibold'
        )}>
          {rightWinsBullish && <Trophy className="inline mr-1 h-3 w-3 text-warning" />}
          {rightSignals.bullish}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_120px_1fr] items-center py-2 px-4">
        <div className={cn(
          'text-right font-mono',
          leftWinsBearish && 'text-positive font-semibold'
        )}>
          {leftSignals.bearish}
          {leftWinsBearish && <Trophy className="inline ml-1 h-3 w-3 text-warning" />}
        </div>
        <div className="text-center text-sm text-muted-foreground">Bearish</div>
        <div className={cn(
          'text-left font-mono',
          rightWinsBearish && 'text-positive font-semibold'
        )}>
          {rightWinsBearish && <Trophy className="inline mr-1 h-3 w-3 text-warning" />}
          {rightSignals.bearish}
        </div>
      </div>
      {(leftSignals.warning > 0 || rightSignals.warning > 0) && (
        <div className="grid grid-cols-[1fr_120px_1fr] items-center py-2 px-4">
          <div className="text-right font-mono text-warning">
            {leftSignals.warning > 0 ? leftSignals.warning : '-'}
          </div>
          <div className="text-center text-sm text-muted-foreground">Warnings</div>
          <div className="text-left font-mono text-warning">
            {rightSignals.warning > 0 ? rightSignals.warning : '-'}
          </div>
        </div>
      )}
    </CompareSection>
  );
}

const CATEGORY_NAMES: Record<string, string> = {
  scores: 'Scores',
  valuation: 'Valuation',
  growth: 'Growth',
  profitability: 'Margins',
  financialHealth: 'Balance Sheet',
  earningsQuality: 'Operations',
  smartMoney: 'Smart Money',
  analyst: 'Analysts',
  performance: 'Performance',
};

export function calculateCategoryWins(left: StockDetailResponse, right: StockDetailResponse) {
  const categoryWins: { left: string[]; right: string[] } = { left: [], right: [] };

  for (const [categoryKey, metrics] of Object.entries(COMPARE_METRICS)) {
    let leftWins = 0;
    let rightWins = 0;
    for (const metric of metrics) {
      const leftVal = getNestedValue(left, metric.path);
      const rightVal = getNestedValue(right, metric.path);
      const winnerIdx = findWinner([leftVal, rightVal], metric.higherIsBetter, metric.excludeNonPositive);
      if (winnerIdx === 0) leftWins++;
      else if (winnerIdx === 1) rightWins++;
    }
    if (leftWins > rightWins) {
      categoryWins.left.push(CATEGORY_NAMES[categoryKey] || categoryKey);
    } else if (rightWins > leftWins) {
      categoryWins.right.push(CATEGORY_NAMES[categoryKey] || categoryKey);
    }
  }
  return categoryWins;
}

function SummarySection({
  left,
  right,
  rankings
}: {
  left: StockDetailResponse;
  right: StockDetailResponse;
  rankings: RankingResult[];
}) {
  const leftRank = rankings.find(r => r.ticker === left.company.ticker);
  const rightRank = rankings.find(r => r.ticker === right.company.ticker);

  // Calculate category wins
  const categoryWins = useMemo(() => calculateCategoryWins(left, right), [left, right]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-center mb-3">
          <span className="text-xs font-semibold tracking-widest text-primary">SUMMARY</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(
            'text-right p-3 rounded-lg',
            leftRank?.rank === 1 ? 'bg-warning/10 border border-warning/30' : 'bg-muted/50'
          )}>
            <div className="flex items-center justify-end gap-2">
              <div className="text-lg font-bold">{left.company.ticker}</div>
              {leftRank?.rank === 1 && <Trophy className="h-4 w-4 text-warning" />}
            </div>
            <div className="text-xl font-bold text-primary">{leftRank?.wins || 0} wins</div>
            {categoryWins.left.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Leads: {categoryWins.left.join(', ')}
              </div>
            )}
          </div>
          <div className={cn(
            'text-left p-3 rounded-lg',
            rightRank?.rank === 1 ? 'bg-warning/10 border border-warning/30' : 'bg-muted/50'
          )}>
            <div className="flex items-center gap-2">
              {rightRank?.rank === 1 && <Trophy className="h-4 w-4 text-warning" />}
              <div className="text-lg font-bold">{right.company.ticker}</div>
            </div>
            <div className="text-xl font-bold text-primary">{rightRank?.wins || 0} wins</div>
            {categoryWins.right.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Leads: {categoryWins.right.join(', ')}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

