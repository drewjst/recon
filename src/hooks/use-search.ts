'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchTickers } from '@/lib/api';
import { debounce } from '@/lib/utils';
import type { SearchResponse } from '@recon/shared';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const debouncedSetQuery = useMemo(
    () => debounce((value: string) => setDebouncedQuery(value), 300),
    []
  );

  useEffect(() => {
    return () => debouncedSetQuery.cancel();
  }, [debouncedSetQuery]);

  const handleSetQuery = (value: string) => {
    setQuery(value);
    debouncedSetQuery(value);
  };

  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchTickers(debouncedQuery),
    enabled: debouncedQuery.length >= 2, // Require 2 chars to reduce noise
    staleTime: 60 * 1000, // 1 minute cache
  });

  return {
    query,
    setQuery: handleSetQuery,
    results: data?.results || [],
    isLoading: isLoading && debouncedQuery.length >= 2,
    error,
  };
}
