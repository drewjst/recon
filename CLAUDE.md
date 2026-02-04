# Claude Code Guidelines for Crux

This document establishes the coding standards, architectural decisions, and development philosophy for the Crux project. Follow these guidelines when writing or reviewing code.

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
| PostgreSQL | Cache storage (JSONB), financial statements persistence |
| GORM auto-migrate | Schema management for all tables |

**Database Schema:**
```
financial_periods (ticker, period_type, period_end, fiscal_year, fiscal_quarter)
  ├── income_statements (revenue, expenses, net_income, EPS, margins)
  ├── balance_sheets (assets, liabilities, equity, ratios)
  ├── cash_flow_statements (operating, investing, financing, FCF)
  └── revenue_segments (product/geography breakdown) [future]

stock_cache (ticker → JSONB fundamentals)
provider_cache (data_type + key → JSONB with TTL)
quote_cache (ticker → real-time price data)
```

### Shared Contracts (`/packages/shared`)

- TypeScript interfaces define API request/response shapes
- These are the **source of truth** for frontend types
- Backend must conform to these contracts (validated in tests)

### Data Providers

We use multiple external data sources:

| Provider | Purpose | Key Endpoints |
|----------|---------|---------------|
| **FMP** | Fundamentals, financials, ratios, holdings, insider trades, analyst estimates | See FMP endpoints table below |
| **Polygon.io** | Ticker search, company metadata | `/v3/reference/tickers` (parallel ticker prefix + name search) |

**FMP Endpoints Used:**

| Endpoint | Purpose | Tier Required |
|----------|---------|---------------|
| `/stable/profile` | Company profile, description, sector | Free |
| `/stable/quote` | Real-time stock quotes | Free |
| `/stable/income-statement` | Income statements | Free |
| `/stable/balance-sheet-statement` | Balance sheets | Free |
| `/stable/cash-flow-statement` | Cash flow statements | Free |
| `/stable/ratios-ttm` | TTM financial ratios | Free |
| `/stable/key-metrics-ttm` | TTM key metrics | Free |
| `/stable/ratios` | Historical ratios (quarterly) | Free |
| `/stable/discounted-cash-flow` | DCF valuation | Free |
| `/stable/stock-peers` | Peer/competitor companies | Paid |
| `/stable/owner-earnings` | Buffett-style owner earnings | Paid |
| `/stable/insider-trading/search` | Insider trades | Paid |
| `/stable/institutional-ownership/*` | 13F holdings data | Paid |
| `/stable/grades-consensus` | Analyst ratings | Paid |
| `/stable/price-target-consensus` | Price targets | Paid |
| `/stable/analyst-estimates` | EPS/revenue estimates | Paid |
| `/stable/financial-growth` | Pre-calculated YoY growth rates | Free |
| `/stable/sector-pe` | Sector P/E ratios | Paid |
| `/stable/industry-pe` | Industry P/E ratios | Paid |

**Provider Architecture:**
```
internal/infrastructure/providers/
├── interfaces.go       # FundamentalsProvider, QuoteProvider, SearchProvider
├── factory.go          # Provider creation based on config
├── cached.go           # CachedFundamentalsProvider (DB cache wrapper, 24h default TTL)
└── fmp/                # FMP provider
    ├── client.go       # HTTP client, auth, rate limiting
    ├── provider.go     # Interface implementation (ratios, growth, statements)
    ├── adapter.go      # FMP response → canonical models
    └── types.go        # FMP-specific response types
```

**Key patterns:**
- FMP is the **sole data provider** for stock fundamentals
- Providers implement interfaces defined in `interfaces.go`
- All external data maps to canonical models in `internal/domain/models/`
- Services depend on interfaces, not concrete providers

**Growth metric fallback pattern:**
FMP's `/stable/financial-growth` endpoint provides some pre-calculated YoY growth rates (revenue, EPS diluted, FCF) but omits others (net income, operating income, operating cash flow). When a field is missing (returns 0), the provider calculates it from 2 years of income/cash flow statements:
```go
// Fallback: calculate from statements when financial-growth endpoint doesn't provide the value
if ratios.NetIncomeGrowthYoY == 0 && priorNetIncome != 0 {
    ratios.NetIncomeGrowthYoY = (current - prior) / abs(prior) * 100
}
```

**Sector percentile ranking (SectorMetric):**
Growth, profitability, and financial health metrics are enriched with sector context via the `SectorMetric` struct. Each metric includes the stock's value, sector min/median/max, and a percentile (0-100). Sector ranges are hardcoded in `service.go` for all 11 GICS sectors. When adding new metrics that use `SectorMetric`, you must add range data for every sector.

### Caching Strategy

Data is cached in PostgreSQL to minimize external API calls:

| Data Type | Source | Cache TTL | Rationale |
|-----------|--------|-----------|-----------|
| Company Profile | FMP | 24 hours | Rarely changes |
| Financial Statements | FMP | 7 days | Updates quarterly |
| Ratios/Metrics | FMP | 24 hours | Derived from financials |
| Institutional Holdings | FMP | 24 hours | Updates quarterly (13F) |
| Insider Trades | FMP | 24 hours | Updates with SEC filings |
| Technical Metrics | FMP | 24 hours | Beta, moving averages |
| Analyst Estimates | FMP | 24 hours | Updates with new analyst coverage |
| AI Insights | Vertex AI | 24 hours | Generated on-demand |

**Cache Tables:**
- `stock_cache` — General stock data (JSONB)
- `provider_cache` — Provider-level response cache with TTL
- `financial_periods` — Financial statement period metadata
- `income_statements` — Income statement data by period
- `balance_sheets` — Balance sheet data by period
- `cash_flow_statements` — Cash flow data by period

**Financial Statements Repository:**
The `FinancialsRepository` uses a DB-first caching pattern:
1. Check DB for cached data within staleness threshold (7 days)
2. If stale or missing, fetch from FMP
3. Upsert to DB for future requests
4. Return stale data if FMP fails (graceful degradation)

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

### Polygon Ticker Search

The ticker search uses parallel queries for better results:

```
┌─────────────────────────────────────────────────────────────┐
│  User Query: "WM"                                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │ Ticker Prefix Search│    │ Name Search         │        │
│  │ ticker.gte=WM       │    │ search=WM           │        │
│  │ ticker.lte=WMZZZZ   │    │ (fuzzy name match)  │        │
│  └──────────┬──────────┘    └──────────┬──────────┘        │
│             │                          │                    │
│             └──────────┬───────────────┘                    │
│                        ▼                                    │
│              ┌─────────────────┐                            │
│              │ Merge & Dedup   │                            │
│              │ Sort by relevance│                            │
│              └─────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

**Supported security types:**
- `CS` — Common stocks (AAPL, GOOGL, WM)
- `ETF` — Exchange-traded funds (SPY, QQQ, VTI)
- `ADRC` — ADR Class C (NVO, TSM, BABA)

**Sorting priority:**
1. Exact ticker match (WM → WM first)
2. Ticker prefix match (WM → WMT, WMS)
3. Shorter tickers (more well-known)
4. Alphabetical

### Environment Variables

**Required API keys:**
- `FMP_API_KEY` — Financial Modeling Prep API key ([financialmodelingprep.com](https://financialmodelingprep.com)) — Stock fundamentals
- `POLYGON_API_KEY` — Polygon.io API key ([polygon.io](https://polygon.io)) — Ticker search

**Optional:**
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
