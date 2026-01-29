import { useQuery } from '@tanstack/react-query';
import { fetchNewsSentiment, type NewsSentiment } from '@/lib/api';

const NEWS_SENTIMENT_STALE_TIME = 12 * 60 * 60 * 1000; // 12 hours

export function useNewsSentiment(ticker: string) {
  return useQuery<NewsSentiment | null>({
    queryKey: ['news-sentiment', ticker.toUpperCase()],
    queryFn: () => fetchNewsSentiment(ticker),
    staleTime: NEWS_SENTIMENT_STALE_TIME,
    enabled: Boolean(ticker),
    retry: 1,
  });
}
