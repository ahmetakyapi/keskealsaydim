# Keşke Alsaydım

Kapsamlı bir borsa/yatırım karşılaştırma uygulaması. "X tarihinde şu hisseyi almak istiyordum ama almadım, bunun yerine Y hissesini aldım" diyerek iki yatırım arasındaki farkı, kaybedilen/kazanılan fırsatı net biçimde görebilirsin.

## Özellikler

- **Karşılaştır (Keşke Alsaydım?)**: İki hisse arasında karşılaştırma yaparak kaçırdığın fırsatları keşfet
- **Portföy Takibi**: Yatırımlarını anlık takip et
- **Favoriler (Watchlist)**: Takip etmek istediğin hisseleri izle
- **Piyasa Görünümü**: BIST100, döviz, altın ve emtia fiyatları
- **Analizler**: Detaylı performans analizleri
- **Fiyat Alarmları**: Hedef fiyata ulaşıldığında bildirim al

## Teknoloji Stack

### Frontend
- React 18 + TypeScript
- Vite
- Zustand (state management)
- TanStack Query (React Query)
- React Router v6
- Recharts (grafikler)
- Framer Motion (animasyonlar)
- Tailwind CSS + shadcn/ui
- Axios

### Backend
- Spring Boot 3 (Java 21)
- Spring Security + JWT
- Spring WebSocket
- Spring Data JPA + Hibernate
- Spring Cache (Redis)
- Swagger/OpenAPI

### Data Service
- Python 3.12 + FastAPI
- yfinance (Yahoo Finance verisi)
- Redis cache

### Veritabanı & Altyapı
- PostgreSQL 16
- Redis 7
- Docker + Docker Compose
- Nginx (reverse proxy)

## Proje Yapısı

```
keskealsaydim/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── frontend/          # React uygulaması
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/
│   │   ├── services/
│   │   └── types/
│   └── Dockerfile
├── backend/           # Spring Boot uygulaması
│   ├── src/main/java/com/keskealsaydim/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── entity/
│   │   ├── dto/
│   │   ├── security/
│   │   └── config/
│   └── Dockerfile
└── data-service/      # Python FastAPI
    ├── main.py
    └── Dockerfile
```

## Kurulum

### Gereksinimler
- Docker & Docker Compose
- Node.js 20+ (geliştirme için)
- Java 21+ (geliştirme için)
- Python 3.12+ (geliştirme için)

### Docker ile Çalıştırma

```bash
# Projeyi klonla
git clone https://github.com/yourusername/keskealsaydim.git
cd keskealsaydim

# Environment dosyasını oluştur
cp .env.example .env

# Docker Compose ile başlat
docker-compose up -d

# Uygulamaya eriş
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html
```

### Geliştirme Ortamı

#### Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

#### Backend
```bash
cd backend
./mvnw spring-boot:run
# http://localhost:8080
```

#### Data Service
```bash
cd data-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
# http://localhost:8001
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Giriş
- `POST /api/auth/refresh` - Token yenileme
- `POST /api/auth/logout` - Çıkış

### Karşılaştırma
- `POST /api/compare` - İki hisseyi karşılaştır
- `GET /api/compare/history` - Geçmiş karşılaştırmalar
- `GET /api/compare/shared/{token}` - Paylaşılan karşılaştırma

### Hisseler
- `GET /api/stocks/search?q=` - Hisse ara
- `GET /api/stocks/{symbol}/price` - Anlık fiyat
- `GET /api/stocks/{symbol}/history` - Geçmiş veriler

### Portföy
- `GET /api/portfolio` - Portföy özeti
- `POST /api/portfolio/investment` - Yeni yatırım ekle
- `PUT /api/portfolio/investment/{id}` - Güncelle
- `DELETE /api/portfolio/investment/{id}` - Sil

### Favoriler
- `GET /api/watchlist` - Favori listesi
- `POST /api/watchlist/{symbol}` - Ekle
- `DELETE /api/watchlist/{symbol}` - Çıkar
- `POST /api/watchlist/{symbol}/alert` - Fiyat alarmı kur

### Piyasa
- `GET /api/market/overview` - Piyasa özeti

## Ortam Değişkenleri

```env
# PostgreSQL
POSTGRES_DB=keskealsaydim
POSTGRES_USER=keske
POSTGRES_PASSWORD=your_secure_password

# Redis
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=86400000

# External APIs (Opsiyonel)
ALPHA_VANTAGE_API_KEY=your_key
```

## Ekran Görüntüleri

### Landing Page
- Etkileyici glassmorphism tasarım
- Animasyonlu istatistikler
- Floating ticker bar

### Dashboard
- Portföy özeti
- Piyasa göstergeleri
- Hızlı işlem butonları

### Karşılaştırma (Ana Özellik)
- Dramatik sonuç kartları
- Konfeti animasyonu (kar durumunda)
- İnteraktif grafikler

## Lisans

MIT

## Katkıda Bulunma

Pull request'ler memnuniyetle karşılanır. Büyük değişiklikler için önce bir issue açarak neyi değiştirmek istediğinizi tartışın.
