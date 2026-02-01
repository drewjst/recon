'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { TickerSearch } from '@/components/search/ticker-search';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}

function NavLink({ href, children, isActive }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground/80'
      )}
    >
      {children}
    </Link>
  );
}

function Navigation() {
  const pathname = usePathname();

  const isScreenerActive = pathname === '/' || pathname.startsWith('/stock/');
  const isCompareActive = pathname.startsWith('/compare');
  const isWatchlistActive = pathname === '/watchlist';

  return (
    <nav className="flex items-center gap-1">
      <NavLink href="/" isActive={isScreenerActive}>
        Screener
      </NavLink>
      <NavLink href="/compare" isActive={isCompareActive}>
        Compare
      </NavLink>
      <NavLink href="/watchlist" isActive={isWatchlistActive}>
        Watchlist
      </NavLink>
    </nav>
  );
}

function MobileSearchModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative mx-auto mt-20 max-w-lg px-4">
        <div className="rounded-lg border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground">Search stocks</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <TickerSearch
            autoFocus
            onSelect={() => onClose()}
          />
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left side - Logo + Nav */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Cruxit
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex">
              <Suspense fallback={null}>
                <Navigation />
              </Suspense>
            </div>
          </div>

          {/* Center - Search (desktop only) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <Suspense fallback={null}>
              <TickerSearch placeholder="Search stocks..." />
            </Suspense>
          </div>

          {/* Right side - Mobile search + Theme toggle */}
          <div className="flex items-center gap-2">
            {/* Mobile Search Button */}
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground transition-colors hover:text-foreground hover:border-border"
              aria-label="Open search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile Search Modal */}
      <MobileSearchModal
        isOpen={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
      />
    </>
  );
}
