import { Metadata } from 'next';
import { StockDashboard } from '@/components/dashboard/stock-dashboard';
import type { StockDetailResponse } from '@recon/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const BASE_URL = 'https://cruxit.finance';

function getOverallGrade(scores: StockDetailResponse['scores']): string {
  if (!scores) return 'N/A';

  const piotroski = scores.piotroski.score;
  const ruleOf40Passed = scores.ruleOf40.passed;
  const altmanZone = scores.altmanZ.zone;

  let points = 0;
  if (piotroski >= 7) points += 2;
  else if (piotroski >= 4) points += 1;
  if (ruleOf40Passed) points += 1;
  if (altmanZone === 'safe') points += 2;
  else if (altmanZone === 'gray') points += 1;

  if (points >= 5) return 'A';
  if (points >= 4) return 'B';
  if (points >= 3) return 'C';
  if (points >= 2) return 'D';
  return 'F';
}

async function getStockData(ticker: string): Promise<StockDetailResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/stock/${ticker.toUpperCase()}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface PageProps {
  params: { ticker: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const ticker = params.ticker.toUpperCase();
  const data = await getStockData(ticker);

  const companyName = data?.company.name ?? ticker;
  const grade = getOverallGrade(data?.scores);
  const piotroski = data?.scores?.piotroski.score ?? 0;
  const ruleOf40 = data?.scores?.ruleOf40.score ?? 0;

  const title = `${ticker} Stock Analysis | Crux`;
  const description = `${companyName} scores ${grade}. Piotroski: ${piotroski}/9, Rule of 40: ${ruleOf40.toFixed(0)}%`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: {
      title: `${ticker} Analysis | Crux`,
      description: `${companyName} fundamental analysis - Grade: ${grade}`,
      url: `${BASE_URL}/stock/${ticker}`,
      siteName: 'Crux',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${ticker} Analysis | Crux`,
      description: `Piotroski: ${piotroski}/9 • Rule of 40: ${ruleOf40.toFixed(0)}% • Grade: ${grade}`,
    },
  };
}

export default async function StockPage({ params }: PageProps) {
  const ticker = params.ticker.toUpperCase();
  const initialData = await getStockData(ticker);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col min-h-screen">
        <div className="py-8 flex-1">
          <StockDashboard ticker={ticker} initialData={initialData} />
        </div>
      </div>
    </div>
  );
}
