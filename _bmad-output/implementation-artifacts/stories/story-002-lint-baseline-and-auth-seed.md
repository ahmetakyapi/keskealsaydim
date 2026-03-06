# Story 002 - Lint Baseline ve Test Kullanıcı Seed

## Status

Done

## Goal

Frontend lint altyapısını çalışır hale getirmek ve test kullanıcı oluşturma akışını otomasyona bağlamak.

## Acceptance Criteria

1. `npm run lint` config eksikliği yüzünden kırılmamalı.
2. Test kullanıcı oluşturmak için tekrar kullanılabilir bir script bulunmalı.
3. Script, kullanıcı varsa güncellemeli yoksa oluşturmalı.
4. Çalıştırma ön koşulları (DB/Go) net olmalı.

## Implemented

- `frontend/.eslintrc.cjs` eklendi.
- `@typescript-eslint/parser` ve `@typescript-eslint/eslint-plugin` dev dependency olarak eklendi.
- `scripts/create_test_user.go` eklendi (upsert mantığı).

## Verification Notes

- `npm run lint` başarılı.
- `npm run build` başarılı.
- Script eklendi ancak bu ortamda `go` komutu bulunmadığı için canlı çalıştırma doğrulaması yapılamadı.
- Canlı register endpointi DB bağlantısı olmadığı için kullanıcı anlık açılamadı.
