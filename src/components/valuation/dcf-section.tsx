'use client';

import { memo } from 'react';
import {
  TrendingUp,
  AlertCircle,
  DollarSign,
  Target,
  Shield,
  Wrench,
  Rocket,
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/sections/section-card';
import { cn } from '@/lib/utils';
import { formatPrice, formatPercent, formatCompact, formatDecimal } from '@/lib/formatters';
import type { ValuationDeepDive } from '@recon/shared';

interface DCFSectionProps {
  data: ValuationDeepDive;
}

// Treasury rate constant for OE yield comparison
const TREASURY_10Y_RATE = 4.2;

function DCFSectionComponent({ data }: DCFSectionProps) {
  const { dcfAnalysis, ownerEarningsAnalysis } = data;

  // If neither analysis is available, show not available message
  if (!dcfAnalysis && !ownerEarningsAnalysis) {
    return (
      <SectionCard title="DCF & Intrinsic Value">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/30">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            DCF and Owner Earnings analysis not available for this stock. This may be due to
            negative cash flows or insufficient data.
          </p>
        </div>
      </SectionCard>
    );
  }

  // Calculate premium/discount percentage and sentiment
  const premiumPercent = dcfAnalysis
    ? ((dcfAnalysis.currentPrice - dcfAnalysis.intrinsicValue) / dcfAnalysis.intrinsicValue) * 100
    : null;

  const getPremiumConfig = (premium: number | null) => {
    if (premium === null) return { color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border/30', label: 'N/A' };
    if (premium > 30) return { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', label: 'Significantly Overvalued' };
    if (premium > 10) return { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', label: 'Premium' };
    if (premium > -10) return { color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border/30', label: 'Fair Value' };
    if (premium > -30) return { color: 'text-success/80', bg: 'bg-success/5', border: 'border-success/20', label: 'Discount' };
    return { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', label: 'Significantly Undervalued' };
  };

  const premiumConfig = getPremiumConfig(premiumPercent);

  // Owner Earnings yield comparison
  const oeYield = ownerEarningsAnalysis?.ownerEarningsYield ?? null;
  const getYieldConfig = (yieldVal: number | null) => {
    if (yieldVal === null) return { color: 'text-muted-foreground', label: 'N/A' };
    if (yieldVal > TREASURY_10Y_RATE + 2) return { color: 'text-success', label: 'Attractive' };
    if (yieldVal > TREASURY_10Y_RATE) return { color: 'text-muted-foreground', label: 'Adequate' };
    return { color: 'text-destructive', label: 'Below risk-free' };
  };
  const yieldConfig = getYieldConfig(oeYield);

  // Calculate margin of safety price levels
  const mos20 = dcfAnalysis ? dcfAnalysis.intrinsicValue * 0.8 : null;
  const mos30 = dcfAnalysis ? dcfAnalysis.intrinsicValue * 0.7 : null;

  // Generate insight text
  const getInsightText = () => {
    if (premiumPercent === null) return null;
    if (premiumPercent > 20) {
      return {
        icon: <AlertCircle className="h-4 w-4 text-warning" />,
        text: `Stock trades at ${Math.abs(premiumPercent).toFixed(1)}% PREMIUM to intrinsic value. Consider waiting for pullback to improve margin of safety.`,
        sentiment: 'warning' as const,
      };
    }
    if (premiumPercent > -10) {
      return {
        icon: <Target className="h-4 w-4 text-muted-foreground" />,
        text: 'Stock trades near fair value. No significant margin of safety at current price.',
        sentiment: 'neutral' as const,
      };
    }
    return {
      icon: <Shield className="h-4 w-4 text-success" />,
      text: `Stock trades at ${Math.abs(premiumPercent).toFixed(1)}% DISCOUNT to intrinsic value. Current price offers potential margin of safety.`,
      sentiment: 'bullish' as const,
    };
  };

  const insight = getInsightText();

  return (
    <SectionCard title="DCF & Intrinsic Value">
      <div className="space-y-6">
        {/* Two side-by-side cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DCF Intrinsic Value Card */}
          <div className={cn('p-5 rounded-lg border-2', premiumConfig.bg, premiumConfig.border)}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className={cn('h-5 w-5', premiumConfig.color)} />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Intrinsic Value (DCF)</h3>
            </div>

            {dcfAnalysis ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    DCF Fair Value
                  </div>
                  <div className={cn('text-2xl font-bold font-mono', premiumConfig.color)}>
                    {formatPrice(dcfAnalysis.intrinsicValue)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Current Price
                    </div>
                    <div className="text-lg font-bold font-mono">
                      {formatPrice(dcfAnalysis.currentPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Premium/Discount
                    </div>
                    <div className={cn('text-lg font-bold font-mono', premiumConfig.color)}>
                      {premiumPercent !== null && (
                        <>
                          {premiumPercent > 0 ? '+' : ''}
                          {premiumPercent.toFixed(1)}%
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Premium/Discount Bar */}
                <div className="space-y-1">
                  <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                    {/* Center marker at 100% (fair value) */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 z-10"
                      style={{ left: '50%' }}
                    />
                    {/* Fill bar */}
                    <div
                      className={cn(
                        'absolute h-full rounded-full transition-all',
                        premiumPercent !== null && premiumPercent > 0
                          ? 'bg-destructive'
                          : 'bg-success'
                      )}
                      style={{
                        left: premiumPercent !== null && premiumPercent < 0 ? `${50 + premiumPercent / 2}%` : '50%',
                        width: `${Math.min(50, Math.abs(premiumPercent ?? 0) / 2)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>-50%</span>
                    <span>Fair</span>
                    <span>+50%</span>
                  </div>
                </div>

                <div className={cn('text-xs font-medium uppercase tracking-wider', premiumConfig.color)}>
                  {premiumConfig.label}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                DCF valuation not available. This may be due to negative cash flows.
              </div>
            )}
          </div>

          {/* Owner Earnings Card */}
          <div className="p-5 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Owner Earnings</h3>
            </div>

            {ownerEarningsAnalysis ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Total Owner Earnings (TTM)
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {formatCompact(ownerEarningsAnalysis.ownerEarnings)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ${formatDecimal(ownerEarningsAnalysis.ownerEarningsPerShare)} per share
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">OE Yield</span>
                    <span className={cn('text-lg font-bold font-mono', yieldConfig.color)}>
                      {formatPercent(ownerEarningsAnalysis.ownerEarningsYield, { decimals: 1 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>vs 10Y Treasury</span>
                    <span>{TREASURY_10Y_RATE}%</span>
                  </div>
                  <div className={cn('text-xs font-medium mt-2', yieldConfig.color)}>
                    {oeYield !== null && oeYield > TREASURY_10Y_RATE && '✓ '}
                    {yieldConfig.label}
                  </div>
                </div>

                {/* CapEx Breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded bg-background/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wrench className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Maintenance</span>
                    </div>
                    <div className="font-mono text-sm text-destructive">
                      {formatCompact(Math.abs(ownerEarningsAnalysis.maintenanceCapex))}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-background/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Rocket className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Growth</span>
                    </div>
                    <div className="font-mono text-sm text-primary">
                      {formatCompact(Math.abs(ownerEarningsAnalysis.growthCapex))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Owner earnings analysis not available for this stock.
              </div>
            )}
          </div>
        </div>

        {/* Margin of Safety Analysis */}
        {dcfAnalysis && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Margin of Safety Analysis
            </h4>

            <div className="space-y-4">
              {/* Price scale visualization */}
              <PriceScale
                currentPrice={dcfAnalysis.currentPrice}
                fairValue={dcfAnalysis.intrinsicValue}
                mos20={mos20!}
                mos30={mos30!}
              />

              {/* Price levels table */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-background/50">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    30% MoS
                  </div>
                  <div className="text-sm font-mono text-success">{formatPrice(mos30)}</div>
                </div>
                <div className="p-2 rounded bg-background/50">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    20% MoS
                  </div>
                  <div className="text-sm font-mono text-success/80">{formatPrice(mos20)}</div>
                </div>
                <div className="p-2 rounded bg-background/50 border border-foreground/20">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    Fair Value
                  </div>
                  <div className="text-sm font-mono">{formatPrice(dcfAnalysis.intrinsicValue)}</div>
                </div>
                <div className={cn('p-2 rounded', premiumPercent !== null && premiumPercent > 0 ? 'bg-destructive/10' : 'bg-success/10')}>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    Current
                  </div>
                  <div className={cn('text-sm font-mono', premiumPercent !== null && premiumPercent > 0 ? 'text-destructive' : 'text-success')}>
                    {formatPrice(dcfAnalysis.currentPrice)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insight Box */}
        {insight && (
          <div
            className={cn(
              'p-4 rounded-lg border flex items-start gap-3',
              insight.sentiment === 'warning' && 'bg-warning/5 border-warning/30',
              insight.sentiment === 'neutral' && 'bg-muted/30 border-border/30',
              insight.sentiment === 'bullish' && 'bg-success/5 border-success/30'
            )}
          >
            {insight.icon}
            <p className="text-sm">{insight.text}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            About DCF & Owner Earnings
          </h4>
          <p className="text-sm text-muted-foreground">
            <strong>DCF (Discounted Cash Flow)</strong> estimates intrinsic value by projecting
            future cash flows and discounting to present value. A positive margin of safety
            suggests the stock trades below calculated fair value.{' '}
            <strong>Owner Earnings</strong>, popularized by Warren Buffett, measures the true cash
            a business generates for owners (net income + depreciation - maintenance capex). An OE
            yield above the risk-free rate suggests the investment may generate adequate returns.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

/**
 * Visual price scale showing current price position relative to fair value and MoS levels.
 */
function PriceScale({
  currentPrice,
  fairValue,
  mos20,
  mos30,
}: {
  currentPrice: number;
  fairValue: number;
  mos20: number;
  mos30: number;
}) {
  // Calculate the scale range (add some padding)
  const allPrices = [currentPrice, fairValue, mos20, mos30];
  const minPrice = Math.min(...allPrices) * 0.9;
  const maxPrice = Math.max(...allPrices) * 1.1;
  const range = maxPrice - minPrice;

  const getPosition = (price: number) => ((price - minPrice) / range) * 100;

  return (
    <div className="relative h-12 mb-2">
      {/* Scale bar */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-success via-muted to-destructive rounded-full transform -translate-y-1/2" />

      {/* 30% MoS marker */}
      <PriceMarker
        position={getPosition(mos30)}
        price={mos30}
        label="30% MoS"
        color="text-success"
      />

      {/* 20% MoS marker */}
      <PriceMarker
        position={getPosition(mos20)}
        price={mos20}
        label="20% MoS"
        color="text-success/70"
      />

      {/* Fair Value marker */}
      <PriceMarker
        position={getPosition(fairValue)}
        price={fairValue}
        label="Fair Value"
        color="text-foreground"
        isPrimary
      />

      {/* Current Price marker */}
      <PriceMarker
        position={getPosition(currentPrice)}
        price={currentPrice}
        label="Current"
        color={currentPrice > fairValue ? 'text-destructive' : 'text-success'}
        isCurrent
      />
    </div>
  );
}

function PriceMarker({
  position,
  label,
  color,
  isPrimary,
  isCurrent,
}: {
  position: number;
  price: number;
  label: string;
  color: string;
  isPrimary?: boolean;
  isCurrent?: boolean;
}) {
  return (
    <div
      className="absolute transform -translate-x-1/2"
      style={{ left: `${Math.min(95, Math.max(5, position))}%`, top: 0 }}
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full mx-auto',
          isCurrent ? 'bg-current ring-2 ring-background' : isPrimary ? 'bg-foreground' : 'bg-muted-foreground/50',
          color
        )}
        style={{ marginTop: '18px' }}
      />
      <div
        className={cn(
          'text-[9px] whitespace-nowrap mt-1 text-center',
          color,
          (isPrimary || isCurrent) && 'font-medium'
        )}
      >
        {label}
      </div>
    </div>
  );
}

export const DCFSection = memo(DCFSectionComponent);
