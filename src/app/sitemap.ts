import type { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Fallback: popular tickers if screener API is unavailable at build time
const FALLBACK_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B',
  'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'NFLX', 'PYPL', 'SQ', 'SHOP',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP',
  'UNH', 'JNJ', 'PFE', 'MRK', 'ABBV', 'LLY', 'TMO',
  'WMT', 'COST', 'HD', 'MCD', 'SBUX', 'NKE', 'DIS', 'KO', 'PEP',
  'CAT', 'DE', 'UPS', 'BA', 'GE', 'HON', 'MMM',
  'XOM', 'CVX', 'COP', 'SLB',
  'PLTR', 'SNOW', 'CRWD', 'DDOG', 'ZS', 'NET', 'COIN',
];

async function getAllTickers(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/screener?limit=5000&sort=market_cap&order=desc`, {
      next: { revalidate: 86400 }, // revalidate daily
    });
    if (!res.ok) return FALLBACK_TICKERS;
    const data = await res.json();
    const tickers = data.stocks?.map((s: { ticker: string }) => s.ticker);
    return tickers?.length > 0 ? tickers : FALLBACK_TICKERS;
  } catch {
    return FALLBACK_TICKERS;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://crux.finance';
  const now = new Date();
  const tickers = await getAllTickers();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/screener`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/sectors`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/10k`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/financials`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Stock pages (one per ticker)
  const stockPages: MetadataRoute.Sitemap = tickers.map((ticker) => ({
    url: `${baseUrl}/stock/${ticker}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...stockPages];
}
