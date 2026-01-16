'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ArrowUp, ArrowDown, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  formatMarketCap,
  formatShareChange,
  formatSignedCurrency,
  determineWinner,
} from '@/lib/compare-utils';
import type { StockDetailResponse, RankingResult } from '@recon/shared';

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
  return (
    <div className="space-y-6">
      {/* Stock Headers */}
      <div className="grid grid-cols-2 gap-8">
        <StockHeader stock={left} align="right" />
        <StockHeader stock={right} align="left" />
      </div>

      {/* Comparison Sections */}
      <Card>
        <CardContent className="p-0">
          {/* Valuation Section */}
          <CompareSection title="VALUATION">
            <ValuationRow
              label="P/E"
              leftValue={left.valuation?.pe.value}
              rightValue={right.valuation?.pe.value}
              format={(v) => v.toFixed(1)}
              lowerIsBetter
            />
            <ValuationRow
              label="Fwd P/E"
              leftValue={left.valuation?.forwardPe.value}
              rightValue={right.valuation?.forwardPe.value}
              format={(v) => v.toFixed(1)}
              lowerIsBetter
            />
            <ValuationRow
              label="EV/EBITDA"
              leftValue={left.valuation?.evToEbitda.value}
              rightValue={right.valuation?.evToEbitda.value}
              format={(v) => v.toFixed(1)}
              lowerIsBetter
            />
            <DCFRow left={left} right={right} />
          </CompareSection>

          {/* Scores Section */}
          <CompareSection title="SCORES">
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

          {/* Growth Section */}
          <CompareSection title="GROWTH">
            <GrowthRow
              label="Revenue YoY"
              leftValue={left.financials?.revenueGrowthYoY}
              rightValue={right.financials?.revenueGrowthYoY}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
            <GrowthRow
              label="Gross Margin"
              leftValue={left.financials?.grossMargin}
              rightValue={right.financials?.grossMargin}
              format={(v) => `${v.toFixed(1)}%`}
            />
            <GrowthRow
              label="Net Margin"
              leftValue={left.financials?.netMargin}
              rightValue={right.financials?.netMargin}
              format={(v) => `${v.toFixed(1)}%`}
            />
          </CompareSection>

          {/* Profitability Section */}
          <CompareSection title="PROFITABILITY">
            <GrowthRow
              label="ROIC"
              leftValue={left.profitability?.roic.value}
              rightValue={right.profitability?.roic.value}
              format={(v) => `${v.toFixed(1)}%`}
            />
            <GrowthRow
              label="ROE"
              leftValue={left.profitability?.roe.value}
              rightValue={right.profitability?.roe.value}
              format={(v) => `${v.toFixed(1)}%`}
            />
            <GrowthRow
              label="Op. Margin"
              leftValue={left.profitability?.operatingMargin.value}
              rightValue={right.profitability?.operatingMargin.value}
              format={(v) => `${v.toFixed(1)}%`}
            />
          </CompareSection>

          {/* Financial Health Section */}
          <CompareSection title="FINANCIAL HEALTH">
            <GrowthRow
              label="Debt/Equity"
              leftValue={left.financialHealth?.debtToEquity.value}
              rightValue={right.financialHealth?.debtToEquity.value}
              format={(v) => `${v.toFixed(2)}x`}
              lowerIsBetter
            />
            <GrowthRow
              label="Current Ratio"
              leftValue={left.financialHealth?.currentRatio.value}
              rightValue={right.financialHealth?.currentRatio.value}
              format={(v) => `${v.toFixed(2)}x`}
            />
            <GrowthRow
              label="Asset Turnover"
              leftValue={left.financialHealth?.assetTurnover.value}
              rightValue={right.financialHealth?.assetTurnover.value}
              format={(v) => `${v.toFixed(2)}x`}
            />
          </CompareSection>

          {/* Smart Money Section */}
          <CompareSection title="SMART MONEY">
            <GrowthRow
              label="Inst. Ownership"
              leftValue={left.holdings?.totalInstitutionalOwnership}
              rightValue={right.holdings?.totalInstitutionalOwnership}
              format={(v) => `${v.toFixed(1)}%`}
            />
            <GrowthRow
              label="Net Inst. Change"
              leftValue={left.holdings?.netChangeShares}
              rightValue={right.holdings?.netChangeShares}
              format={(v) => formatShareChange(v)}
            />
            <InsiderRow left={left} right={right} />
          </CompareSection>
        </CardContent>
      </Card>

      {/* Summary */}
      <SummarySection
        left={left}
        right={right}
        rankings={rankings}
      />
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
            isPositive ? 'text-green-600' : 'text-red-600'
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

function CompareSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="bg-muted/50 px-4 py-2 text-center">
        <span className="text-xs font-semibold tracking-widest text-primary">{title}</span>
      </div>
      <div className="divide-y divide-border/50">
        {children}
      </div>
    </div>
  );
}

interface ValuationRowProps {
  label: string;
  leftValue: number | null | undefined;
  rightValue: number | null | undefined;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
}

