-- V6: Normalize legacy BIST symbols to the stored canonical form
-- Keeps known BIST symbols without the Yahoo ".IS" suffix so legacy rows
-- match the runtime normalization used by the app.

BEGIN;

CREATE OR REPLACE FUNCTION normalize_bist_symbol(input_symbol TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN input_symbol IS NULL THEN NULL
    WHEN regexp_replace(upper(btrim(input_symbol)), '\.IS$', '') = ANY (
      ARRAY[
        'THYAO', 'GARAN', 'AKBNK', 'YKBNK', 'ISCTR', 'HALKB', 'VAKBN',
        'SISE', 'TCELL', 'TTKOM', 'EREGL', 'KRDMD', 'ASELS', 'TUPRS',
        'PETKM', 'SAHOL', 'KCHOL', 'BIMAS', 'MGROS', 'ARCLK', 'FROTO',
        'TOASO', 'SASA', 'TAVHL', 'PGSUS', 'EKGYO', 'ENKAI', 'KOZAL',
        'KOZAA', 'DOHOL'
      ]::TEXT[]
    )
      THEN regexp_replace(upper(btrim(input_symbol)), '\.IS$', '')
    ELSE upper(btrim(input_symbol))
  END
$$;

-- Merge duplicate watchlist rows that only differ by ".IS" suffix before
-- normalizing the stored symbol, otherwise the unique(user_id, symbol)
-- constraint would block the update.
WITH watchlist_prepared AS (
  SELECT
    id,
    user_id,
    normalize_bist_symbol(symbol) AS canonical_symbol,
    NULLIF(btrim(symbol_name), '') AS symbol_name,
    NULLIF(btrim(exchange), '') AS exchange,
    NULLIF(btrim(notes), '') AS notes,
    display_order,
    added_at,
    CASE
      WHEN symbol = normalize_bist_symbol(symbol) THEN 0
      ELSE 1
    END AS canonical_rank
  FROM watchlist
),
watchlist_ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, canonical_symbol
      ORDER BY canonical_rank, display_order, added_at, id
    ) AS rn
  FROM watchlist_prepared
),
watchlist_merged AS (
  SELECT
    user_id,
    canonical_symbol,
    MIN(display_order) AS merged_display_order,
    MIN(added_at) AS merged_added_at,
    (ARRAY_REMOVE(
      ARRAY_AGG(symbol_name ORDER BY canonical_rank, display_order, added_at, id),
      NULL
    ))[1] AS merged_symbol_name,
    (ARRAY_REMOVE(
      ARRAY_AGG(exchange ORDER BY canonical_rank, display_order, added_at, id),
      NULL
    ))[1] AS merged_exchange,
    NULLIF(
      array_to_string(
        array_agg(DISTINCT notes ORDER BY notes) FILTER (WHERE notes IS NOT NULL),
        E'\n\n'
      ),
      ''
    ) AS merged_notes
  FROM watchlist_prepared
  GROUP BY user_id, canonical_symbol
)
UPDATE watchlist AS w
SET
  symbol = merged.canonical_symbol,
  symbol_name = COALESCE(merged.merged_symbol_name, merged.canonical_symbol),
  exchange = COALESCE(merged.merged_exchange, 'BIST'),
  notes = COALESCE(merged.merged_notes, w.notes),
  display_order = merged.merged_display_order,
  added_at = merged.merged_added_at
FROM watchlist_ranked AS ranked
JOIN watchlist_merged AS merged
  ON merged.user_id = ranked.user_id
 AND merged.canonical_symbol = ranked.canonical_symbol
WHERE w.id = ranked.id
  AND ranked.rn = 1;

WITH watchlist_prepared AS (
  SELECT
    id,
    user_id,
    normalize_bist_symbol(symbol) AS canonical_symbol,
    CASE
      WHEN symbol = normalize_bist_symbol(symbol) THEN 0
      ELSE 1
    END AS canonical_rank,
    display_order,
    added_at
  FROM watchlist
),
watchlist_ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, canonical_symbol
      ORDER BY canonical_rank, display_order, added_at, id
    ) AS rn
  FROM watchlist_prepared
)
DELETE FROM watchlist AS w
USING watchlist_ranked AS ranked
WHERE w.id = ranked.id
  AND ranked.rn > 1;

UPDATE price_alerts
SET symbol = normalize_bist_symbol(symbol)
WHERE symbol IS NOT NULL
  AND symbol <> normalize_bist_symbol(symbol);

UPDATE investments
SET symbol = normalize_bist_symbol(symbol)
WHERE symbol IS NOT NULL
  AND symbol <> normalize_bist_symbol(symbol);

UPDATE comparison_scenarios
SET
  symbol_a = normalize_bist_symbol(symbol_a),
  symbol_b = normalize_bist_symbol(symbol_b)
WHERE symbol_a <> normalize_bist_symbol(symbol_a)
   OR symbol_b <> normalize_bist_symbol(symbol_b);

DROP FUNCTION normalize_bist_symbol(TEXT);

COMMIT;
