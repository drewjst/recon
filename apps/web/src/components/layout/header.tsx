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
  const is10KActive = pathname.startsWith('/10k');
  const isSectorsActive = pathname.startsWith('/sectors');
  const isCryptoActive = pathname.startsWith('/crypto');

  const links = [
    { href: '/', label: 'Screener', isActive: isScreenerActive },
    { href: '/compare', label: 'Compare', isActive: isCompareActive },
    { href: '/10k', label: '10-K', isActive: is10KActive },
    { href: '/sectors', label: 'Sectors', isActive: isSectorsActive },
    { href: '/crypto', label: 'Crypto', isActive: isCryptoActive },
  ];

  return (
    <nav className="flex items-center gap-1">
      {links.map((link, i) => (
        <span key={link.href} className="flex items-center">
          {i > 0 && (
            <span className="h-3.5 w-px bg-border/60 mx-1" />
          )}
          <NavLink href={link.href} isActive={link.isActive}>
            {link.label}
          </NavLink>
        </span>
      ))}
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
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          {/* Left - Logo */}
          <div className="shrink-0 mr-6">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Cruxit
              </span>
            </Link>
          </div>

          {/* Center - Navigation */}
          <div className="hidden md:flex flex-1 justify-center">
            <Suspense fallback={null}>
              <Navigation />
            </Suspense>
          </div>

          {/* Right - Search + Theme toggle */}
          <div className="flex items-center justify-end gap-3 flex-1 md:flex-none md:w-96">
            {/* Desktop Search */}
            <div className="hidden md:flex flex-1">
              <Suspense fallback={null}>
                <TickerSearch placeholder="Search stocks..." />
              </Suspense>
            </div>

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
