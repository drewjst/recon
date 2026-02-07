'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
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

const NAV_LINKS = [
  { href: '/', label: 'Screener', match: (p: string) => p === '/' || p.startsWith('/stock/') },
  { href: '/compare', label: 'Compare', match: (p: string) => p.startsWith('/compare') },
  { href: '/10k', label: '10-K', match: (p: string) => p.startsWith('/10k') },
  { href: '/sectors', label: 'Sectors', match: (p: string) => p.startsWith('/sectors') },
  { href: '/crypto', label: 'Crypto', match: (p: string) => p.startsWith('/crypto') },
];

function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV_LINKS.map((link, i) => (
        <span key={link.href} className="flex items-center">
          {i > 0 && (
            <span className="h-3.5 w-px bg-border/60 mx-1" />
          )}
          <NavLink href={link.href} isActive={link.match(pathname)}>
            {link.label}
          </NavLink>
        </span>
      ))}
    </nav>
  );
}

function MobileMenu({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative mx-auto max-w-lg px-4 pt-4">
        <div className="rounded-lg border bg-card shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-medium text-muted-foreground">Menu</span>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-2 py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  'block px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  link.match(pathname)
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search */}
          <div className="px-4 pb-4 pt-2 border-t">
            <TickerSearch
              autoFocus
              onSelect={() => onClose()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          {/* Left - Logo */}
          <div className="flex flex-1 items-center">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Cruxit
              </span>
            </Link>
          </div>

          {/* Center - Navigation */}
          <div className="hidden md:flex shrink-0">
            <Suspense fallback={null}>
              <Navigation />
            </Suspense>
          </div>

          {/* Right - Search + Theme toggle */}
          <div className="flex flex-1 items-center justify-end gap-3">
            {/* Desktop Search */}
            <div className="hidden md:flex flex-1">
              <Suspense fallback={null}>
                <TickerSearch placeholder="Search stocks..." />
              </Suspense>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground transition-colors hover:text-foreground hover:border-border"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <Suspense fallback={null}>
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </Suspense>
    </>
  );
}
