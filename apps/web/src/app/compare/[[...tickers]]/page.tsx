'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Loader2, GitCompare, Plus, X, Search } from 'lucide-react';
import { CompareView } from '@/components/compare/compare-view';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShareButton } from '@/components/ui/share-button';
import { useSearch } from '@/hooks/use-search';
import { useStock } from '@/hooks/use-stock';
import { cn } from '@/lib/utils';
import { COMPARE_LIMITS } from '@/lib/constants';

const BASE_URL = 'https://cruxit.finance';

const { MIN_TICKERS, MAX_TICKERS } = COMPARE_LIMITS;

interface StockPickerProps {
  onSelect: (ticker: string) => void;
  placeholder?: string;
}

function StockPicker({ onSelect, placeholder = 'Search ticker...' }: StockPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { query, setQuery, results, isLoading } = useSearch();

  const handleSelect = useCallback(
    (ticker: string) => {
      onSelect(ticker.toUpperCase());
      setIsOpen(false);
      setQuery('');
    },
    [onSelect, setQuery]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        handleSelect(query.trim());
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
          handleSelect(results[selectedIndex].ticker);
        } else if (query.trim()) {
          handleSelect(query.trim());
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

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10 h-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
          <ul className="py-1 max-h-[200px] overflow-auto">
            {results.map((result, index) => (
              <li key={result.ticker}>
                <button
                  type="button"
                  onClick={() => handleSelect(result.ticker)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2 text-left',
                    index === selectedIndex && 'bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.ticker}</span>
                    {result.type === 'etf' && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                        ETF
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground truncate ml-2 max-w-[150px]">
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

function CompareContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tickersParam = searchParams.get('tickers');

  // Get tickers from path params (for /compare/AAPL/MSFT URLs)
  const pathTickers = params.tickers as string[] | undefined;

  const [tickers, setTickers] = useState<string[]>(() => {
    // First check path params (from shared links)
    if (pathTickers && pathTickers.length > 0) {
      return pathTickers
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, MAX_TICKERS);
    }
    // Then check query params
    if (tickersParam) {
      return tickersParam
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, MAX_TICKERS);
    }
    return [];
  });

  const addTicker = (ticker: string) => {
    const upperTicker = ticker.toUpperCase();
    if (!tickers.includes(upperTicker) && tickers.length < MAX_TICKERS) {
      const newTickers = [...tickers, upperTicker];
      setTickers(newTickers);
      const newUrl = newTickers.length > 0 ? `/compare?tickers=${newTickers.join(',')}` : '/compare';
      router.replace(newUrl, { scroll: false });
    }
  };

  const removeTicker = (ticker: string) => {
    const newTickers = tickers.filter((t) => t !== ticker);
    setTickers(newTickers);
    const newUrl = newTickers.length > 0 ? `/compare?tickers=${newTickers.join(',')}` : '/compare';
    router.replace(newUrl, { scroll: false });
  };

  // Fetch peer suggestions based on the first selected stock
  const { data: firstStockData } = useStock(tickers.length >= 1 ? tickers[0] : '');
  const peers = firstStockData?.peers?.filter(p => !tickers.includes(p.toUpperCase())).slice(0, 8) || [];

  const emptySlots = MAX_TICKERS - tickers.length;

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GitCompare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Compare Stocks</h1>
        </div>
        {tickers.length >= MIN_TICKERS && (
          <ShareButton
            ticker={tickers[0]}
            text={`Comparing ${tickers.join(' vs ')} on Crux`}
            url={`${BASE_URL}/compare/${tickers.join('/')}`}
            size="sm"
          />
        )}
      </div>

      {/* Stock Selection Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Selected stocks */}
        {tickers.map((ticker) => (
          <Card key={ticker} className="relative group">
            <CardContent className="p-4 flex items-center justify-center h-[100px]">
              <span className="text-xl font-bold">{ticker}</span>
              <button
                onClick={() => removeTicker(ticker)}
                className="absolute top-2 right-2 p-1 rounded-full bg-muted opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                aria-label={`Remove ${ticker}`}
              >
                <X className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}

        {/* Empty slots with add button */}
        {emptySlots > 0 && (
          <Card className="border-dashed">
            <CardContent className="p-4 h-[100px]">
              <StockPicker
                onSelect={addTicker}
                placeholder={tickers.length === 0 ? 'Add first stock...' : 'Add stock...'}
              />
            </CardContent>
          </Card>
        )}

        {/* Remaining empty placeholders */}
        {Array.from({ length: emptySlots - 1 }).map((_, i) => (
          <Card key={`empty-${i}`} className="border-dashed opacity-50">
            <CardContent className="p-4 flex items-center justify-center h-[100px]">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Peer suggestions - show while there are peers and room for more tickers */}
      {peers.length > 0 && tickers.length < MAX_TICKERS && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">Similar to {tickers[0]}:</span>
          {peers.map((peer) => (
            <button
              key={peer}
              onClick={() => addTicker(peer)}
              className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
            >
              {peer}
            </button>
          ))}
        </div>
      )}

      {/* Selected tickers badges */}
      {tickers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">Comparing:</span>
          {tickers.map((ticker) => (
            <Badge key={ticker} variant="secondary" className="text-sm gap-1">
              {ticker}
              <button
                onClick={() => removeTicker(ticker)}
                className="ml-1 hover:text-destructive"
                aria-label={`Remove ${ticker}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {tickers.length < MIN_TICKERS && (
            <span className="text-sm text-muted-foreground">
              (add {MIN_TICKERS - tickers.length} more to compare)
            </span>
          )}
        </div>
      )}

      {/* Comparison View or Empty State */}
      {tickers.length >= MIN_TICKERS ? (
        <CompareView tickers={tickers} />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
          <GitCompare className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Add stocks to compare</h2>
          <p className="mt-2 text-muted-foreground max-w-md">
            Search and add {MIN_TICKERS}-{MAX_TICKERS} stocks to compare their fundamentals side-by-side.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <CompareContent />
      </Suspense>
    </div>
  );
}
