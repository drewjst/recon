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
| GORM | ORM for cache tables, auto-migration support |
| Explicit errors | Wrapped errors with `fmt.Errorf("context: %w", err)` |
| slog | Structured logging, stdlib |
| Constructor DI | Dependencies via function params, not globals |

### Database

| Technology | Purpose |
|------------|---------|
| PostgreSQL | Cache storage (JSONB), stock data persistence |
| GORM auto-migrate | Schema management for cache tables |

### Shared Contracts (`/packages/shared`)

- TypeScript interfaces define API request/response shapes
- These are the **source of truth** for frontend types
- Backend must conform to these contracts (validated in tests)

### Data Providers

We use two external data sources:

| Provider | Purpose | Key Endpoints |
|----------|---------|---------------|
| **EODHD** | Fundamentals, financials, ratios, holdings, insider trades | `/fundamentals/{ticker}.US` |
| **Polygon.io** | Ticker search, company metadata | `/v3/reference/tickers` |

**Provider Architecture:**
```
internal/infrastructure/providers/
├── interfaces.go       # FundamentalsProvider, QuoteProvider, SearchProvider
├── factory.go          # Provider creation based on config
├── eodhd/
│   ├── client.go       # HTTP client, auth, rate limiting
│   ├── provider.go     # Interface implementation
│   ├── mapper.go       # EODHD response → canonical models
│   └── types.go        # EODHD-specific response types
└── fmp/                # Legacy provider (optional)
    └── ...
```

**Key patterns:**
- Providers implement interfaces defined in `interfaces.go`
- All external data maps to canonical models in `internal/domain/models/`
- Services depend on interfaces, not concrete providers
- Provider selection via `FUNDAMENTALS_PROVIDER` environment variable

### Caching Strategy

Data is cached in PostgreSQL to minimize external API calls:

| Data Type | Source | Cache TTL | Rationale |
|-----------|--------|-----------|-----------|
| Company Profile | EODHD | 24 hours | Rarely changes |
| Financial Statements | EODHD | 24 hours | Updates quarterly |
| Ratios/Metrics | EODHD | 24 hours | Derived from financials |
| Institutional Holdings | EODHD | 24 hours | Updates quarterly (13F) |
| Insider Trades | EODHD | 24 hours | Updates with SEC filings |
| Technical Metrics | EODHD | 24 hours | Beta, moving averages |
| Short Interest | EODHD | 24 hours | Updates bi-monthly |

Cache is stored as JSONB in the `stock_cache` table, keyed by ticker.

### Provider Implementation Guidelines

When adding or modifying data providers:

1. **Implement the interface** — All providers must satisfy `FundamentalsProvider`, `QuoteProvider`, or `SearchProvider`
2. **Map to canonical models** — Never leak provider-specific types to domain layer
3. **Handle errors gracefully** — Wrap external errors with context
4. **Log API calls** — Use `slog` for structured logging
5. **Use in-memory caching** — Provider-level cache (5 min TTL) reduces duplicate calls
6. **Return nil for missing data** — Don't error on optional fields

```go
// Good: graceful handling of optional data
func (p *Provider) GetDCF(ctx context.Context, ticker string) (*models.DCF, error) {
    // Provider doesn't support this endpoint
    return nil, nil
}
```

### Environment Variables

**Required API keys:**
- `EODHD_API_KEY` — EODHD API key ([eodhd.com](https://eodhd.com))
- `POLYGON_API_KEY` — Polygon.io API key ([polygon.io](https://polygon.io))

**Optional:**
- `FUNDAMENTALS_PROVIDER` — `"eodhd"` (default) or `"fmp"`
- `DATABASE_URL` — PostgreSQL connection (enables caching)

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
