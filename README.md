# Recon

**Stock fundamental analysis, distilled.** Enter a ticker, get the crux in 30 seconds.

Recon synthesizes financial data into conviction scores and actionable signals—cutting through noise to surface what matters for investment decisions.

## Features

- **Financial Health Scores** — Piotroski F-Score (0-9), Rule of 40, Altman Z-Score, DCF Valuation
- **Performance** — 1D, 1W, 1M, YTD, 1Y returns with 52-week range visualization
- **Valuation** — P/E, Forward P/E, PEG, EV/EBITDA, P/FCF, P/B with sector percentiles
- **Financials** — Revenue growth, margins (gross/operating/net/FCF), ROE, ROIC, leverage
- **Smart Money** — Institutional ownership trends, insider buy/sell activity (90-day)
- **Signals** — Automated bullish/bearish/warning flags based on score thresholds
- **Stock Compare** — Side-by-side comparison of 2-4 stocks
- **ETF Support** — Fund overview, holdings, and sector breakdown

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TanStack Query, Tailwind CSS, shadcn/ui |
| Backend | Go 1.23, Chi Router, GORM |
| Database | PostgreSQL (Cloud SQL) — caches fundamentals for 24h |
| Data | FMP (fundamentals), Polygon.io (search) |
| Deployment | Google Cloud Run, GitHub Actions |

## Data Sources

| Provider | Data Type | Usage |
|----------|-----------|-------|
| [FMP](https://financialmodelingprep.com) | Fundamentals, ratios, financials, holdings, insider trades, estimates | Primary |
| [Polygon.io](https://polygon.io) | Ticker search, company metadata | Search |
| [EODHD](https://eodhd.com) | ETF holdings | Fallback |

Data is cached in PostgreSQL for 24 hours to minimize API calls.

## Local Development

### Prerequisites

- Node.js 20+
- Go 1.23+
- pnpm
- [FMP API key](https://financialmodelingprep.com/) (for fundamentals)
- [Polygon API key](https://polygon.io/) (for ticker search)

### Quick Start

```bash
# Clone and install
git clone https://github.com/drewjst/recon.git
cd recon
pnpm install

# Configure backend
cp apps/api/.env.example apps/api/.env
# Add your FMP_API_KEY and POLYGON_API_KEY to apps/api/.env

# Configure frontend
cp apps/web/.env.example apps/web/.env.local

# Start API (terminal 1)
cd apps/api && go run ./cmd/api

# Start frontend (terminal 2)
cd apps/web && pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:8080

### Environment Variables

**Backend (`apps/api/.env`):**

| Variable | Required | Description |
|----------|----------|-------------|
| `FMP_API_KEY` | Yes | FMP API key (fundamentals) |
| `POLYGON_API_KEY` | Yes | Polygon.io API key (ticker search) |
| `DATABASE_URL` | No | PostgreSQL connection (enables caching) |
| `PORT` | No | Server port (default: 8080) |
| `ALLOWED_ORIGINS` | No | CORS origins (default: http://localhost:3000) |
| `EODHD_API_KEY` | No | EODHD API key (ETF holdings fallback) |

**Frontend (`apps/web/.env.local`):**

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend API URL (default: http://localhost:8080) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/stock/{ticker}` | Complete stock/ETF analysis |
| `GET` | `/api/search?q={query}` | Ticker search (Polygon-powered) |

## Scoring Systems

### Piotroski F-Score (0-9)

Value investing score measuring financial strength:

| Score | Interpretation |
|-------|----------------|
| 8-9 | Strong fundamentals |
| 5-7 | Average |
| 0-4 | Weak fundamentals |

**Criteria:** Positive net income, positive ROA, positive operating cash flow, CFO > net income, lower debt YoY, higher current ratio YoY, no dilution, higher gross margin YoY, higher asset turnover YoY.

### Rule of 40

```
Score = Revenue Growth % + Profit Margin %
```

| Score | Interpretation |
|-------|----------------|
| 40+ | Healthy balance |
| 30-39 | Acceptable |
| <30 | Needs improvement |

### Altman Z-Score

Bankruptcy prediction model:

| Zone | Score | Risk Level |
|------|-------|------------|
| Safe | > 2.99 | Low bankruptcy risk |
| Gray | 1.81 - 2.99 | Uncertain |
| Distress | < 1.81 | High bankruptcy risk |

## Project Structure

```
recon/
├── apps/
│   ├── api/                    # Go backend
│   │   ├── cmd/api/            # Entry point
│   │   └── internal/
│   │       ├── api/            # Router, handlers, middleware
│   │       ├── domain/         # Business logic, models, services
│   │       └── infrastructure/ # DB, providers (FMP, Polygon)
│   │
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # Pages (stock, compare, crypto)
│           ├── components/     # React components
│           ├── hooks/          # TanStack Query hooks
│           └── lib/            # API client, utilities
│
└── packages/
    └── shared/                 # TypeScript API contracts
```

## Deployment

Hosted on **Google Cloud Run** with **Cloud SQL** (PostgreSQL) for caching.

- Push to `main` deploys to dev environment
- Release publish deploys to production
- Secrets managed via Google Secret Manager
- Database auto-migrates on startup

## Contributing

See [CLAUDE.md](./CLAUDE.md) for coding standards and conventions.

**Key Principles:**
- Readability over cleverness
- Functions do one thing (max 20-30 lines)
- Explicit error handling (never swallow errors)
- Type safety (no `any` in TypeScript)

## License

MIT
