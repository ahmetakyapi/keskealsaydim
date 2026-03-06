# BMAD Initial Recommendations

Date: 2026-03-06
Scope: Whole repository (`frontend`, `api`, `pkg`, `db`, deployment docs)

## Completed in this pass

1. BMAD installed (`_bmad` core + `bmm` module, v6.0.4).
2. BMAD project context created at [`docs/project-context.md`](../../docs/project-context.md).
3. Landing page external logo hotlinks removed; logos moved to local public assets.
4. Frontend lint baseline activated with TypeScript parser/plugin installation.
5. Placeholder BMAD output folder bug corrected from `{output_folder}` to `_bmad-output`.

## High Priority Backlog

1. API auth smoke tests:
Create repeatable curl-based smoke test for `register/login/refresh/logout` and fail fast on DB/config issues.

2. Seed user automation:
Use a deterministic CLI/script to create or upsert test users by email in connected DB.

3. README structural sync:
Update outdated file tree that still references per-action auth files (`register.go`, `login.go`) to current `api/auth/index.go?action=*` structure.

4. Data source transparency:
Document where landing “demo/fallback” values come from and when live API data is expected.

5. Build size reduction:
Split large frontend bundle (`>500kB` warning) via lazy routes/manual chunks.

## Medium Priority Backlog

1. Unified chart config:
Extract shared Recharts axis/tick/grid settings for hero/demo/compare into one utility.

2. UI token normalization:
Centralize repeated panel/border/glow style objects to reduce drift between sections.

3. API contract docs:
Generate compact endpoint contracts from current handlers and keep under `docs/`.

## Suggested Next Execution Order

1. Auth smoke + seed user flow
2. README sync
3. Bundle split + chart config extraction
