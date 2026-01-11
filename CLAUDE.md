# Claude Code Guidelines for Recon

This document establishes the coding standards, architectural decisions, and development philosophy for the Recon project. Follow these guidelines when writing or reviewing code.

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
- Shared types live in `/packages/shared`
- API response shapes are defined once and imported by both frontend and backend

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
```go
// Bad
if score > 7 {

// Good
const PiotroskiStrongSignal = 7
if score > PiotroskiStrongSignal {
```

**Error Handling**
- Explicit, never swallowed silently
- Wrap errors with context
- Handle errors at the appropriate level

**Nesting**
- No nested callbacks deeper than 2 levels
- Extract to named functions if nesting grows

### Performance Mindset

**Database**
- Always consider indexes
- Never N+1 queries
- Use EXPLAIN on complex queries

**API Responses**
- Paginate large datasets
- Compress where appropriate
- Include cache headers

**Caching Strategy**
- Cache aggressively
- Invalidate precisely
- Always track staleness (timestamps on cached data)

**Frontend**
- Minimize re-renders
- Lazy load heavy components
- Use React Server Components where possible

### Data Integrity

- All financial calculations must be deterministic and testable
- External API data is validated before storage
- Database operations use transactions where atomicity matters
- Timestamps on all cached data (staleness must be visible)

---

## Architecture Decisions

### Frontend (Next.js 14 - `/apps/web`)

| Decision | Rationale |
|----------|-----------|
| App Router | Server components by default, better performance |
| Server Components | Use where possible, client only for interactivity |
| TanStack Query | Server state management, caching, refetching |
| shadcn/ui + Tremor | Consistent UI, chart-ready components |
| Tailwind CSS | Utility-first, no custom CSS unless necessary |

### Backend (Go - `/apps/api`)

| Decision | Rationale |
|----------|-----------|
| Chi router | Lightweight, idiomatic, good middleware support |
| sqlx | Direct SQL control, no ORM magic |
| Explicit errors | Wrapped errors with `fmt.Errorf("context: %w", err)` |
| slog | Structured logging, stdlib |
| Constructor DI | Dependencies via function params, not globals |

### Database

| Technology | Purpose |
|------------|---------|
| PostgreSQL | Persistent data, financial records, user data |
| Redis | Caching, rate limiting, session storage |
| Explicit migrations | Version controlled, never auto-migrate in production |

### Shared Contracts (`/packages/shared`)

- TypeScript interfaces define API request/response shapes
- These are the **source of truth** for frontend types
- Backend must conform to these contracts (validated in tests)

---

## File Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| Go files | snake_case | `piotroski_score.go` |
| TypeScript files | kebab-case | `stock-card.tsx` |
| React components | PascalCase export | `export function StockCard()` |
| Test files | `.test` suffix | `piotroski_score_test.go`, `stock-card.test.tsx` |

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

### Pull Requests

- Require passing tests
- Require passing linting
- Include description of changes
- Reference related issues

---

## Testing Philosophy

### Principles

1. **Unit tests for all calculation logic** - Piotroski score, signals, ratios
2. **Integration tests for API endpoints** - Full request/response cycle
3. **No mocking unless external dependencies** - Mock external APIs, not internal code
4. **Tests are documentation** - Name them clearly

### Test Naming

```go
// Go
func TestPiotroskiScore_PositiveROA_ReturnsOne(t *testing.T)
func TestPiotroskiScore_AllCriteriaMet_ReturnsNine(t *testing.T)
```

```typescript
// TypeScript
describe('calculatePiotroskiScore', () => {
  it('returns 1 when ROA is positive', () => {})
  it('returns 9 when all criteria are met', () => {})
})
```

---

## Claude Guidelines

### Always Do

1. **Understand the "why"** before writing code
2. **Check for existing functionality** before creating new
3. **Write tests alongside implementation**, not after
4. **Keep functions pure** where possible
5. **Handle errors at the appropriate level**
6. **Log meaningful context**, not noise

### Never Do

1. **Swallow errors silently**
   ```go
   // Never
   result, _ := dangerousOperation()

   // Always
   result, err := dangerousOperation()
   if err != nil {
       return fmt.Errorf("operation failed: %w", err)
   }
   ```

2. **Use `any` type in TypeScript**
   ```typescript
   // Never
   function processData(data: any): any

   // Always
   function processData(data: StockData): ProcessedSignals
   ```

3. **Write functions longer than 30 lines** without good reason

4. **Skip input validation** on external data

5. **Commit dead code or TODOs** without tickets

6. **Use magic strings** for keys, statuses, or config
   ```typescript
   // Never
   if (status === 'active')

   // Always
   if (status === AccountStatus.Active)
   ```

---

## Common Patterns

### Go Error Handling

```go
func (s *StockService) GetByTicker(ctx context.Context, ticker string) (*Stock, error) {
    stock, err := s.repo.FindByTicker(ctx, ticker)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            return nil, fmt.Errorf("stock %s not found: %w", ticker, err)
        }
        return nil, fmt.Errorf("fetching stock %s: %w", ticker, err)
    }
    return stock, nil
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

async function fetchStock(ticker: string): Promise<StockResponse> {
  const response = await fetch(`/api/stocks/${ticker}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stock: ${response.statusText}`);
  }
  return response.json();
}
```

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

---

## Quick Reference

| Aspect | Standard |
|--------|----------|
| Max function length | 20-30 lines |
| Max nesting depth | 2 levels |
| Error handling | Explicit, wrapped with context |
| Types | No `any`, use interfaces |
| Tests | Alongside implementation |
| Commits | Conventional format |
| Branches | `type/description` |
