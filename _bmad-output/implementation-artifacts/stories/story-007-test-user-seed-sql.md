# Story 007 - Test User Seed SQL

## Status

Done

## Goal

Go runtime olmayan ortamlarda da test kullanıcı oluşturma/güncelleme imkanı sağlamak.

## Acceptance Criteria

1. Test kullanıcı için idempotent SQL seed dosyası olmalı.
2. Email çakışmasında kullanıcı güncellenmeli.
3. Password hash auth akışıyla uyumlu bcrypt formatında üretilmeli.

## Implemented

- `db/seed/001_test_user.sql` eklendi.
- `pgcrypto` kullanarak bcrypt hash (`crypt(..., gen_salt('bf', 12))`) üretiyor.
- `ahmet@ahmet.com / ahmet1907` için upsert mantığı var.

## Validation

- SQL sentaksı migration şema alanlarıyla uyumlu kontrol edildi.
- Çalıştırma için DB erişimi gerekli (bu ortamda doğrulanamadı).

