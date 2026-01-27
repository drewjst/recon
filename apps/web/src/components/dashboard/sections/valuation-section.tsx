'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SectionCard } from './section-card';
import { MetricRow } from './metric-row';
import { toMetric, buildShareText } from '@/lib/metric-helpers';
import { cn } from '@/lib/utils';
import type { StockDetailResponse } from '@recon/shared';

interface ValuationSectionProps {
  data: StockDetailResponse;
}

function getValuationSentiment(data: StockDetailResponse): {
  sentiment: 'cheap' | 'fair' | 'expensive';
  headline: string;
  icon: React.ReactNode;
} {
  const { valuation, scores } = data;

  if (scores?.dcfValuation && scores.dcfValuation.assessment !== 'N/A') {
    const { assessment, differencePercent } = scores.dcfValuation;
    if (assessment === 'Undervalued') {
      return {
        sentiment: 'cheap',
        headline: `${Math.abs(differencePercent).toFixed(0)}% below intrinsic value (DCF)`,
        icon: <TrendingDown className="h-3.5 w-3.5" />,
      };
    }
    if (assessment === 'Overvalued') {
      return {
        sentiment: 'expensive',
        headline: `${Math.abs(differencePercent).toFixed(0)}% above intrinsic value (DCF)`,
        icon: <TrendingUp className="h-3.5 w-3.5" />,
      };
    }
  }

  if (valuation?.peg?.value) {
    const peg = valuation.peg.value;
    if (peg < 1.0) {
      return {
        sentiment: 'cheap',
        headline: `PEG of ${peg.toFixed(1)} suggests undervaluation`,
        icon: <TrendingDown className="h-3.5 w-3.5" />,
      };
    }
    if (peg > 2.0) {
      return {
        sentiment: 'expensive',
        headline: `PEG of ${peg.toFixed(1)} suggests premium pricing`,
        icon: <TrendingUp className="h-3.5 w-3.5" />,
      };
    }
    return {
      sentiment: 'fair',
      headline: `PEG of ${peg.toFixed(1)} suggests fair valuation`,
      icon: <Minus className="h-3.5 w-3.5" />,
    };
  }

  if (valuation?.pe?.value && valuation.pe.sectorMedian) {
    const pe = valuation.pe.value;
    const median = valuation.pe.sectorMedian;
    const diff = ((pe - median) / median) * 100;

    if (diff < -20) {
      return {
        sentiment: 'cheap',
        headline: `P/E ${Math.abs(diff).toFixed(0)}% below sector median`,
        icon: <TrendingDown className="h-3.5 w-3.5" />,
      };
    }
    if (diff > 20) {
      return {
        sentiment: 'expensive',
        headline: `P/E ${diff.toFixed(0)}% above sector median`,
        icon: <TrendingUp className="h-3.5 w-3.5" />,
      };
    }
    return {
      sentiment: 'fair',
      headline: `P/E in line with sector median`,
      icon: <Minus className="h-3.5 w-3.5" />,
    };
  }

  return {
    sentiment: 'fair',
    headline: 'View detailed valuation analysis',
    icon: <Minus className="h-3.5 w-3.5" />,
  };
}

const sentimentStyles = {
  cheap: {
    badge: 'bg-success/20 text-success',
    border: 'border-success/30',
  },
  fair: {
    badge: 'bg-warning/20 text-warning',
    border: 'border-warning/30',
  },
  expensive: {
    badge: 'bg-destructive/20 text-destructive',
    border: 'border-destructive/30',
  },
};

