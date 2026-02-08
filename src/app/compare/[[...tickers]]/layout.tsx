import { Metadata } from 'next';

const BASE_URL = 'https://cruxit.finance';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: 'Compare Stocks | Crux',
  description: 'Compare stock fundamentals side-by-side on Crux',
  openGraph: {
    title: 'Compare Stocks | Crux',
    description: 'Side-by-side fundamental analysis',
    url: `${BASE_URL}/compare`,
    siteName: 'Crux',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compare Stocks | Crux',
    description: 'Side-by-side fundamental analysis on Crux',
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
