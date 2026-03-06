# Story 006 - Landing Data Transparency

## Status

Done

## Goal

Landing fallback/demo verilerinin ne amaçla tutulduğunu ve canlı veri akışından farkını kod içinde görünür hale getirmek.

## Acceptance Criteria

1. Statik landing data dosyasında kaynak/fallback amacı açık notla belirtilmeli.
2. Not, geliştiricinin yanlışlıkla statik veriyi canlı veri sanmasını engellemeli.

## Implemented

- `frontend/src/lib/landingData.ts` dosya başına açıklama notu eklendi.
- Not içinde:
  - bunun fallback/demo amaçlı olduğu,
  - tarih aralığı,
  - canlı veri akışının ayrı olduğu belirtildi.

## Validation

- `npm run lint` başarılı.
- `npm run build` başarılı.

