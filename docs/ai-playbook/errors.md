# Known Errors

## 1) `Veritabanı bağlantısı kurulamadı`

Nerede:

- Auth register/login
- Kullanıcı/senaryo/portföy endpointleri

Neden:

- `DATABASE_URL` yok veya erişilemiyor.

Çözüm:

1. Env değişkenini kontrol et.
2. DB’nin erişilebilir olduğunu doğrula.
3. Gerekirse local postgres’i ayağa kaldır.

## 2) `ESLint couldn't find a configuration file`

Neden:

- Frontend lint config dosyası yoktu.

Çözüm:

- `frontend/.eslintrc.cjs` dosyası kullanılmalı.
- Gerekli paketler `@typescript-eslint/*` kurulu olmalı.

## 3) `command not found: go`

Neden:

- Makinede Go toolchain kurulu değil.

Çözüm:

1. Go 1.22+ kur.
2. `go version` ile doğrula.
3. Sonra `go run` komutlarını tekrar dene.

## 4) Vite chunk warning `> 500kB`

Neden:

- Tek JS bundle çok büyüyor.

Çözüm:

1. Route bazlı lazy loading.
2. `manualChunks` ile kritik olmayan modülleri ayır.
3. Grafik/animasyon bağımlılıklarını gerektiği yerde yükle.

## 5) BMAD kurulumunda `{output_folder}` klasörü oluşması

Neden:

- Installer bazı koşullarda placeholder’ı literal klasöre yazabiliyor.

Çözüm:

1. `_bmad-output/planning-artifacts` ve `_bmad-output/implementation-artifacts` oluştur.
2. Literal `{output_folder}` klasörünü kaldır.
