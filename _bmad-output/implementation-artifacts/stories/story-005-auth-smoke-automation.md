# Story 005 - Auth Smoke Automation

## Status

Done (Environment Blocked for Live Validation)

## Goal

Register/login/refresh/logout akışını tek komutla test edebilen tekrar kullanılabilir smoke script sağlamak.

## Acceptance Criteria

1. Script register ve login fallback akışını otomatik yönetmeli.
2. Access/refresh token çıkarımı yapıp refresh endpointini test etmeli.
3. Authorization header ile logout endpointini test etmeli.
4. Hata durumlarında non-zero exit code dönmeli.

## Implemented

- `scripts/auth_smoke_test.sh` eklendi.
- Varsayılan parametreler:
  - `API_BASE=https://keskealsaydim.vercel.app`
  - `EMAIL=ahmet@ahmet.com`
  - `PASSWORD=ahmet1907`
- Register başarısızsa login fallback var.
- `refreshToken` ile refresh ve sonrasında logout testi var.

## Validation

- Script çalıştırıldı.
- Canlı ortamdan dönen hata:
  - `{"error":"Veritabanı bağlantısı kurulamadı"}`
- Bu nedenle flow ortam kaynaklı olarak tamamlanamadı.

