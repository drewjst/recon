import type { MetadataRoute } from 'next';

// Popular tickers to include in sitemap
// Expand this list as needed or fetch dynamically from your database
const INDEXED_TICKERS = [
  // Mega caps
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B',
  // Tech
  'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'NFLX', 'PYPL', 'SQ', 'SHOP',
  // Finance
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP',
  // Healthcare
  'UNH', 'JNJ', 'PFE', 'MRK', 'ABBV', 'LLY', 'TMO',
  // Consumer
  'WMT', 'COST', 'HD', 'MCD', 'SBUX', 'NKE', 'DIS', 'KO', 'PEP',
  // Industrial
  'CAT', 'DE', 'UPS', 'BA', 'GE', 'HON', 'MMM',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB',
  // Popular growth/momentum
  'PLTR', 'SNOW', 'CRWD', 'DDOG', 'ZS', 'NET', 'COIN',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://crux.finance';
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  // Stock pages
  const stockPages: MetadataRoute.Sitemap = INDEXED_TICKERS.map((ticker) => ({
    url: `${baseUrl}/stock/${ticker}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Deep dive pages for each stock
  const deepDivePages: MetadataRoute.Sitemap = INDEXED_TICKERS.flatMap((ticker) => [
    {
      url: `${baseUrl}/stock/${ticker}/valuation`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/stock/${ticker}/smart-money`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
  ]);

  return [...staticPages, ...stockPages, ...deepDivePages];
}
