# Recon

Recon distills stock fundamentals into signals. Enter a ticker, get the crux in 30 seconds.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Next.js 14, TanStack Query, Tailwind CSS, shadcn/ui, Tremor |
| Backend  | Go, Chi router, sqlx                |
| Database | PostgreSQL 16                       |
| Cache    | Redis 7                             |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 14 (apps/web)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Server    │  │   Client    │  │     TanStack Query      │  │
│  │ Components  │  │ Components  │  │   (Server State Mgmt)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Go API (apps/api)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Chi Router  │  │  Handlers   │  │    Business Logic       │  │
│  │             │  │             │  │  (Signals, Piotroski)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│      PostgreSQL         │       │         Redis           │
│   (Persistent Data)     │       │   (Cache, Rate Limit)   │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
recon/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # Go backend service
├── packages/
│   └── shared/       # Shared TypeScript types (API contracts)
└── docs/
    ├── architecture.md
    └── api-spec.md
```

## Local Development

### Prerequisites

- Node.js 20+
- Go 1.22+
- Docker & Docker Compose
- pnpm (recommended) or npm

### Quick Start

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url> recon
   cd recon
   ```

2. **Start infrastructure (PostgreSQL, Redis)**
   ```bash
   docker compose up db cache -d
   ```

3. **Run the API**
   ```bash
   cd apps/api
   cp .env.example .env
   go run ./cmd/server
   ```

4. **Run the frontend** (new terminal)
   ```bash
   cd apps/web
   cp .env.example .env.local
   pnpm install
   pnpm dev
   ```

5. **Open the app**
   - Frontend: http://localhost:3000
   - API: http://localhost:8080

### Full Docker Setup

Run everything in containers:
```bash
docker compose up --build
```

## Documentation

- [Architecture Deep Dive](./docs/architecture.md)
- [API Specification](./docs/api-spec.md)
- [Claude Code Guidelines](./CLAUDE.md)

## Contributing

See [CLAUDE.md](./CLAUDE.md) for code standards and conventions.
