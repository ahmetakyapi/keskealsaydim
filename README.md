# Keşke Alsaydım

> "X tarihinde şu hisseyi almak yerine bunu alsaydım ne olurdu?"

İki hisse senedini belirli bir tarih aralığında karşılaştıran, kaçırılan fırsatları ve alternatif getiri senaryolarını görselleştiren bir yatırım analiz uygulaması.

**[Demo →](https://keskealsaydim.vercel.app)**

---

## Özellikler

| Özellik | Açıklama |
| --- | --- |
| **Karşılaştırma** | İki hisseyi seç, tarih ve yatırım tutarı gir — kim kazanırdı, ne kadar fark ederdi anında gör |
| **Portföy Takibi** | Alış fiyatı ve miktarına göre anlık kar/zarar, günlük değişim |
| **Watchlist** | Takip listene eklediğin hisselerin canlı fiyat ve 52H yüksek/düşük bandı |
| **Piyasa** | BIST 100, USD/TRY, EUR/TRY, GBP/TRY, Altın ve önde gelen BIST hisseleri |
| **Paylaşım** | Karşılaştırma senaryolarını link ile paylaş |

---

## Teknoloji

### Frontend — `frontend/`

- **React 18** + TypeScript + Vite
- **TailwindCSS** — dark glassmorphism tasarım sistemi
- **Framer Motion** — sayfa geçişleri ve stagger animasyonları
- **Recharts** — normalize edilmiş karşılaştırma grafikleri
- **Zustand** — auth state (localStorage persist)
- **Axios** — JWT interceptor + otomatik token refresh

### Backend — `api/` + `internal/`

- **Go 1.22** serverless functions (Vercel)
- Her `api/**/*.go` dosyası bağımsız bir HTTP handler
- **pgx/v5** — Neon PostgreSQL bağlantısı (pgbouncer, simple protocol)
- **golang-jwt/v5** — Access + Refresh token çifti, otomatik rotasyon
- **Upstash Redis** — HTTP REST API üzerinden cache (fiyat: 1dk, tarih: 24s, piyasa: 2dk)
- **Yahoo Finance v8** — Anlık fiyat ve tarihsel veri

### Altyapı

- **Vercel** — frontend (static) + Go serverless functions tek projede
- **Neon** — PostgreSQL (serverless, pgbouncer pooler)
- **Upstash** — Redis (serverless HTTP)

---

## Proje Yapısı

```text
keskealsaydim/
├── api/                        # Vercel Go serverless functions
│   ├── auth/
│   │   └── index.go            # POST /api/auth?action=login|register|refresh|logout
│   ├── stocks/
│   │   └── index.go            # GET /api/stocks?action=search|price|history
│   ├── compare/
│   │   ├── index.go            # POST /api/compare
│   │   ├── history/
│   │   │   └── index.go        # GET  /api/compare/history
│   │   └── shared/
│   │       └── index.go        # GET  /api/compare/shared?token=
│   ├── market/
│   │   └── overview.go         # GET  /api/market/overview
│   ├── portfolio/
│   │   ├── index.go            # GET + POST /api/portfolio
│   │   └── item/
│   │       └── index.go        # DELETE /api/portfolio/item?id=
│   ├── watchlist/
│   │   ├── index.go            # GET + POST /api/watchlist
│   │   └── item/
│   │       └── index.go        # DELETE /api/watchlist/item?id=
│   └── users/
│       └── me.go               # GET + PUT /api/users/me
│
├── pkg/                        # Shared Go packages
│   ├── auth/jwt.go             # JWT üret / doğrula / request'ten çıkar
│   ├── cache/cache.go          # Upstash Redis HTTP client
│   ├── db/db.go                # pgxpool lazy singleton (MaxConns=3)
│   ├── finance/yahoo.go        # Yahoo Finance v8 API client
│   └── respond/respond.go      # CORS + JSON/Error yardımcıları
│
├── frontend/                   # React uygulaması
│   └── src/
│       ├── pages/              # Dashboard, Portfolio, Watchlist, Compare, Market, Settings
│       ├── services/           # API katmanı (portfolioService, watchlistService, ...)
│       ├── stores/             # Zustand stores (authStore, themeStore)
│       ├── components/         # UI bileşenleri (shadcn tabanlı)
│       └── types/index.ts      # Go backend response'larıyla eşleşen TypeScript tipleri
│
├── go.mod
├── go.sum
└── vercel.json                 # Build + routing + Go runtime konfigürasyonu
```

---

## API Referansı

### Auth

| Method | Endpoint | Auth | Açıklama |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | — | Kayıt |
| POST | `/api/auth/login` | — | Giriş, token çifti döner |
| POST | `/api/auth/refresh` | — | Refresh token ile yeni access token |
| POST | `/api/auth/logout` | ✓ | Refresh token'ı iptal et |

### Hisseler

| Method | Endpoint | Auth | Cache |
| --- | --- | --- | --- |
| GET | `/api/stocks/search?q=` | — | — |
| GET | `/api/stocks/{symbol}/price` | — | 1 dakika |
| GET | `/api/stocks/{symbol}/history?from=&to=&interval=` | — | 24 saat |

### Karşılaştırma

| Method | Endpoint | Auth | Açıklama |
| --- | --- | --- | --- |
| POST | `/api/compare` | opsiyonel | `saveScenario: true` ile DB'ye kaydeder |
| GET | `/api/compare/history?page=&size=` | ✓ | Geçmiş senaryolar |
| GET | `/api/compare/shared/{token}` | — | Paylaşılan senaryo |

### Portföy & Watchlist

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET/POST | `/api/portfolio` | ✓ |
| DELETE | `/api/portfolio/{id}` | ✓ |
| GET/POST | `/api/watchlist` | ✓ |
| DELETE | `/api/watchlist/{id}` | ✓ |
| GET/PUT | `/api/users/me` | ✓ |

### Piyasa

| Method | Endpoint | Cache |
| --- | --- | --- |
| GET | `/api/market/overview` | 2 dakika |

---

## Yerel Geliştirme

### Gereksinimler

- **Node.js** 20+
- **Go** 1.22+
- Neon veya yerel PostgreSQL
- Upstash Redis veya yerel Redis

### Kurulum

```bash
# Repoyu klonla
git clone https://github.com/kullanici/keskealsaydim.git
cd keskealsaydim

# Frontend bağımlılıklarını yükle
cd frontend && npm install && cd ..

# Go bağımlılıklarını indir
go mod download

# Environment değişkenlerini ayarla
export DATABASE_URL="postgresql://..."
export JWT_SECRET="en-az-32-karakter-rastgele-string"
export UPSTASH_REDIS_REST_URL="https://..."
export UPSTASH_REDIS_REST_TOKEN="..."
export FRONTEND_URL="http://localhost:5173"

# Tek komutla frontend + backend
npm start
```

`npm start` komutu frontend'i `http://localhost:5173`, backend'i `http://localhost:3000` üzerinde başlatır.

Backend artık `DATABASE_URL` dışında `POSTGRES_URL` veya standart `PGHOST` / `PGDATABASE` / `PGUSER` / `PGPASSWORD` değişkenlerinden de bağlantı kurabilir. Uzak veritabanlarında `sslmode=require`, yerelde ise `sslmode=disable` otomatik tamamlanır.

> **Not:** İstersen backend'i ayrı da çalıştırabilirsin: `vercel dev`

### Veritabanı

`db/migration/` dizinindeki SQL dosyalarını sırayla çalıştır:

```text
V1__create_users_table.sql
V2__create_investments_table.sql
V3__create_watchlist_table.sql
V4__create_comparison_scenarios_table.sql
V5__create_notifications_and_settings.sql
V6__normalize_bist_symbols.sql
```

İstersen yalnızca altyapı servislerini ayağa kaldırmak için `docker compose up -d postgres redis data-service` kullanabilirsin.

---

## Deploy

Proje Vercel'e tek seferde deploy olur. Gerekli ortam değişkenleri:

```env
DATABASE_URL=postgresql://...@pooler.neon.tech/neondb?sslmode=require
# veya Vercel Postgres/Neon entegrasyonunda POSTGRES_URL otomatik gelebilir
JWT_SECRET=<openssl rand -hex 32>
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
FRONTEND_URL=https://senin-proje.vercel.app
VITE_API_URL=
```

`vercel.json` build komutunu ve Go runtime'ı otomatik olarak yapılandırır.

---

## Lisans

MIT
