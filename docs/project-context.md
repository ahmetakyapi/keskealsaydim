---
project_name: "keskealsaydim"
user_name: "ahmet"
date: "2026-03-06"
sections_completed:
  [
    "technology_stack",
    "language_rules",
    "framework_rules",
    "testing_rules",
    "quality_rules",
    "workflow_rules",
    "anti_patterns"
  ]
status: "complete"
rule_count: 23
optimized_for_llm: true
---

# Project Context for AI Agents

Bu dosya, bu projede kod üreten ajanların uyması gereken kritik ve kolay kaçırılan kuralları içerir.

---

## Technology Stack & Versions

- Frontend: React 18, TypeScript 5, Vite 5, TailwindCSS 3, Framer Motion 11, Recharts 2
- Backend: Go 1.22, Vercel serverless handler yapısı (`api/**/*.go`)
- Data: PostgreSQL (pgx/v5), SQL migration dosyaları `db/migration/`
- Auth: JWT (`github.com/golang-jwt/jwt/v5`) + refresh token tablo modeli
- Infra: Vercel rewrites (`vercel.json`), docker-compose ile local postgres/redis/data-service

## Critical Implementation Rules

### Language-Specific Rules

- Frontend TypeScript `strict` modda; yeni dosyalarda `any` kullanımı mecbur değilse eklenmemeli.
- Frontend alias importlarında `@/` kullanılmalı (`frontend/src`).
- Go tarafında handlerlar küçük tutulmalı; ortak davranışlar `pkg/` altına taşınmalı.
- API yanıtları doğrudan `respond.JSON`/`respond.Error` helper’ları üzerinden dönmeli.

### Framework-Specific Rules

- Frontend API çağrıları `src/services/*` katmanında kalmalı; component içine ham `fetch/axios` taşınmamalı.
- Landing sayfasında görsel tokenları (panel, glow, border) mevcut tasarım diliyle uyumlu kalmalı.
- Serverless endpointler `action` query paramı üzerinden dallanıyor; rewrite ve handler sözleşmesi birlikte korunmalı.
- Yeni API rotası eklenirse `vercel.json` rewrite kontrolü mutlaka yapılmalı.

### Testing Rules

- Frontend değişikliklerinden sonra minimum `npm run build` başarılı olmalı.
- API değişikliklerinde request doğrulama + hata durumu manuel smoke test edilmeli.
- Kritik auth akışlarında (register/login/refresh) minimum bir curl senaryosu dokümante edilmeli.

### Code Quality & Style Rules

- Manuel kod düzenlemeleri patch tabanlı, küçük ve izlenebilir commit’lerle yapılmalı.
- UI metinleri Türkçe karakter uyumlu olmalı (`ç, ğ, ı, İ, ö, ş, ü`).
- Harici görseller runtime’da hotlink ile çağrılmamalı; `frontend/public` altında local asset kullanılmalı.
- Landing gibi büyük dosyalarda statik veri ayrı dosyada tutulmalı (`src/lib/landingData.ts`).

### Development Workflow Rules

- Eski Java backend kaldırıldı; backend kaynağı `api/` + `pkg/` + `db/` yapısıdır.
- Migration dosyaları `db/migration/` altında sürdürülmeli; burada geriye dönük düzenleme yerine yeni V dosyası eklenmeli.
- Büyük frontend değişikliklerinde önce mobil breakpoint davranışı, sonra desktop oranları doğrulanmalı.

### Critical Don’t-Miss Rules

- Auth kullanıcı oluşturma için canlı ortamda DB bağlantısı zorunludur; env yoksa register endpointi 500 döner.
- `frontend/public` icon/logo seti ile `index.html` referansları birlikte güncellenmeli.
- Landing’de sayısal demo verileri gerçek veriyle çelişiyorsa açıkça fallback olduğu belirtilmeli.
- Hotlink logolar (NVIDIA/Apple gibi) üretimde kırılabildiği için local’e çekilmeden merge edilmemeli.

---

## Usage Guidelines

### AI Agents için

- Kod yazmadan önce bu dosyayı ve ilgili hedef dosyaları okuyun.
- Kurallar çelişirse mevcut kod tabanındaki pattern’e öncelik verin.
- Değişiklik sonrası build doğrulamasını raporlayın.

### İnsan geliştiriciler için

- Stack veya deployment davranışı değiştiğinde bu dosyayı güncelleyin.
- Gereksizleşen kuralları temizleyin; dosyayı kısa ve uygulanabilir tutun.

Last Updated: 2026-03-06
