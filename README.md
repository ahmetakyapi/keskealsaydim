# Keşke Alsaydım

> "X tarihinde şu hisseyi almak yerine bunu alsaydım ne olurdu?"

İki hisse senedini belirli bir tarih aralığında karşılaştıran, kaçırılan fırsatları
rakamla gösteren ve portföyünüzü takip eden bir yatırım analiz uygulaması.

**[Demo →](https://keskealsaydim.vercel.app)**

---

## Özellikler

| Özellik | Açıklama |
| --- | --- |
| **Karşılaştırma** | İki hisse, bir tarih aralığı ve bir tutar; gün gün değer gelişimi, oynaklık, korelasyon ve en sert düşüş |
| **Portföy** | Komisyonlu alış kaydı, düzenleme, kısmi/tam satış, gerçekleşen kâr, dağılım grafiği, CSV dışa aktarma |
| **İzleme Listesi** | Canlı fiyat, 52 haftalık bant, not alma, tek tıkla karşılaştırma/alarm/portföye ekleme |
| **Fiyat Alarmları** | Hedef fiyata ulaşıldığında bildirim; ekran her açıldığında güncel fiyatla değerlendirilir |
| **Bildirimler** | Okundu/okunmadı takibi, sayfalama, tekil ve toplu silme |
| **Hisse Detayı** | Fiyat grafiği (1A–5Y), gün içi ve 52 haftalık istatistikler |
| **Paylaşım** | Kayıtlı senaryolara `/s/:token` ile giriş gerektirmeyen genel bağlantı |

### Para birimi

Tüm toplamlar **Türk lirası** cinsindendir. ABD hisseleri gibi yabancı para
biriminde işlem gören enstrümanlar, **her işlem gününün kuruyla** çevrilir —
bugünkü kurla değil. Böylece hem hisse hareketi hem kur hareketi sonuca yansır.

---

## Teknoloji

### Frontend — `frontend/`

- **React 18** + TypeScript + Vite
- **TailwindCSS** — HSL token tabanlı, açık/koyu tema tam destekli tasarım sistemi
- **Radix UI** — dialog, select, tabs, tooltip, dropdown, separator primitifleri
- **TanStack React Query** — sunucu durumu, otomatik yenileme, iyimser güncellemeler
- **Zustand** — oturum ve tema durumu (localStorage'a kalıcı)
- **Recharts** — tema token'larından beslenen grafikler
- **Framer Motion** — yalnızca giriş animasyonları, `prefers-reduced-motion` destekli

### Backend — `api/` + `pkg/`

- **Go 1.22** — Vercel serverless fonksiyonları
- **pgx/v5** — Neon PostgreSQL (pgbouncer uyumlu, prepared statement kapalı)
- **Upstash Redis (REST)** — fiyat/arama önbelleği ve hız sınırı sayaçları
- **Yahoo Finance** — fiyat, geçmiş veri ve kur kaynağı (crumb/cookie oturumuyla)

---

## Geliştirme

### Gereksinimler

- Go 1.22+
- Node.js 20+
- PostgreSQL 14+ (yerel) veya bir Neon bağlantı dizesi

### Kurulum

```bash
cp .env.example .env.local     # değerleri doldurun (en azından DATABASE_URL ve JWT_SECRET)
cd frontend && npm install && cd ..
```

Migration'ları sırayla uygulayın:

```bash
for f in db/migration/V*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

### Çalıştırma

```bash
npm start      # Go API (:3000) + Vite (:5173) birlikte
```

Ayrı ayrı:

```bash
source .env.local && go run ./cmd/server/ --port 3000
cd frontend && npm run dev
```

### Doğrulama

```bash
go vet ./... && go test ./...
cd frontend && npm run lint && npm run build
```

---

## Proje Yapısı

```
api/                      Vercel serverless handler'ları (dizin başına tek Handler)
  alerts/                 Fiyat alarmları + bildirim gelen kutusu (resource parametresiyle)
  auth/                   Giriş, kayıt, token yenileme, çıkış (action parametresiyle)
  compare/                Karşılaştırma hesabı
    history/              Kayıtlı senaryolar: listeleme, favori, silme
    shared/               Genel paylaşım bağlantısı (kimlik doğrulaması gerektirmez)
  market/                 Piyasa genel görünümü
  portfolio/              Portföy özeti ve yatırım ekleme
    item/                 Düzenleme, satış/kapatma, silme
  stocks/                 Arama, anlık fiyat, geçmiş veri
  users/                  Profil, ayarlar, şifre değiştirme, hesap silme
  watchlist/              İzleme listesi
    item/                 Not, sıra, silme
pkg/
  auth/                   JWT üretimi ve doğrulama
  cache/                  Upstash Redis REST istemcisi + sayaç
  db/                     pgx havuzu, sağlık kontrolü, bağlantı dizesi çözümleme
  finance/                Yahoo istemcisi, sembol normalizasyonu, kur dönüşümü
  respond/                JSON yanıtları, CORS, hız sınırı
cmd/server/               Yerel geliştirme sunucusu (vercel.json rewrite'larını taklit eder)
db/migration/             Flyway biçiminde SQL migration'ları (V1__, V2__, …)
frontend/src/
  pages/                  Ekranlar
  components/ui/          Tasarım sistemi primitifleri
  components/compare/     Karşılaştırma sonucu görünümü (sayfa ve paylaşım ortak kullanır)
  hooks/                  React Query hook'ları ve yardımcı hook'lar
  services/               Axios servis katmanı
  stores/                 Zustand store'ları
  lib/                    Biçimlendirme, grafik teması, hata çevirisi
```

---

## Mimari Notlar

**Serverless fonksiyon sayısı.** Vercel Hobby planı dağıtım başına 12 fonksiyonla
sınırlıdır. Bu yüzden ilişkili uçlar tek handler'da toplanır ve `vercel.json`
rewrite'larıyla ayrıştırılır: `/api/notifications` → `/api/alerts?resource=notifications`,
`/api/users/password` → `/api/users/me?action=password` gibi.

**SPA yönlendirmesi.** `vercel.json` içindeki `/((?!api/).*)` → `/index.html`
kuralı olmadan `/dashboard` gibi bir adrese doğrudan girildiğinde 404 alınır.

**Erişim ve yenileme jetonları.** Erişim jetonu 30 dakika, yenileme jetonu 7 gün
geçerlidir ve her yenilemede döndürülür. Erişim jetonu her istekte veritabanına
sorulmadığı için çıkış anında iptal edilemez; kısa ömür bu açığı sınırlar.

**Alarm değerlendirmesi.** Arka plan işçisi yoktur; aktif alarmlar `/api/alerts`
her okunduğunda güncel fiyata karşı değerlendirilir ve tetiklenenler bildirim
üretir.

---

## Sorumluluk Reddi

Bu uygulama yatırım tavsiyesi vermez. Veriler Yahoo Finance üzerinden alınır,
15 dakikaya kadar gecikmeli olabilir ve yalnızca bilgilendirme amaçlıdır.
Geçmiş performans gelecekteki getirinin göstergesi değildir.
