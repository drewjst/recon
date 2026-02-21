import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://crux.finance';

export const metadata: Metadata = {
  title: 'Stock Screener',
  description:
    'Filter 3,000+ stocks by valuation, growth, profitability, and financial health metrics. Find quality stocks with Piotroski, Altman Z, and more.',
  alternates: { canonical: `${BASE_URL}/screener` },
  openGraph: {
    title: 'Stock Screener | Crux',
    description: 'Filter stocks by 20+ fundamental metrics including Piotroski F-Score, Altman Z-Score, margins, and growth rates.',
    url: `${BASE_URL}/screener`,
  },
};

export default function ScreenerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
