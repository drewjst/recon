import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TickerSearch } from './ticker-search';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-search', () => ({
  useSearch: () => ({
    query: '',
    setQuery: vi.fn(),
    results: [],
    isLoading: false,
  }),
}));

describe('TickerSearch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the search input', () => {
    render(<TickerSearch />);
    expect(screen.getByPlaceholderText('Search ticker or company...')).toBeDefined();
  });

  it('renders the keyboard shortcut hint when query is empty', () => {
    render(<TickerSearch />);
    // Check if the forward slash is present in the document
    expect(screen.getByText('/')).toBeDefined();
  });

  it('focuses input when / is pressed', () => {
    render(<TickerSearch />);
    const input = screen.getByPlaceholderText('Search ticker or company...');

    // Simulate pressing '/' key on the document
    fireEvent.keyDown(document, { key: '/' });

    // Check if input is focused
    expect(document.activeElement).toBe(input);
  });
});
