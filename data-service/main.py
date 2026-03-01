from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import yfinance as yf
import pandas as pd
from datetime import datetime, date
from typing import Optional, List
import redis
import json
import logging
from pydantic import BaseModel
from pydantic_settings import BaseSettings
from cachetools import TTLCache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = "redis_secret_2024"
    cache_ttl: int = 15  # seconds for price cache
    history_cache_ttl: int = 300  # 5 minutes for history cache

    class Config:
        env_file = ".env"


settings = Settings()

# In-memory cache for quick lookups
price_cache = TTLCache(maxsize=1000, ttl=settings.cache_ttl)
history_cache = TTLCache(maxsize=100, ttl=settings.history_cache_ttl)

# Redis client
redis_client: Optional[redis.Redis] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    try:
        redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            password=settings.redis_password,
            decode_responses=True
        )
        redis_client.ping()
        logger.info("Connected to Redis")
    except Exception as e:
        logger.warning(f"Could not connect to Redis: {e}")
        redis_client = None
    yield
    if redis_client:
        redis_client.close()


app = FastAPI(
    title="Keşke Alsaydım Data Service",
    description="Stock data service powered by Yahoo Finance",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class StockPrice(BaseModel):
    symbol: str
    name: Optional[str] = None
    exchange: Optional[str] = None
    price: float
    previousClose: Optional[float] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[int] = None
    marketCap: Optional[float] = None
    week52High: Optional[float] = None
    week52Low: Optional[float] = None
    lastUpdated: str


class HistoryPoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    adjustedClose: Optional[float] = None


class StockHistory(BaseModel):
    symbol: str
    interval: str
    data: List[HistoryPoint]


class StockSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str
    type: str
    sector: Optional[str] = None


class PricesRequest(BaseModel):
    symbols: List[str]


# BIST symbols mapping (common Turkish stocks)
BIST_SYMBOLS = {
    "THYAO": {"name": "Türk Hava Yolları", "sector": "Havacılık"},
    "GARAN": {"name": "Garanti BBVA", "sector": "Bankacılık"},
    "AKBNK": {"name": "Akbank", "sector": "Bankacılık"},
    "YKBNK": {"name": "Yapı Kredi", "sector": "Bankacılık"},
    "ISCTR": {"name": "İş Bankası", "sector": "Bankacılık"},
    "HALKB": {"name": "Halkbank", "sector": "Bankacılık"},
    "VAKBN": {"name": "Vakıfbank", "sector": "Bankacılık"},
    "SISE": {"name": "Şişe Cam", "sector": "Cam"},
    "TCELL": {"name": "Turkcell", "sector": "Telekomünikasyon"},
    "TTKOM": {"name": "Türk Telekom", "sector": "Telekomünikasyon"},
    "EREGL": {"name": "Ereğli Demir Çelik", "sector": "Metal"},
    "KRDMD": {"name": "Kardemir", "sector": "Metal"},
    "ASELS": {"name": "Aselsan", "sector": "Savunma"},
    "TUPRS": {"name": "Tüpraş", "sector": "Enerji"},
    "PETKM": {"name": "Petkim", "sector": "Kimya"},
    "SAHOL": {"name": "Sabancı Holding", "sector": "Holding"},
    "KCHOL": {"name": "Koç Holding", "sector": "Holding"},
    "BIMAS": {"name": "BİM", "sector": "Perakende"},
    "MGROS": {"name": "Migros", "sector": "Perakende"},
    "ARCLK": {"name": "Arçelik", "sector": "Beyaz Eşya"},
    "FROTO": {"name": "Ford Otosan", "sector": "Otomotiv"},
    "TOASO": {"name": "Tofaş", "sector": "Otomotiv"},
    "SASA": {"name": "Sasa Polyester", "sector": "Kimya"},
    "TAVHL": {"name": "TAV Havalimanları", "sector": "Havacılık"},
    "PGSUS": {"name": "Pegasus", "sector": "Havacılık"},
    "EKGYO": {"name": "Emlak Konut GYO", "sector": "Gayrimenkul"},
    "ENKAI": {"name": "Enka İnşaat", "sector": "İnşaat"},
    "KOZAL": {"name": "Koza Altın", "sector": "Madencilik"},
    "KOZAA": {"name": "Koza Anadolu", "sector": "Madencilik"},
    "DOHOL": {"name": "Doğan Holding", "sector": "Holding"},
}


def get_yahoo_symbol(symbol: str) -> str:
    """Convert BIST symbol to Yahoo Finance format"""
    symbol = symbol.upper().strip()
    if not symbol.endswith(".IS") and symbol in BIST_SYMBOLS:
        return f"{symbol}.IS"
    return symbol


def get_from_cache(key: str):
    """Try to get from in-memory cache first, then Redis"""
    if key in price_cache:
        return price_cache[key]
    if redis_client:
        try:
            data = redis_client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning(f"Redis get error: {e}")
    return None


def set_to_cache(key: str, value: dict, ttl: int = None):
    """Set to both in-memory and Redis cache"""
    ttl = ttl or settings.cache_ttl
    price_cache[key] = value
    if redis_client:
        try:
            redis_client.setex(key, ttl, json.dumps(value, default=str))
        except Exception as e:
            logger.warning(f"Redis set error: {e}")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/price/{symbol}", response_model=StockPrice)
async def get_price(symbol: str):
    """Get current stock price"""
    cache_key = f"stock:price:{symbol.upper()}"
    cached = get_from_cache(cache_key)
    if cached:
        return StockPrice(**cached)

    try:
        yahoo_symbol = get_yahoo_symbol(symbol)
        ticker = yf.Ticker(yahoo_symbol)
        info = ticker.info

        if not info or info.get('regularMarketPrice') is None:
            raise HTTPException(status_code=404, detail=f"Symbol not found: {symbol}")

        price_data = {
            "symbol": symbol.upper(),
            "name": info.get('shortName') or BIST_SYMBOLS.get(symbol.upper(), {}).get('name', symbol),
            "exchange": info.get('exchange', 'BIST'),
            "price": info.get('regularMarketPrice', 0),
            "previousClose": info.get('previousClose'),
            "change": info.get('regularMarketChange'),
            "changePercent": info.get('regularMarketChangePercent'),
            "open": info.get('regularMarketOpen'),
            "high": info.get('regularMarketDayHigh'),
            "low": info.get('regularMarketDayLow'),
            "volume": info.get('regularMarketVolume'),
            "marketCap": info.get('marketCap'),
            "week52High": info.get('fiftyTwoWeekHigh'),
            "week52Low": info.get('fiftyTwoWeekLow'),
            "lastUpdated": datetime.now().isoformat()
        }

        set_to_cache(cache_key, price_data)
        return StockPrice(**price_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching price for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/prices")
async def get_prices(request: PricesRequest):
    """Get prices for multiple symbols"""
    results = {}
    for symbol in request.symbols:
        try:
            price = await get_price(symbol)
            results[symbol.upper()] = price.model_dump()
        except HTTPException:
            results[symbol.upper()] = None
    return results


@app.get("/history/{symbol}", response_model=StockHistory)
async def get_history(
    symbol: str,
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    interval: str = "1d"
):
    """Get historical price data"""
    cache_key = f"stock:history:{symbol.upper()}:{from_date}:{to_date}:{interval}"

    if cache_key in history_cache:
        return StockHistory(**history_cache[cache_key])

    try:
        yahoo_symbol = get_yahoo_symbol(symbol)
        ticker = yf.Ticker(yahoo_symbol)

        # Fetch historical data
        hist = ticker.history(start=from_date, end=to_date, interval=interval)

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No history data for {symbol}")

        data = []
        for idx, row in hist.iterrows():
            data.append(HistoryPoint(
                date=idx.strftime("%Y-%m-%d"),
                open=round(row['Open'], 4),
                high=round(row['High'], 4),
                low=round(row['Low'], 4),
                close=round(row['Close'], 4),
                volume=int(row['Volume']),
                adjustedClose=round(row.get('Adj Close', row['Close']), 4)
            ))

        history_data = {
            "symbol": symbol.upper(),
            "interval": interval,
            "data": [d.model_dump() for d in data]
        }

        history_cache[cache_key] = history_data
        return StockHistory(**history_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search", response_model=List[StockSearchResult])
async def search_stocks(q: str = Query(..., min_length=1)):
    """Search for stocks"""
    query = q.upper().strip()
    results = []

    # Search in BIST symbols first
    for symbol, info in BIST_SYMBOLS.items():
        if query in symbol or query in info['name'].upper():
            results.append(StockSearchResult(
                symbol=symbol,
                name=info['name'],
                exchange="BIST",
                type="Stock",
                sector=info.get('sector')
            ))

    # If query looks like a ticker, also try Yahoo search
    if len(results) < 5 and len(query) <= 10:
        try:
            yahoo_results = yf.Ticker(get_yahoo_symbol(query))
            if yahoo_results.info and yahoo_results.info.get('shortName'):
                info = yahoo_results.info
                exists = any(r.symbol == query for r in results)
                if not exists:
                    results.append(StockSearchResult(
                        symbol=query,
                        name=info.get('shortName', query),
                        exchange=info.get('exchange', 'Unknown'),
                        type=info.get('quoteType', 'Stock'),
                        sector=info.get('sector')
                    ))
        except Exception:
            pass

    return results[:10]


@app.get("/market/overview")
async def get_market_overview():
    """Get market overview with indices and key stocks"""
    cache_key = "market:overview"
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    overview = {
        "indices": {},
        "gainers": [],
        "losers": [],
        "mostActive": [],
        "currencies": {},
        "commodities": {},
        "lastUpdated": datetime.now().isoformat()
    }

    # Key indices
    indices_symbols = {
        "XU100": "XU100.IS",  # BIST 100
        "XU030": "XU030.IS",  # BIST 30
    }

    for name, symbol in indices_symbols.items():
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            overview["indices"][name] = {
                "value": info.get('regularMarketPrice'),
                "change": info.get('regularMarketChange'),
                "changePercent": info.get('regularMarketChangePercent')
            }
        except Exception as e:
            logger.warning(f"Could not fetch index {name}: {e}")

    # Currencies
    currency_pairs = {
        "USDTRY": "USDTRY=X",
        "EURTRY": "EURTRY=X",
        "GBPTRY": "GBPTRY=X"
    }

    for name, symbol in currency_pairs.items():
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            overview["currencies"][name] = {
                "value": info.get('regularMarketPrice'),
                "change": info.get('regularMarketChange'),
                "changePercent": info.get('regularMarketChangePercent')
            }
        except Exception as e:
            logger.warning(f"Could not fetch currency {name}: {e}")

    # Commodities
    commodities = {
        "GOLD": "GC=F",
        "SILVER": "SI=F",
        "OIL": "CL=F"
    }

    for name, symbol in commodities.items():
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            overview["commodities"][name] = {
                "value": info.get('regularMarketPrice'),
                "change": info.get('regularMarketChange'),
                "changePercent": info.get('regularMarketChangePercent')
            }
        except Exception as e:
            logger.warning(f"Could not fetch commodity {name}: {e}")

    # Cache for 1 minute
    set_to_cache(cache_key, overview, ttl=60)
    return overview


@app.get("/details/{symbol}")
async def get_stock_details(symbol: str):
    """Get detailed stock information"""
    try:
        yahoo_symbol = get_yahoo_symbol(symbol)
        ticker = yf.Ticker(yahoo_symbol)
        info = ticker.info

        if not info:
            raise HTTPException(status_code=404, detail=f"Symbol not found: {symbol}")

        return {
            "symbol": symbol.upper(),
            "name": info.get('shortName'),
            "longName": info.get('longName'),
            "sector": info.get('sector'),
            "industry": info.get('industry'),
            "website": info.get('website'),
            "description": info.get('longBusinessSummary'),
            "employees": info.get('fullTimeEmployees'),
            "marketCap": info.get('marketCap'),
            "enterpriseValue": info.get('enterpriseValue'),
            "trailingPE": info.get('trailingPE'),
            "forwardPE": info.get('forwardPE'),
            "priceToBook": info.get('priceToBook'),
            "dividendYield": info.get('dividendYield'),
            "beta": info.get('beta'),
            "fiftyTwoWeekHigh": info.get('fiftyTwoWeekHigh'),
            "fiftyTwoWeekLow": info.get('fiftyTwoWeekLow'),
            "fiftyDayAverage": info.get('fiftyDayAverage'),
            "twoHundredDayAverage": info.get('twoHundredDayAverage'),
            "averageVolume": info.get('averageVolume'),
            "currency": info.get('currency', 'TRY')
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching details for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
