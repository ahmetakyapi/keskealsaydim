# Story 004 - Vendor Chunk Separation

## Status

Done

## Goal

Build sırasında görünen büyük chunk uyarısını kaldırmak için vendor paketlerini kontrollü şekilde ayırmak.

## Acceptance Criteria

1. `vite.config.ts` içinde `manualChunks` tanımlı olmalı.
2. React, UI, data, motion/icons ve recharts bağımlılıkları ayrı chunk’lara bölünmeli.
3. Build çıktısında 500k üzeri chunk uyarısı kalmamalı.

## Implemented

- `frontend/vite.config.ts` içinde `build.rollupOptions.output.manualChunks` eklendi.
- Aşağıdaki chunk stratejisi tanımlandı:
  - `react-vendor`
  - `ui-vendor`
  - `data-vendor`
  - `motion-icons-vendor`
  - `recharts-vendor`

## Validation

- `npm run lint` başarılı.
- `npm run build` başarılı.
- Build raporunda 500k chunk warning artık çıkmıyor.

