# Story 003 - Route-Level Code Splitting

## Status

Done

## Goal

İlk açılış JS yükünü düşürmek için dashboard altı route’ları lazy-load etmek.

## Acceptance Criteria

1. Protected route page importları statik değil lazy olmalı.
2. Lazy route geçişlerinde kullanıcıya loader gösterilmeli.
3. Lint/build doğrulamaları geçmeli.

## Implemented

- `frontend/src/App.tsx` içinde şu sayfalar lazy import’a alındı:
  - Dashboard
  - Compare
  - Portfolio
  - Watchlist
  - Market
  - Settings
- `RouteLoader` fallback component’i eklendi.
- Her protected route component’i `Suspense` ile sarıldı.

## Validation

- `npm run lint` başarılı.
- `npm run build` başarılı.

## Notes

- Vite büyük chunk uyarısı bu story ile bitmedi; story-004 ile vendor chunk ayrımı uygulanarak tamamlandı.
