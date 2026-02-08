'use client';

import { useQuery } from '@tanstack/react-query';
import { Sparkles, RefreshCw, Newspaper } from 'lucide-react';
import { fetchInsight, type InsightSection, type NewsSentiment, type NewsLink } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CruxAIInsightProps {
  ticker: string;
  section: InsightSection;
  className?: string;
}

const INSIGHT_STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours

const sectionLabels: Record<InsightSection, string> = {
  'valuation-summary': 'Valuation Summary',
  'position-summary': 'Position Summary',
  'news-sentiment': 'News Sentiment',
  'smart-money-summary': 'Smart Money Summary',
};

// Parse news sentiment JSON from insight string
function parseNewsSentiment(insight: string): NewsSentiment | null {
  try {
    // Remove markdown code blocks if present
    const cleaned = insight.replace(/```json\s*|\s*```/g, '').trim();
    return JSON.parse(cleaned) as NewsSentiment;
  } catch {
    return null;
  }
}

// Sentiment color mapping
function getSentimentStyle(sentiment: string): { color: string; bg: string } {
  switch (sentiment) {
    case 'positive':
      return { color: 'text-success', bg: 'bg-success/10' };
    case 'negative':
      return { color: 'text-destructive', bg: 'bg-destructive/10' };
    case 'mixed':
      return { color: 'text-warning', bg: 'bg-warning/10' };
    default:
      return { color: 'text-muted-foreground', bg: 'bg-muted' };
  }
}

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
          'rounded-xl bg-card/50 backdrop-blur-sm',
          'border border-border/50',
          'p-5',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-muted-foreground animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {sectionLabels[section] || section}
          </span>
          <span className="text-xs text-muted-foreground/70">
            analyzing...
          </span>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
          <div className="h-4 bg-muted rounded animate-pulse w-11/12" />
          <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
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
        'rounded-xl bg-card/50 backdrop-blur-sm',
        'border border-border/50',
        'p-5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            {sectionLabels[section] || section}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            CRUX.AI
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data.cached && (
            <span className="text-[10px] text-muted-foreground/70">
              {formattedTime}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className={cn(
              'p-1 rounded-md hover:bg-muted transition-colors',
              'text-muted-foreground/70 hover:text-foreground',
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

      {/* Insight content - special handling for news-sentiment */}
      {section === 'news-sentiment' ? (
        <NewsSentimentContent insight={data.insight} />
      ) : (
        <p className="text-sm text-foreground/80 leading-relaxed">
          {data.insight}
        </p>
      )}

      {/* Powered by attribution */}
      <div className="mt-3 pt-2 border-t border-border/30">
        <span className="text-[10px] text-muted-foreground/50">
          Powered by Google Gemini
        </span>
      </div>
    </div>
  );
}

// News article row component
function NewsArticleRow({ article }: { article: NewsLink }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/20 last:border-0">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-foreground/80 hover:text-primary hover:underline truncate flex-1"
        title={article.title}
      >
        {article.title}
      </a>
      <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
        ({article.site})
      </span>
    </div>
  );
}

// Dedicated component for news sentiment display
function NewsSentimentContent({ insight }: { insight: string }) {
  const parsed = parseNewsSentiment(insight);

  if (!parsed) {
    // Fallback to raw text if parsing fails
    return (
      <p className="text-sm text-foreground/80 leading-relaxed">
        {insight}
      </p>
    );
  }

  const { color, bg } = getSentimentStyle(parsed.sentiment);

  return (
    <div className="space-y-3">
      {/* Sentiment badge and summary */}
      <div className="flex items-start gap-3">
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', color, bg)}>
          {parsed.sentiment}
        </span>
        <p className="text-sm text-foreground/80 leading-relaxed flex-1">
          {parsed.summary}
        </p>
      </div>

      {/* Themes */}
      {parsed.themes && parsed.themes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Themes:</span>
          {parsed.themes.slice(0, 4).map((theme) => (
            <span
              key={theme}
              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {theme}
            </span>
          ))}
        </div>
      )}

      {/* Recent News Articles */}
      {parsed.topArticles && parsed.topArticles.length > 0 && (
        <div className="pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 mb-2">
            <Newspaper className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent News
            </span>
          </div>
          <div>
            {parsed.topArticles.slice(0, 3).map((article, idx) => (
              <NewsArticleRow key={`${article.url}-${idx}`} article={article} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
