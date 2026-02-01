'use client';

import { memo, useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InlineShareLinks } from '@/components/ui/share-button';
import { cn } from '@/lib/utils';
import type { RankingResult } from '@recon/shared';

const BASE_URL = 'https://cruxit.finance';

interface RankingSummaryProps {
  rankings: RankingResult[];
}

const RANK_STYLES: Record<number, string> = {
  1: 'bg-warning/10 border-warning/30 text-warning',
  2: 'bg-muted/50 border-muted-foreground/30 text-muted-foreground',
  3: 'bg-warning/5 border-warning/20 text-warning',
  4: 'bg-muted border-border text-muted-foreground',
};

export const RankingSummary = memo(function RankingSummary({ rankings }: RankingSummaryProps) {
  const tickers = rankings.map((r) => r.ticker);

  const shareText = useMemo(() => {
    const sortedByRank = [...rankings].sort((a, b) => a.rank - b.rank);
    const rankingLines = sortedByRank
      .map((r) => `#${r.rank} $${r.ticker} (${r.wins} wins)`)
      .join('\n');
    return `Stock Comparison Rankings:\n${rankingLines}`;
  }, [rankings]);

  const shareUrl = `${BASE_URL}/compare/${tickers.join('/')}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs uppercase text-primary font-semibold tracking-widest flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Overall Ranking
          </CardTitle>
          <InlineShareLinks text={shareText} url={shareUrl} />
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'grid gap-3',
            rankings.length === 2 && 'grid-cols-2',
            rankings.length === 3 && 'grid-cols-3',
            rankings.length === 4 && 'grid-cols-2 md:grid-cols-4'
          )}
        >
          {rankings.map((result) => (
            <div
              key={result.ticker}
              className={cn(
                'p-4 rounded-lg border text-center transition-all',
                RANK_STYLES[result.rank] || RANK_STYLES[4]
              )}
            >
              <div className="text-2xl font-bold mb-1">#{result.rank}</div>
              <div className="font-semibold">{result.ticker}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {result.wins} metric {result.wins === 1 ? 'win' : 'wins'}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
