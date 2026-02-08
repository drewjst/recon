'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSearch } from '@/hooks/use-search';
import { cn } from '@/lib/utils';

interface TickerSearchProps {
  size?: 'default' | 'lg';
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
  buttonLabel?: string;
  onSelect?: (ticker: string) => void;
}

export function TickerSearch({
  size = 'default',
  autoFocus = false,
  className,
  placeholder = 'Search ticker...',
  buttonLabel = 'Distill',
  onSelect,
}: TickerSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [modifier, setModifier] = useState('⌘');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { query, setQuery, results, isLoading } = useSearch();

  useEffect(() => {
    if (typeof navigator !== 'undefined' && /Win|Linux/.test(navigator.platform)) {
      setModifier('Ctrl');
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'k' &&
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = useCallback(
    (ticker?: string) => {
      const target = ticker || query;
      if (target.trim()) {
        if (onSelect) {
          onSelect(target.toUpperCase());
        } else {
          router.push(`/?ticker=${target.toUpperCase()}`);
        }
        setIsOpen(false);
        setQuery('');
      }
    },
    [query, router, setQuery, onSelect]
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
    if (query.length >= 2) {
      setIsOpen(true);
    }
  }, [query]);

  const isLarge = size === 'lg';

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative flex items-center">
        <Search
          className={cn(
            'absolute left-3 text-muted-foreground',
            isLarge ? 'h-5 w-5' : 'h-4 w-4'
          )}
          aria-hidden="true"
        />
        <label htmlFor="ticker-search" className="sr-only">
          Search ticker
        </label>
        <Input
          id="ticker-search"
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-autocomplete="list"
          className={cn(
            'pl-9 pr-20',
            isLarge && 'h-14 text-lg pl-10 pr-24'
          )}
        />
        {!query && (
          <kbd
            className={cn(
              'pointer-events-none absolute right-24 top-1/2 -translate-y-1/2 hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex text-muted-foreground',
              isLarge && 'right-28'
            )}
            title={`${modifier} + K`}
          >
            <span className="text-xs">{modifier}</span>K
          </kbd>
        )}
        <Button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!query.trim()}
          className={cn(
            'absolute right-1',
            isLarge ? 'h-12 px-6' : 'h-8 px-4'
          )}
          aria-label="Distill stock data"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            buttonLabel
          )}
        </Button>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
          <ul id="search-results" role="listbox" className="py-1">
            {results.map((result, index) => (
              <li key={result.ticker} role="option" aria-selected={index === selectedIndex}>
                <button
                  type="button"
                  onClick={() => handleSubmit(result.ticker)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2 text-left',
                    index === selectedIndex && 'bg-accent'
                  )}
                  tabIndex={-1}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.ticker}</span>
                    {result.type === 'etf' && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                        ETF
                      </Badge>
                    )}
                  </div>
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
