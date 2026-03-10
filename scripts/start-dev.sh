#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
ENV_FILE="$ROOT_DIR/.env.local"

BACKEND_PORT="${BACKEND_PORT:-3000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

# Load .env.local if it exists
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

# Fallback defaults for required vars
DATABASE_URL="${DATABASE_URL:-postgresql://ahmet@127.0.0.1:5432/keskealsaydim?sslmode=disable}"
JWT_SECRET="${JWT_SECRET:-local_dev_jwt_secret_32_chars_min_123456}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:${FRONTEND_PORT}}"
UPSTASH_REDIS_REST_URL="${UPSTASH_REDIS_REST_URL:-}"
UPSTASH_REDIS_REST_TOKEN="${UPSTASH_REDIS_REST_TOKEN:-}"

cleanup() {
  kill 0 2>/dev/null || true
}

trap cleanup INT TERM EXIT

# Backend: plain Go server (no Vercel CLI needed)
(
  cd "$ROOT_DIR"
  DATABASE_URL="$DATABASE_URL" \
  JWT_SECRET="$JWT_SECRET" \
  FRONTEND_URL="$FRONTEND_URL" \
  UPSTASH_REDIS_REST_URL="$UPSTASH_REDIS_REST_URL" \
  UPSTASH_REDIS_REST_TOKEN="$UPSTASH_REDIS_REST_TOKEN" \
  go run ./cmd/server/ --port "$BACKEND_PORT"
) &

# Frontend: Vite dev server
(
  cd "$ROOT_DIR/frontend"
  npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"
) &

wait