function ValuationSectionComponent({ data }: ValuationSectionProps) {
  const { company, valuation } = data;
  const [isExpanded, setIsExpanded] = useState(false);

  if (!valuation) return null;

  const { sentiment, headline, icon } = getValuationSentiment(data);
  const styles = sentimentStyles[sentiment];

  // Build metrics array - order determines display priority
  const metrics = [
    toMetric('pe', 'P/E (TTM)', valuation.pe, {
      format: 'ratio' as const,
      higherIsBetter: false,
      info: "Price-to-Earnings ratio compares a company's stock price to its earnings per share. Lower P/E may indicate undervaluation relative to earnings.",
      learnMoreUrl: 'https://www.investopedia.com/terms/p/price-earningsratio.asp',
    }),
    toMetric('peg', 'PEG Ratio', valuation.peg, {
      format: 'ratio' as const,
      higherIsBetter: false,
      info: 'Price/Earnings-to-Growth ratio factors in expected earnings growth. A PEG below 1 may suggest the stock is undervalued relative to its growth.',
      learnMoreUrl: 'https://www.investopedia.com/terms/p/pegratio.asp',
    }),
    toMetric('ntmPs', 'NTM P/S', valuation.ntmPs, {
      format: 'ratio' as const,
      higherIsBetter: false,
      info: 'Next Twelve Months Price-to-Sales uses analyst revenue estimates. It reflects expected valuation based on forward revenue projections.',
      learnMoreUrl: 'https://www.investopedia.com/terms/p/price-to-salesratio.asp',
    }),
    toMetric('priceToFcf', 'Price/FCF', valuation.priceToFcf, {
      format: 'ratio' as const,
      higherIsBetter: false,
      info: 'Price-to-Free Cash Flow measures how the stock price compares to cash generated after capital expenditures. Lower values may indicate better value.',
      learnMoreUrl: 'https://www.investopedia.com/terms/p/pricetofreecashflow.asp',
    }),
    toMetric('priceToBook', 'Price/Book', valuation.priceToBook, {
      format: 'ratio' as const,
      higherIsBetter: false,
      info: "Price-to-Book ratio compares market value to book value. A P/B below 1 may indicate the stock trades below the value of its net assets.",
      learnMoreUrl: 'https://www.investopedia.com/terms/p/price-to-bookratio.asp',
    }),
    toMetric('evToEbitda', 'EV/EBITDA', valuation.evToEbitda, {
      format: 'ratio' as const,
      higherIsBetter: false,
      info: "Enterprise Value to EBITDA measures a company's total value relative to its operating earnings. Useful for comparing companies regardless of capital structure.",
      learnMoreUrl: 'https://www.investopedia.com/terms/e/ev-ebitda.asp',
    }),
    toMetric('forwardPe', 'Forward P/E', valuation.forwardPe, {
      format: 'ratio' as const,
      higherIsBetter: false,
      info: 'Forward P/E uses estimated future earnings instead of trailing earnings. It can indicate expected growth or whether the market anticipates earnings changes.',
      learnMoreUrl: 'https://www.investopedia.com/terms/f/forwardpe.asp',
    }),
  ];

  const validMetrics = metrics.filter((m) => m.value !== null);
  const topN = 5;
  const displayMetrics = isExpanded ? validMetrics : validMetrics.slice(0, topN);
  const hasMore = validMetrics.length > topN;

  const shareText = buildShareText(company.ticker, 'Valuation', [
    { label: 'P/E', value: valuation.pe.value != null ? `${valuation.pe.value.toFixed(1)}x` : null },
    { label: 'PEG', value: valuation.peg.value != null ? valuation.peg.value.toFixed(2) : null },
    { label: 'EV/EBITDA', value: valuation.evToEbitda.value != null ? `${valuation.evToEbitda.value.toFixed(1)}x` : null },
    { label: 'P/FCF', value: valuation.priceToFcf.value != null ? `${valuation.priceToFcf.value.toFixed(1)}x` : null },
  ]);

  return (
    <SectionCard title="Valuation" shareTicker={company.ticker} shareText={shareText}>
      {/* Verdict Header */}
      <Link
        href={`/stock/${company.ticker}/valuation`}
        className={cn(
          'block mb-4 p-3 rounded-lg border transition-colors hover:bg-muted/50',
          styles.border
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase',
                styles.badge
              )}
            >
              {icon}
              {sentiment}
            </span>
            <span className="text-sm text-muted-foreground">{headline}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Deep dive</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </Link>

      {/* Metrics Table */}
      {validMetrics.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {company.ticker}
                  </th>
                  <th className="py-2 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    Industry Avg
                  </th>
                  <th className="py-2 pl-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Percentile
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayMetrics.map((metric) => (
                  <MetricRow
                    key={metric.key}
                    label={metric.label}
                    value={metric.value}
                    industryAverage={metric.industryAverage}
                    percentile={metric.percentile}
                    format={metric.format}
                    higherIsBetter={metric.higherIsBetter}
                    info={metric.info}
                    learnMoreUrl={metric.learnMoreUrl}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show all {validMetrics.length} metrics
                </>
              )}
            </button>
          )}
        </>
      )}
    </SectionCard>
  );
}

export const ValuationSection = memo(ValuationSectionComponent);
