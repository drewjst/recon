'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { TickerSearch } from '@/components/search/ticker-search';

function HeaderSearch() {
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get('ticker');

  if (!tickerParam) return null;

  return (
    <div className="flex-1 max-w-md">
      <TickerSearch />
    </div>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition-all duration-300 group-hover:shadow-glow">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-xl text-foreground tracking-tight">Recon</span>
        </Link>

        <Suspense fallback={null}>
          <HeaderSearch />
        </Suspense>
      </div>
    </header>
  );
}
