# Project Rules

## Genel

1. Frontend değişikliklerinde desktop görünümü koru; mobil düzeni ayrı optimize et.
2. Landing metinleri Türkçe karakter uyumlu olmalı.
3. Runtime’da dış hotlink görsel kullanılmaz; tüm logo/icon dosyaları local asset olmalı.
4. Büyük statik veri blokları component içine gömülmez; ayrı `lib/constants` dosyasına taşınır.

## Frontend

1. Alias importları `@/` ile yazılır.
2. Yeni UI section’larında mevcut panel/border/glow dilini koru.
3. Her frontend değişikliğinde en az:
`npm run lint` ve `npm run build` sonucu raporlanır.

## API/Backend

1. Auth endpointleri `api/auth/index.go?action=...` sözleşmesiyle çalışır.
2. Yeni endpoint eklenirse `vercel.json` rewrite kontrol edilir.
3. DB şema değişiklikleri yeni migration dosyasıyla yapılır; eski migration dosyası geriye dönük değiştirilmez.

## Dokümantasyon

1. README’ye sadece kullanıcı/geliştirici için gerekli bilgiler yazılır.
2. İç operasyon notları ve ajan kullanım notları `docs/ai-playbook/` altında tutulur.
