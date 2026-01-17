'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { TickerSearch } from '@/components/search/ticker-search';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function HeaderSearch() {
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get('ticker');

  if (!tickerParam) return null;

  return (
    <div className="hidden sm:block w-full max-w-xs lg:max-w-md xl:max-w-lg">
      <TickerSearch />
    </div>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
  isActive?: boolean;
}

function NavLink({ href, children, disabled, isActive }: NavLinkProps) {
  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="relative px-3 py-1.5 text-sm font-medium text-muted-foreground/40 cursor-not-allowed">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Coming Soon</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'relative px-3 py-1.5 text-sm font-medium transition-colors rounded-md',
        isActive
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      {children}
      {isActive && (
        <span className="absolute inset-x-1 -bottom-[13px] h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
      )}
    </Link>
  );
}

function Navigation({ className, onLinkClick }: { className?: string; onLinkClick?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTicker = Boolean(searchParams.get('ticker'));

  const isDistillActive = pathname === '/' && hasTicker;
  const isCompareActive = pathname.startsWith('/compare');
  const isCryptoActive = pathname === '/crypto';

  return (
    <nav className={cn('flex items-center', className)}>
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30 border border-border/50">
        <NavLink href="/" isActive={isDistillActive}>
          Distill
        </NavLink>
        <NavLink href="/compare" isActive={isCompareActive}>
          Compare
        </NavLink>
        <NavLink href="/crypto" isActive={isCryptoActive}>
          Crypto
        </NavLink>
      </div>
    </nav>
  );
}

function MobileNavigation({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTicker = Boolean(searchParams.get('ticker'));

  const links = [
    { href: '/', label: 'Distill', active: pathname === '/' && hasTicker },
    { href: '/compare', label: 'Compare', active: pathname.startsWith('/compare') },
    { href: '/crypto', label: 'Crypto', active: pathname === '/crypto' },
    { href: '/options', label: 'Options', disabled: true },
    { href: '/news', label: 'News', disabled: true },
  ];

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => (
        link.disabled ? (
          <span
            key={link.href}
            className="px-4 py-2.5 text-sm font-medium text-muted-foreground/40 cursor-not-allowed"
          >
            {link.label}
            <span className="ml-2 text-xs text-muted-foreground/30">Soon</span>
          </span>
        ) : (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
              link.active
                ? 'text-foreground bg-muted/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            )}
          >
            {link.label}
          </Link>
        )
      ))}
    </nav>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-card shadow-sm">
      {/* Gradient accent line at top */}
      <div className="h-[2px] bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />

      <div className="border-b border-border/60">
        <div className="relative mx-auto max-w-[1600px] flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20 transition-all duration-300 group-hover:shadow-orange-500/40 group-hover:scale-105">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-white"
              >
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-4-4-3 3" />
              </svg>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-50" />
            </div>
            <span className="font-semibold text-xl tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Cruxit
            </span>
          </Link>

          {/* Center Navigation - Absolutely positioned to stay centered */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Suspense fallback={null}>
              <Navigation />
            </Suspense>
          </div>

          {/* Right side - Search + Mobile menu */}
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <HeaderSearch />
            </Suspense>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                'md:hidden flex items-center justify-center h-9 w-9 rounded-lg border transition-all duration-200',
                mobileMenuOpen
                  ? 'border-orange-500/50 bg-orange-500/10 text-orange-500'
                  : 'border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border'
              )}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/60">
            <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-4">
              {/* Mobile Search */}
              <div className="mb-4 sm:hidden">
                <Suspense fallback={null}>
                  <TickerSearch />
                </Suspense>
              </div>
              <Suspense fallback={null}>
                <MobileNavigation onLinkClick={() => setMobileMenuOpen(false)} />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
