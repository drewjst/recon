'use client';

import { memo, useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/sections/section-card';
import { Card } from '@/components/ui/card';
import { InlineShareLinks } from '@/components/ui/share-button';
import { COMPARE_METRICS, getNestedValue, findWinner } from '@/lib/compare-utils';
import { cn } from '@/lib/utils';
import type { StockDetailResponse, CompareLayout } from '@recon/shared';

const BASE_URL = 'https://cruxit.finance';

interface ScoreComparisonProps {
  stocks: StockDetailResponse[];
  layout: CompareLayout;
}

export const ScoreComparison = memo(function ScoreComparison({ stocks, layout }: ScoreComparisonProps) {
  const scoreMetrics = COMPARE_METRICS.scores;

  // Pre-calculate winners once per metric (not per stock)
  const metricData = useMemo(() => {
    return scoreMetrics.map((metric) => {
      const values = stocks.map((s) => getNestedValue(s, metric.path));
      const winnerIdx = findWinner(values, metric.higherIsBetter);
      return { metric, values, winnerIdx };
    });
  }, [stocks, scoreMetrics]);

  const tickers = stocks.map((s) => s.company.ticker);

  const { shareText, shareUrl } = useMemo(() => {
    const lines = stocks.map((stock) => {
      const ticker = stock.company.ticker;
      const piotroski = stock.scores?.piotroski.score;
      const ruleOf40 = stock.scores?.ruleOf40.score;
      const altmanZ = stock.scores?.altmanZ.score;
      return `$${ticker}: Piotroski ${piotroski ?? '-'}/9, Rule of 40 ${ruleOf40 != null ? `${ruleOf40.toFixed(0)}%` : '-'}, Altman Z ${altmanZ?.toFixed(2) ?? '-'}`;
    });
    return {
      shareText: `Financial Health Comparison:\n${lines.join('\n')}`,
      shareUrl: `${BASE_URL}/compare/${tickers.join('/')}`,
    };
  }, [stocks, tickers]);

  return (
    <SectionCard
      title="Financial Health Scores"
      headerRight={<InlineShareLinks text={shareText} url={shareUrl} />}
    >
      <div
        className={cn(
          'grid gap-4',
          layout === 'side-by-side' && 'grid-cols-2',
          layout === 'table' && stocks.length === 3 && 'grid-cols-3',
          layout === 'table' && stocks.length === 4 && 'grid-cols-4',
          layout === 'table' && 'overflow-x-auto'
        )}
      >
        {stocks.map((stock, stockIdx) => {
          const ticker = stock.company.ticker;
          return (
            <Card key={ticker} className={cn('p-4', layout === 'table' && 'min-w-[150px]')}>
              <div className="font-bold text-center mb-3">{ticker}</div>
              <div className="space-y-3">
                {metricData.map(({ metric, values, winnerIdx }) => {
                  const value = values[stockIdx];
                  const isWinner = winnerIdx === stockIdx;

                  return (
                    <div key={metric.key} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{metric.label}</span>
                      <span
                        className={cn(
                          'font-mono text-sm',
                          isWinner && 'text-positive font-semibold'
                        )}
                      >
                        {value !== null ? metric.format(value) : '-'}
                        {isWinner && (
                          <Trophy className="inline-block ml-1 h-3 w-3 text-warning" />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </SectionCard>
  );
});
