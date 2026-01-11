# Recon Architecture

This document provides a deep dive into Recon's architecture, design decisions, and data flow.

## System Overview

Recon is a stock research dashboard that transforms raw financial data into actionable trading signals. The system is designed around three core principles:

1. **Speed**: Get insights in under 30 seconds
2. **Accuracy**: Financial calculations must be deterministic and auditable
3. **Simplicity**: Clear signals, no information overload

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        Browser (Next.js)                            │ │
│  │   - Server Components for initial render                            │ │
│  │   - Client Components for interactivity                             │ │
│  │   - TanStack Query for data fetching & caching                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         Go API Server                               │ │
│  │   - Chi Router (HTTP handling)                                      │ │
│  │   - Handlers (request/response)                                     │ │
│  │   - Services (business logic)                                       │ │
│  │   - Repositories (data access)                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌────────────────────────────┐    ┌────────────────────────────┐
│        PostgreSQL          │    │           Redis            │
│   - Stock data             │    │   - API response cache     │
│   - Fundamentals           │    │   - Rate limiting          │
│   - Historical signals     │    │   - Session data           │
└────────────────────────────┘    └────────────────────────────┘
                    │
                    ▼
┌────────────────────────────┐
│    External Data APIs      │
│   - Financial data         │
│   - Market data            │
└────────────────────────────┘
```

## Component Details

### Frontend (apps/web)

The frontend is a Next.js 14 application using the App Router.

#### Directory Structure

```
apps/web/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout with providers
│   │   ├── page.tsx      # Home page
│   │   └── [ticker]/     # Dynamic stock pages
│   ├── components/       # React components
│   │   ├── ui/           # Base UI components (shadcn/ui)
│   │   └── features/     # Feature-specific components
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utilities and API client
```

#### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Server Components default | Reduce client-side JS, faster initial load |
| TanStack Query | Built-in caching, refetching, optimistic updates |
| shadcn/ui + Tremor | Consistent design system, chart-ready components |
| Tailwind CSS | Utility-first, no CSS-in-JS runtime cost |

### Backend (apps/api)

The backend is a Go application following clean architecture principles.

#### Directory Structure

```
apps/api/
├── cmd/
│   └── server/           # Application entrypoint
├── internal/
│   ├── config/           # Configuration loading
│   ├── handler/          # HTTP handlers
│   ├── router/           # Route definitions
│   ├── service/          # Business logic
│   ├── repository/       # Data access layer
│   └── model/            # Domain models
├── migrations/           # Database migrations
└── pkg/                  # Shared utilities (if needed)
```

#### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Chi router | Lightweight, idiomatic, middleware-friendly |
| sqlx | Direct SQL control, no magic, better performance |
| Constructor DI | Explicit dependencies, easy testing |
| Structured logging | slog is stdlib, JSON for production |

### Data Layer

#### PostgreSQL Schema (High-Level)

```sql
-- Core entities
stocks (id, ticker, name, sector, industry, created_at, updated_at)
fundamentals (stock_id, fiscal_year, revenue, net_income, ..., updated_at)

-- Computed data
signals_cache (stock_id, computed_at, piotroski_score, signals_json)

-- Indexes
CREATE INDEX idx_stocks_ticker ON stocks(ticker);
CREATE INDEX idx_fundamentals_stock_year ON fundamentals(stock_id, fiscal_year);
```

#### Redis Keys

```
stock:{ticker}:data     # Cached stock data (TTL: 1 hour)
stock:{ticker}:signals  # Cached signals (TTL: 15 minutes)
rate_limit:{ip}         # Rate limiting counter
```

## Data Flow

### Stock Lookup Flow

```
1. User enters ticker "AAPL"
2. Frontend calls GET /api/v1/stocks/AAPL
3. API checks Redis cache
   - Cache hit: return cached response
   - Cache miss: continue to step 4
4. API queries PostgreSQL for stock + fundamentals
   - Data exists: compute signals, cache, return
   - Data missing: fetch from external API, store, compute, return
5. Response returned with stock data + signals
```

### Signal Computation Flow

```
1. Load stock fundamentals (current + prior year)
2. Calculate Piotroski F-Score (9 binary tests)
3. Calculate additional signals (momentum, value, etc.)
4. Aggregate into overall sentiment
5. Store in cache with timestamp
```

## Caching Strategy

### Cache Layers

1. **Browser**: TanStack Query (staleTime: 5min)
2. **CDN**: Response headers (Cache-Control: max-age=300)
3. **Redis**: API response cache (TTL: varies by endpoint)
4. **Database**: Computed signals cache table

### Cache Invalidation

| Event | Action |
|-------|--------|
| New fundamentals received | Invalidate signals cache for ticker |
| Manual refresh requested | Bypass cache, recompute |
| Daily cron job | Refresh all cached data |

## Error Handling

### Error Categories

| Code Range | Meaning | Example |
|------------|---------|---------|
| 400-499 | Client error | Invalid ticker format |
| 500-599 | Server error | Database connection failed |

### Error Response Format

```json
{
  "code": "TICKER_NOT_FOUND",
  "message": "Stock with ticker 'XYZ' not found",
  "details": {
    "ticker": "XYZ",
    "suggestion": "Did you mean 'XYZL'?"
  }
}
```

## Security Considerations

1. **Input Validation**: All ticker inputs sanitized and validated
2. **Rate Limiting**: Per-IP limits via Redis
3. **SQL Injection**: Parameterized queries only (sqlx)
4. **XSS Prevention**: React's built-in escaping + CSP headers
5. **CORS**: Restricted to known origins

## Performance Targets

| Metric | Target |
|--------|--------|
| Time to first byte | < 200ms |
| Stock lookup (cached) | < 50ms |
| Stock lookup (uncached) | < 500ms |
| Signal computation | < 100ms |

## Future Considerations

1. **Horizontal Scaling**: Stateless API allows easy scaling
2. **Read Replicas**: PostgreSQL replicas for read-heavy load
3. **WebSockets**: Real-time price updates (future feature)
4. **Background Jobs**: Queue-based processing for bulk operations
