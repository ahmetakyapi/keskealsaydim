# Keşke Alsaydım

Turkish stock comparison and portfolio tracking app: "what if I had bought X instead?"

## Commit yazarı

Commitler her zaman `Ahmet Akyapı <ahmetakyapii@gmail.com>` adına atılır;
yazarı yalnızca "Claude" olan commit atılmaz. Claude, mesajın sonundaki
`Co-Authored-By: Claude …` satırıyla ortak yazar olarak görünür. Oturum
başında, ilk committen önce:

```bash
git config user.name "Ahmet Akyapı"
git config user.email "ahmetakyapii@gmail.com"
```

Bu kural sahibinin tüm repolarında geçerli (9 Ekim 2026).

## Stack

- **Frontend** (`frontend/`): React 18 + Vite 5 + TypeScript, Tailwind 3, Radix UI,
  Framer Motion, Lenis, Recharts, Zustand (auth, theme, motion) + TanStack Query.
- **Backend**: Go 1.22 serverless functions on Vercel (`api/`), shared code in
  `pkg/` (`auth`, `cache`, `db`, `finance`, `respond`).
- **Data**: Neon Postgres through the pgbouncer pooler (pgx forced to
  `QueryExecModeSimpleProtocol` in `pkg/db`, pinned by a test); Upstash Redis
  over its HTTP REST API.

## Commands

```bash
npm start                  # root: Go API :3000 (cmd/server) + Vite :5173 (scripts/start-dev.sh)
go vet ./... && go test ./...
cd frontend && npm run lint && npm run test && npm run build   # test = vitest run
```

- `scripts/start-dev.sh` loads `.env.local`, otherwise falls back to the
  **shell's** `DATABASE_URL`, then to a local default. A shell that exports a
  production URL makes `npm start` (and any `psql "$DATABASE_URL"`) hit production.
- Migrations: `db/migration/V<n>__<name>.sql` (Flyway-style, applied in order
  with `psql`, no runner). Add a new file; never edit an applied one.
- `docker-compose.yml` is legacy (local Redis, missing `db/init`); not used by `npm start`.

## Backend rules

- One exported `Handler` per directory under `api/` (file name is free:
  `index.go`, `me.go`, `overview.go`). No `internal/` directory (Vercel wraps
  handlers in another module) and no `[param].go` filenames (Go rejects them).
- **Function budget**: Vercel Hobby allows 12 functions and `api/` has exactly 12.
  A new endpoint folds into an existing handler behind an `action`/`resource`/`id`
  query param plus a `vercel.json` rewrite — never a new directory.
- Every route goes into **both** `vercel.json` rewrites and `cmd/server/main.go`,
  or it works in production but not locally.
- Use `respond.Ctx()` for a request context with timeout. Errors go through
  `respond.Error(w, status, message)` with a Turkish message; validation is 400, not 500.

## Money and currency

- `finance.BaseCurrency` (TRY) is the currency of every total the API returns;
  prices stay in the instrument's own currency.
- A live quote's `Currency` is authoritative; the stored `currency` column is
  only a fallback when the quote could not be fetched.
- Historical values convert with `finance.RateSeriesToTRY` (per-day rate).
  `finance.SpotRatesToTRY` is only for "right now" figures like the portfolio summary.

## Frontend rules

- `@/` alias = `frontend/src`. Server state goes through the hooks in
  `hooks/useQueries.ts`; only the auth flow calls `services/authService` directly.
- **No hard-coded colours** — semantic tokens (`text-foreground`, `bg-card`,
  `border-border`, `text-success`, `text-danger`). Light mode is supported;
  `text-white` / `bg-white/10` break it. Chart colours come from
  `useChartPalette()` (re-reads CSS tokens on theme change; Recharts can't use classes).
- Numbers: `Money`, `Percent`, `ChangeBadge`, `UnavailableValue` from
  `components/ui/value.tsx`, or `lib/format.ts`.
  - `formatPercent` / `formatSignedCurrency` add the sign — never prefix `+`.
  - Negative money is `−₺1.234` (U+2212), never `₺-1.234`.
  - A value that could not be fetched is `UnavailableValue`, never `0`.
- Symbol input is always `<SymbolSearch>` (keyboard nav, ARIA, typed-symbol commit).
- Destructive actions use `<ConfirmDialog>`. A failed query renders `<ErrorState>`,
  an empty result `<EmptyState>` — never an empty state on error.
- Pure logic in `src/lib/` has a Vitest suite (`src/lib/*.test.ts`). Anything
  touching a sign, a currency, a date boundary or Turkish casing gets a test —
  those are the four ways this app has actually been wrong.
- Turkish copy keeps its diacritics (`Canlı`, not `Canli`). Titles, buttons and
  menu items are Title Case, body copy sentence case. Never
  `text-transform: capitalize` (`i → I`, not `İ`).

## Motion

- Primitives: `components/Motion.tsx` (`FadeIn`, `PageTransition`, `Reveal*`,
  `ScrollProgress`) and `components/fx/` (`SplitText`, `Magnetic`, `PointerAurora`,
  `VelocityMarquee`, `ScrollHighlight`, `HorizontalScroll`, `RouteCurtain`,
  `TopLoader`, `Cursor`, …). Each renders plainly under `prefers-reduced-motion`;
  a new effect must too. Pointer effects are gated on `useFinePointer()`.
- `App.tsx` keys routes by *world* (`worldOf`: the app shell vs each public page).
  A world change plays the column `RouteCurtain`; in-app navigation only plays
  `PageTransition` + CSS `page-stagger`.
- First-visit intro: `fx/Preloader.tsx` — two price lines that move together,
  then diverge; once per session, only on `/`, skipped by click/key or reduced
  motion, 4 s failsafe. `motionStore.introDone` holds the hero until it lifts.
- Loops only where they carry meaning (loaders, marquees, live dot) and must stop
  off-screen or under reduced motion.
- Lenis (`useSmoothScroll`) is landing-only — never the app shell.
- An entrance must end on `transform: none` / no `filter`, or it traps
  `position: fixed` children.
- Pointer glow: add `data-spotlight` (`Card` and `StatCard` already do); CSS
  draws it, fed by one listener in `GlobalPointerFx`.

## Environment

Names only (see `.env.example`): required `DATABASE_URL`, `JWT_SECRET` (32+ chars).
Optional: `DB_MAX_CONNS` (default 4), `UPSTASH_REDIS_REST_URL` +
`UPSTASH_REDIS_REST_TOKEN` (without them cache and auth rate limiting are off),
`FRONTEND_URL` (comma-separated allowed), `VITE_API_URL` (default `/api`).
