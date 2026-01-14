'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BarChart3, Menu, X } from 'lucide-react';
import { TickerSearch } from '@/components/search/ticker-search';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function HeaderSearch() {
  const searchParams = useSearchParams();
  const tickerParam = searchParams.get('ticker');

  if (!tickerParam) return null;

  return (
    <div className="flex-1 max-w-xl">
      <TickerSearch />
    </div>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

function NavLink({ href, children, disabled, className }: NavLinkProps) {
  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'text-sm font-medium text-muted-foreground/50 cursor-not-allowed',
              className
            )}
          >
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
        'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
        className
      )}
    >
      {children}
    </Link>
  );
}

function Navigation({ className, onLinkClick }: { className?: string; onLinkClick?: () => void }) {
  return (
    <nav className={cn('flex items-center gap-6', className)}>
      <Link
        href="/"
        onClick={onLinkClick}
        className="text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        Distill
      </Link>
      <NavLink href="/options" disabled>
        Options
      </NavLink>
      <NavLink href="/news" disabled>
        News
      </NavLink>
    </nav>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/90">
      <div className="mx-auto max-w-[1600px] flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent transition-all duration-300 group-hover:shadow-glow">
            <BarChart3 className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="font-semibold text-xl text-foreground tracking-tight">Recon</span>
        </Link>

        {/* Centered Desktop Navigation */}
        <Navigation className="hidden md:flex absolute left-1/2 -translate-x-1/2" />

        <div className="flex items-center gap-4">
          <Suspense fallback={null}>
            <HeaderSearch />
          </Suspense>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-card/95 backdrop-blur-xl">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-4">
            <Navigation
              className="flex-col items-start gap-4"
              onLinkClick={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}
    </header>
  );
}
