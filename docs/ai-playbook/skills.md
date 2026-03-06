# Project Skills

## 1) Landing UI Refactor

Amaç: Sadece istenen bölümde görsel/tipografi düzeni yapmak.

Adımlar:

1. `frontend/src/pages/LandingPage.tsx` içinde ilgili section’ı bul.
2. Desktop sınıflarını koruyup mobile breakpoint sınıflarını güncelle.
3. Varsa statik metin/dataları `frontend/src/lib/landingData.ts` içinde tut.
4. `npm run build` ile doğrula.

## 2) Logo / Icon Güncelleme

Amaç: Uygulama genelinde logo/icon setini değiştirmek.

Adımlar:

1. Dosyaları `frontend/public/` altına koy.
2. `frontend/index.html` icon linklerini güncelle.
3. `frontend/src/components/BrandLogo.tsx` ve landing içi özel markları güncelle.
4. Build al, kırık asset yolu olmadığını doğrula.

## 3) API Auth Smoke

Amaç: Kayıt/giriş akışını hızlı test etmek.

Kontrol:

1. `/api/auth?action=register`
2. `/api/auth?action=login`
3. `/api/auth?action=refresh`
4. `/api/auth?action=logout`

Not: DB env yoksa bu testler 500/bağlantı hatası döner.

## 4) BMAD Story Uygulama

Amaç: Story odaklı küçük, güvenli iterasyon.

Adımlar:

1. Story dosyasını `_bmad-output/implementation-artifacts/stories/` altına yaz.
2. Story’de AC (acceptance criteria), etkilenen dosya ve test adımı net olsun.
3. Implement et, `lint/build` çalıştır.
4. Story dosyasında `Status` ve `Result` alanını güncelle.
