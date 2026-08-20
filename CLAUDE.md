# Keşke Alsaydım

## Project Overview
Turkish stock comparison & portfolio tracking app. "What if I had bought X instead?"

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + Radix UI + Framer Motion + Recharts
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
cp .env.example .env.local        # fill DATABASE_URL and JWT_SECRET at minimum
cd frontend && npm install && cd ..
for f in db/migration/V*.sql; do psql "$DATABASE_URL" -f "$f"; done
npm start                          # Go API on :3000 + Vite on :5173
```

### Verify
```bash
go vet ./... && go test ./...
cd frontend && npm run lint && npm run test && npm run build
```

## Project Structure
```
api/              Go serverless handlers (one Handler per directory)
pkg/              Shared Go packages (auth, cache, db, finance, respond)
frontend/src/
  pages/          Page components
  components/ui/  Design-system primitives
  components/     Feature components (SymbolSearch, Motion, compare/)
  hooks/          React Query hooks (useQueries.ts) + small utility hooks
  services/       API service layer (Axios)
  stores/         Zustand stores
  lib/            format.ts, chart.ts, api-error.ts, api-normalizers.ts, utils.ts
  types/          TypeScript definitions
db/migration/     SQL migration files (Flyway-style V1__, V2__, ...)
```

## Key Conventions

### Backend
- One `Handler` per directory; use `respond.Ctx()` for a context with timeout.
- Never use an `internal/` directory — Vercel wraps handlers in a different module.
- Never use `[param].go` bracket filenames — Go rejects them.
- All error responses go through `respond.Error(w, status, message)` with a
  Turkish message. Validation failures are 400, not 500.
- **Serverless function budget**: Vercel Hobby allows 12 functions per
  deployment and the project is at that limit. Adding an endpoint means folding
  it into an existing handler behind an `action`/`resource`/`id` query param and
  adding a `vercel.json` rewrite — not creating a new directory.
- Every new route must be added to **both** `vercel.json` and
  `cmd/server/main.go`, or it will work in production but not locally.

### Money and currency
- `finance.BaseCurrency` (TRY) is the currency of every total the API returns.
- A quote's own `Currency` field is authoritative; the stored `currency` column
  is only a fallback when the live quote could not be fetched.
- Historical values convert with `finance.RateSeriesToTRY` (per-day rate), not a
  single spot rate. Spot conversion (`SpotRatesToTRY`) is only for "right now"
  figures like the portfolio summary.
- Prices are shown in the instrument's own currency; **totals** are always TRY.

### Frontend
- Use the `@/` path alias.
- All data fetching goes through hooks in `frontend/src/hooks/useQueries.ts`.
- **Never hard-code colours.** Use semantic tokens (`text-foreground`,
  `bg-card`, `border-border`, `text-success`, `text-danger`). `text-white` and
  `bg-white/10` break light mode, which is a supported theme.
- Chart colours come from `useChartPalette()`, which re-reads CSS tokens on
  theme change. Recharts cannot consume Tailwind classes.
- Format money and percentages with the components in `components/ui/value.tsx`
  (`Money`, `Percent`, `ChangeBadge`) or the helpers in `lib/format.ts`.
  - `formatPercent` already adds the sign — never prefix `+` at the call site.
  - Signed money renders as `−₺1.234`, never `₺-1.234`.
  - A value that could not be fetched renders as `UnavailableValue`, never `0`.
- Symbol input always uses `<SymbolSearch>` — it is the only combobox with
  keyboard navigation, ARIA wiring and typed-symbol commit.
- Destructive actions go through `<ConfirmDialog>`.
- A failed query renders `<ErrorState>`; an empty result renders `<EmptyState>`.
  Showing an empty state on error tells the user the wrong thing.
- Motion: only the primitives in `components/Motion.tsx`. They respect
  `prefers-reduced-motion`. No infinite ambient animation.
- Pure logic in `lib/` carries a Vitest suite (`src/lib/*.test.ts`). Anything
  touching a sign, a currency, a date boundary or Turkish casing belongs there
  — those are the four ways this app has actually been wrong before.
- Turkish text is written with its diacritics (`Canlı`, not `Canli`). Titles,
  buttons and menu items use Title Case; body copy uses sentence case.
  Never use `text-transform: capitalize` — it produces `i → I` instead of `İ`.

## Environment Variables
See `.env.example`. Required: `DATABASE_URL`, `JWT_SECRET` (32+ chars).
Optional but recommended in production: `UPSTASH_REDIS_REST_URL` +
`UPSTASH_REDIS_REST_TOKEN` (without them the cache and auth rate limiting are
both disabled), `FRONTEND_URL` (comma-separated list allowed).
