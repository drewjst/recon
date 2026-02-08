# Claude Code Guidelines for Cruxit

This document establishes the coding standards, architectural decisions, and development philosophy for the Cruxit frontend. Follow these guidelines when writing or reviewing code.

## Project Overview

Cruxit is a stock fundamental analysis tool. This repo contains the **Next.js frontend only**. The Go API backend lives in a separate private repository (`drewjst/crux-api`).

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Next.js (App Router) | Framework, server components by default |
| TanStack Query | Server state management, caching, refetching |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | UI component library |
| Recharts | Charts and visualizations |
| `@recon/shared` | Shared TypeScript types (`packages/shared/`) |
| Cloud Run | Deployment (containerized) |

## API

- Backend is in a separate private repository (`drewjst/crux-api`)
- API base URL configured via `NEXT_PUBLIC_API_URL` env var
- Do not hardcode API URLs
- API response types are defined in `packages/shared/` and `src/lib/api.ts`

---

## Project Philosophy

This codebase prioritizes **readability over cleverness**. We follow principles from:
- "Clean Code" by Robert Martin
- "Code Complete" by Steve McConnell

Core beliefs:
- Code should be self-documenting; comments explain "why", not "what"
- Functions do one thing and do it well
- No premature optimization, but design for performance from the start

---

## Code Principles

### DRY (Don't Repeat Yourself)

- Extract repeated logic into well-named functions
- Shared types live in `packages/shared/`

### Clean Code Standards

**Functions**
- Maximum 20-30 lines
- Single responsibility
- Pure functions where possible

**Naming**
- Intention-revealing names
- No abbreviations except industry-standard (e.g., ROA, P/E, EPS)
- Boolean variables/functions: `is`, `has`, `should` prefixes

**No Magic Numbers**
```typescript
// Bad
if (score > 7) {

// Good
const PIOTROSKI_STRONG_SIGNAL = 7;
if (score > PIOTROSKI_STRONG_SIGNAL) {
```

**Error Handling**
- Explicit, never swallowed silently
- Handle errors at the appropriate level

**Nesting**
- No nested callbacks deeper than 2 levels
- Extract to named functions if nesting grows

### Performance Mindset

- Minimize re-renders
- Lazy load heavy components
- Use React Server Components where possible
- Cache aggressively with TanStack Query

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| App Router | Server components by default, better performance |
| Server Components | Use where possible, client only for interactivity |
| TanStack Query | Server state management, caching, refetching |
| shadcn/ui | Consistent UI components |
| Tailwind CSS | Utility-first, no custom CSS unless necessary |

### Shared Types (`packages/shared/`)

- TypeScript interfaces define API response shapes
- These are the **source of truth** for frontend types
- Backend must conform to these contracts

### React Component Structure

```typescript
// stock-card.tsx
import type { Stock } from '@recon/shared';

interface StockCardProps {
  stock: Stock;
  onSelect?: (ticker: string) => void;
}

export function StockCard({ stock, onSelect }: StockCardProps) {
  // Hooks first
  // Event handlers
  // Early returns for loading/error states
  // Main render
}
```

### TypeScript API Calls

```typescript
import { useQuery } from '@tanstack/react-query';
import type { StockResponse } from '@recon/shared';

export function useStock(ticker: string) {
  return useQuery({
    queryKey: ['stock', ticker],
    queryFn: () => fetchStock(ticker),
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## File Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| TypeScript files | kebab-case | `stock-card.tsx` |
| React components | PascalCase export | `export function StockCard()` |
| Test files | `.test` suffix | `stock-card.test.tsx` |

---

## Git Conventions

### Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code change that neither fixes nor adds
- `docs:` Documentation only
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Branch Naming

```
feature/ticker-search
fix/cache-invalidation
refactor/signal-calculation
```

---

## Claude Guidelines

### Always Do

1. **Understand the "why"** before writing code
2. **Check for existing functionality** before creating new
3. **Keep functions pure** where possible
4. **Handle errors at the appropriate level**

### Never Do

1. **Use `any` type in TypeScript**
   ```typescript
   // Never
   function processData(data: any): any

   // Always
   function processData(data: StockData): ProcessedSignals
   ```

2. **Write functions longer than 30 lines** without good reason

3. **Skip input validation** on external data

4. **Commit dead code or TODOs** without tickets

5. **Use magic strings** for keys, statuses, or config
   ```typescript
   // Never
   if (status === 'active')

   // Always
   if (status === AccountStatus.Active)
   ```

---

## Quick Reference

| Aspect | Standard |
|--------|----------|
| Max function length | 20-30 lines |
| Max nesting depth | 2 levels |
| Error handling | Explicit, contextual |
| Types | No `any`, use interfaces |
| Tests | Alongside implementation |
| Commits | Conventional format |
| Branches | `type/description` |
