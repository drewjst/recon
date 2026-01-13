'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearch } from '@/hooks/use-search';
import { cn } from '@/lib/utils';

interface TickerSearchProps {
  size?: 'default' | 'lg';
  autoFocus?: boolean;
  className?: string;
}

export function TickerSearch({ size = 'default', autoFocus = false, className }: TickerSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { query, setQuery, results, isLoading } = useSearch();

  const handleSubmit = useCallback(
    (ticker?: string) => {
      const target = ticker || query;
      if (target.trim()) {
        router.push(`/?ticker=${target.toUpperCase()}`);
        setIsOpen(false);
        setQuery('');
      }
    },
    [query, router, setQuery]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter') {
        handleSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSubmit(results[selectedIndex].ticker);
        } else {
          handleSubmit();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
    if (query.length >= 1) {
      setIsOpen(true);
    }
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isLarge = size === 'lg';

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative flex items-center">
        <Search
          className={cn(
            'absolute left-3 text-muted-foreground',
            isLarge ? 'h-5 w-5' : 'h-4 w-4'
          )}
        />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search ticker or company..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 1 && setIsOpen(true)}
          autoFocus={autoFocus}
          className={cn(
            'pl-10 pr-24',
            isLarge && 'h-14 text-lg'
          )}
        />
        <div className="absolute right-1 flex items-center gap-2">
          {!query && (
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">/</span>
            </kbd>
          )}
          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!query.trim()}
            className={cn(isLarge ? 'h-12 px-6' : 'h-8 px-4')}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Distill'
            )}
          </Button>
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
          <ul className="py-1">
            {results.map((result, index) => (
              <li key={result.ticker}>
                <button
                  type="button"
                  onClick={() => handleSubmit(result.ticker)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2 text-left',
                    index === selectedIndex && 'bg-accent'
                  )}
                >
                  <span className="font-medium">{result.ticker}</span>
                  <span className="text-sm text-muted-foreground truncate ml-2 max-w-[200px]">
                    {result.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
