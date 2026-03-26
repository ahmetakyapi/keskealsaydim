# Keşke Alsaydım

## Project Overview
Turkish stock comparison & portfolio tracking app. "What if I had bought X instead?"

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + Framer Motion + Recharts
- **Backend**: Go serverless functions on Vercel (`/api/` + `/pkg/`)
- **Database**: Neon PostgreSQL (pgbouncer pooler)
- **Cache**: Upstash Redis via HTTP REST API
- **State Management**: Zustand (auth, theme) + TanStack React Query (server state)
- **Deployment**: Vercel

## Development

### Prerequisites
- Go 1.22+
- Node.js 20+
- npm

### Local Setup
```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend (Go dev server)
source .env.local && go run ./cmd/server/

# Or use the combined script
npm start
```

### Build
```bash
# Frontend
cd frontend && npm run build

# Go vet
go vet ./...
```

## Project Structure
```
api/              # Go serverless handlers (one Handler per directory)
pkg/              # Shared Go packages (auth, db, cache, finance, respond)
frontend/src/
  pages/          # Page components
  components/     # Reusable UI components
  hooks/          # React Query hooks (useQueries.ts)
  services/       # API service layer (Axios)
  stores/         # Zustand stores
  lib/            # Utilities, normalizers
  types/          # TypeScript definitions
db/migration/     # SQL migration files (Flyway-style V1__, V2__, ...)
```

## Key Conventions
- Go handlers: one `Handler` per directory, use `respond.Ctx()` for context with timeout
- Vercel rewrites map path params to query params (e.g., `/api/stocks/:symbol/price` → `?action=price&symbol=:symbol`)
- Never use `internal/` directory — Vercel wraps handlers in different module
- Never use `[param].go` bracket filenames — Go rejects them
- Frontend uses `@/` path alias for imports
- All error responses use `respond.Error(w, status, message)` with Turkish messages
- React Query hooks in `frontend/src/hooks/useQueries.ts` for all data fetching

## Environment Variables
See `.env.example` for full list. Key vars:
- `DATABASE_URL` — Neon pgbouncer connection string
- `JWT_SECRET` — HMAC SHA256 signing key (32+ chars)
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Redis cache
- `FRONTEND_URL` — Production frontend URL (CORS)
- `VITE_API_URL` — Frontend API base (empty for same-origin)
