import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cruxit.finance';

export const metadata: Metadata = {
  title: '10-K Financial Statements',
  description:
    'Explore annual 10-K financial statements including income statements, balance sheets, and cash flow statements for any public company.',
  alternates: { canonical: `${BASE_URL}/10k` },
  openGraph: {
    title: '10-K Financial Statements | Crux',
    description: 'Deep dive into annual financial statements for any public company.',
    url: `${BASE_URL}/10k`,
  },
};

export default function TenKLayout({ children }: { children: React.ReactNode }) {
  return children;
}