function ValuationRow({ label, leftValue, rightValue, format, lowerIsBetter }: ValuationRowProps) {
  const winner = determineWinner(leftValue, rightValue, !lowerIsBetter);
  const leftWins = winner === 'left';
  const rightWins = winner === 'right';

  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center py-3 px-4">
      <div className={cn(
        'text-right font-mono',
        leftWins && 'text-green-600 font-semibold'
      )}>
        {leftValue != null ? format(leftValue) : '-'}
        {leftWins && <Trophy className="inline ml-1 h-3 w-3 text-amber-500" />}
      </div>
      <div className="text-center text-sm text-muted-foreground">{label}</div>
      <div className={cn(
        'text-left font-mono',
        rightWins && 'text-green-600 font-semibold'
      )}>
        {rightWins && <Trophy className="inline mr-1 h-3 w-3 text-amber-500" />}
        {rightValue != null ? format(rightValue) : '-'}
      </div>
    </div>
  );
}

function DCFRow({ left, right }: { left: StockDetailResponse; right: StockDetailResponse }) {
  const leftDcf = left.scores?.dcfValuation;
  const rightDcf = right.scores?.dcfValuation;

  const leftWins = leftDcf && rightDcf && leftDcf.differencePercent > rightDcf.differencePercent;
  const rightWins = leftDcf && rightDcf && rightDcf.differencePercent > leftDcf.differencePercent;

  const formatDcf = (dcf: typeof leftDcf) => {
    if (!dcf) return '-';
    const sign = dcf.differencePercent >= 0 ? '+' : '';
    return `$${dcf.intrinsicValue.toFixed(0)} (${sign}${dcf.differencePercent.toFixed(0)}%)`;
  };

  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center py-3 px-4">
      <div className={cn(
        'text-right font-mono text-sm',
        leftWins && 'text-green-600 font-semibold'
      )}>
        {formatDcf(leftDcf)}
        {leftWins && <Trophy className="inline ml-1 h-3 w-3 text-amber-500" />}
      </div>
      <div className="text-center text-sm text-muted-foreground">DCF Value</div>
      <div className={cn(
        'text-left font-mono text-sm',
        rightWins && 'text-green-600 font-semibold'
      )}>
        {rightWins && <Trophy className="inline mr-1 h-3 w-3 text-amber-500" />}
        {formatDcf(rightDcf)}
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
    <div className="py-3 px-4">
      <div className="text-center text-sm text-muted-foreground mb-2">{label}</div>
      <div className="grid grid-cols-[1fr_40px_1fr] items-center gap-2">
        {/* Left bar (grows right-to-left) */}
        <div className="flex items-center justify-end gap-2">
          <span className={cn(
            'font-mono text-sm',
            leftWins && 'text-green-600 font-semibold'
          )}>
            {leftValue != null ? format(leftValue) : '-'}
          </span>
          <div className="w-24 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all float-right',
                leftWins ? 'bg-green-500' : 'bg-primary/60'
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
                rightWins ? 'bg-green-500' : 'bg-primary/60'
              )}
              style={{ width: `${rightPercent}%` }}
            />
          </div>
          <span className={cn(
            'font-mono text-sm',
            rightWins && 'text-green-600 font-semibold'
          )}>
            {rightValue != null ? format(rightValue) : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

interface GrowthRowProps {
  label: string;
  leftValue: number | null | undefined;
  rightValue: number | null | undefined;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
}

function GrowthRow({ label, leftValue, rightValue, format, lowerIsBetter }: GrowthRowProps) {
  const winner = determineWinner(leftValue, rightValue, !lowerIsBetter);
  const leftWins = winner === 'left';
  const rightWins = winner === 'right';

  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center py-3 px-4">
      <div className={cn(
        'text-right font-mono',
        leftWins && 'text-green-600 font-semibold'
      )}>
        {leftValue != null ? format(leftValue) : '-'}
        {leftWins && <Trophy className="inline ml-1 h-3 w-3 text-amber-500" />}
      </div>
      <div className="text-center text-sm text-muted-foreground">{label}</div>
      <div className={cn(
        'text-left font-mono',
        rightWins && 'text-green-600 font-semibold'
      )}>
        {rightWins && <Trophy className="inline mr-1 h-3 w-3 text-amber-500" />}
        {rightValue != null ? format(rightValue) : '-'}
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
        <div className="text-green-600">{buys} buys</div>
        <div className="text-red-600">{sells} sells</div>
        <div className={net >= 0 ? 'text-green-600' : 'text-red-600'}>
          Net: {formatSignedCurrency(net)}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center py-3 px-4">
      <div className="text-right">{formatInsider(leftActivity)}</div>
      <div className="text-center text-sm text-muted-foreground">Insider 90d</div>
      <div className="text-left">{formatInsider(rightActivity)}</div>
    </div>
  );
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

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <span className="text-xs font-semibold tracking-widest text-primary">SUMMARY</span>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className={cn(
            'text-right p-4 rounded-lg',
            leftRank?.rank === 1 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-muted/50'
          )}>
            <div className="text-lg font-bold">{left.company.ticker}</div>
            <div className="text-2xl font-bold text-primary">{leftRank?.wins || 0} wins</div>
            {leftRank?.rank === 1 && (
              <div className="text-sm text-amber-600 mt-1 flex items-center justify-end gap-1">
                <Trophy className="h-4 w-4" /> Leader
              </div>
            )}
          </div>
          <div className={cn(
            'text-left p-4 rounded-lg',
            rightRank?.rank === 1 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-muted/50'
          )}>
            <div className="text-lg font-bold">{right.company.ticker}</div>
            <div className="text-2xl font-bold text-primary">{rightRank?.wins || 0} wins</div>
            {rightRank?.rank === 1 && (
              <div className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                <Trophy className="h-4 w-4" /> Leader
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

