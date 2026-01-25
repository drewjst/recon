'use client';

import { useQuery } from '@tanstack/react-query';
import { Sparkles, RefreshCw } from 'lucide-react';
import { fetchInsight, type InsightSection } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CruxAIInsightProps {
  ticker: string;
  section: InsightSection;
  className?: string;
}

const INSIGHT_STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours

export function CruxAIInsight({ ticker, section, className }: CruxAIInsightProps) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['insight', ticker.toUpperCase(), section],
    queryFn: () => fetchInsight(ticker, section),
    staleTime: INSIGHT_STALE_TIME,
    retry: 1,
    enabled: Boolean(ticker),
  });

  // Error state: fail silently
  if (error) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30',
          'border border-purple-200/50 dark:border-purple-800/30',
          'p-5',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            CRUX.AI
          </span>
          <span className="text-xs text-purple-500/70 dark:text-purple-400/70">
            analyzing...
          </span>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-purple-200/50 dark:bg-purple-800/30 rounded animate-pulse w-full" />
          <div className="h-4 bg-purple-200/50 dark:bg-purple-800/30 rounded animate-pulse w-11/12" />
          <div className="h-4 bg-purple-200/50 dark:bg-purple-800/30 rounded animate-pulse w-4/5" />
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return null;
  }

  const generatedDate = new Date(data.generatedAt);
  const formattedTime = generatedDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      className={cn(
        'rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30',
        'border border-purple-200/50 dark:border-purple-800/30',
        'p-5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            CRUX.AI
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 font-medium">
            powered by Gemini
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data.cached && (
            <span className="text-[10px] text-purple-500/70 dark:text-purple-400/60">
              {formattedTime}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className={cn(
              'p-1 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors',
              'text-purple-500/70 hover:text-purple-600 dark:text-purple-400/60 dark:hover:text-purple-400',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Refresh insight"
            aria-label="Refresh insight"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')}
            />
          </button>
        </div>
      </div>

      {/* Insight text */}
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {data.insight}
      </p>
    </div>
  );
}
