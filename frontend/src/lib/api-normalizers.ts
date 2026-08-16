import type {
  ClosedPosition,
  Investment,
  MarketCategory,
  MarketOverview,
  MarketQuote,
  MarketState,
  PortfolioSummary,
  WatchlistItem,
} from '@/types';

/**
 * The API is trusted but not assumed: a dropped field must degrade to a safe
 * default rather than surface as `NaN`/`undefined` deep inside a chart.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeInvestmentStatus(value: unknown): Investment['status'] {
  return value === 'CLOSED' || value === 'PARTIAL' ? value : 'OPEN';
}

function normalizeCurrency(value: unknown, fallback = 'TRY'): string {
  const code = toStringValue(value, '').toUpperCase();
  return code.length >= 3 ? code : fallback;
}

function normalizeInvestment(value: unknown, index: number): Investment {
  const item = isRecord(value) ? value : {};

  return {
    id: toStringValue(item.id, `holding-${index}`),
    symbol: toStringValue(item.symbol, ''),
    symbolName: toStringValue(item.symbolName, '') || toStringValue(item.symbol, ''),
    exchange: toStringValue(item.exchange, ''),
    quantity: toFiniteNumber(item.quantity),
    buyPrice: toFiniteNumber(item.buyPrice),
    buyDate: toStringValue(item.buyDate, ''),
    buyCommission: toFiniteNumber(item.buyCommission),
    notes: toNullableString(item.notes),
    status: normalizeInvestmentStatus(item.status),
    currency: normalizeCurrency(item.currency),
    currentPrice: toFiniteNumber(item.currentPrice),
    currentValue: toFiniteNumber(item.currentValue),
    totalCost: toFiniteNumber(item.totalCost),
    profit: toFiniteNumber(item.profit),
    profitPercent: toFiniteNumber(item.profitPercent),
    changePercent: toFiniteNumber(item.changePercent),
    dailyChange: toFiniteNumber(item.dailyChange),
    weight: toFiniteNumber(item.weight),
    stale: toBoolean(item.stale),
    createdAt: toStringValue(item.createdAt, ''),
  };
}

function normalizeClosedPosition(value: unknown, index: number): ClosedPosition {
  const item = isRecord(value) ? value : {};

  return {
    id: toStringValue(item.id, `closed-${index}`),
    symbol: toStringValue(item.symbol, ''),
    symbolName: toStringValue(item.symbolName, '') || toStringValue(item.symbol, ''),
    quantity: toFiniteNumber(item.quantity),
    buyPrice: toFiniteNumber(item.buyPrice),
    buyDate: toStringValue(item.buyDate, ''),
    sellPrice: toFiniteNumber(item.sellPrice),
    sellDate: toStringValue(item.sellDate, ''),
    currency: normalizeCurrency(item.currency),
    profit: toFiniteNumber(item.profit),
    profitPercent: toFiniteNumber(item.profitPercent),
    holdingDays: Math.max(0, Math.round(toFiniteNumber(item.holdingDays))),
  };
}

const MARKET_CATEGORIES: MarketCategory[] = ['INDEX', 'CURRENCY', 'COMMODITY', 'BIST', 'US'];

function normalizeCategory(value: unknown): MarketCategory {
  const category = toStringValue(value, '').toUpperCase() as MarketCategory;
  return MARKET_CATEGORIES.includes(category) ? category : 'BIST';
}

function normalizeMarketQuote(value: unknown, index: number): MarketQuote {
  const item = isRecord(value) ? value : {};
  const symbol = toStringValue(item.symbol, `quote-${index}`);

  return {
    symbol,
    name: toStringValue(item.name, '') || symbol,
    exchange: toStringValue(item.exchange, ''),
    currency: normalizeCurrency(item.currency),
    category: normalizeCategory(item.category),
    price: toFiniteNumber(item.price),
    previousClose: toFiniteNumber(item.previousClose),
    change: toFiniteNumber(item.change),
    changePercent: toFiniteNumber(item.changePercent),
    open: toFiniteNumber(item.open),
    high: toFiniteNumber(item.high),
    low: toFiniteNumber(item.low),
    volume: toFiniteNumber(item.volume),
    marketCap: toFiniteNumber(item.marketCap),
    week52High: toFiniteNumber(item.week52High),
    week52Low: toFiniteNumber(item.week52Low),
    lastUpdated: toStringValue(item.lastUpdated, ''),
  };
}

export function normalizePortfolioSummary(value: unknown): PortfolioSummary {
  const data = isRecord(value) ? value : {};
  const holdings = Array.isArray(data.holdings) ? data.holdings.map(normalizeInvestment) : [];
  const closedPositions = Array.isArray(data.closedPositions)
    ? data.closedPositions.map(normalizeClosedPosition)
    : [];

  return {
    holdings,
    closedPositions,
    totalValue: toFiniteNumber(data.totalValue),
    totalCost: toFiniteNumber(data.totalCost),
    totalProfit: toFiniteNumber(data.totalProfit),
    totalProfitPercent: toFiniteNumber(data.totalProfitPercent),
    realizedProfit: toFiniteNumber(data.realizedProfit),
    dailyChange: toFiniteNumber(data.dailyChange),
    dailyChangePercent: toFiniteNumber(data.dailyChangePercent),
    totalInvestments: toFiniteNumber(data.totalInvestments, holdings.length + closedPositions.length),
    openInvestments: toFiniteNumber(data.openInvestments, holdings.length),
    closedInvestments: toFiniteNumber(data.closedInvestments, closedPositions.length),
    baseCurrency: normalizeCurrency(data.baseCurrency),
  };
}

export function normalizeMarketOverview(value: unknown): MarketOverview {
  const data = isRecord(value) ? value : {};
  const quotes = Array.isArray(data.quotes) ? data.quotes.map(normalizeMarketQuote) : [];
  const state = toStringValue(data.marketState, 'UNKNOWN').toUpperCase() as MarketState;

  return {
    quotes,
    fetchedAt: toStringValue(data.fetchedAt, new Date().toISOString()),
    requestedSymbols: toFiniteNumber(data.requestedSymbols, quotes.length),
    resolvedSymbols: toFiniteNumber(data.resolvedSymbols, quotes.length),
    partial: toBoolean(data.partial),
    usdTry: toFiniteNumber(data.usdTry),
    marketState: state === 'OPEN' || state === 'CLOSED' ? state : 'UNKNOWN',
  };
}

function normalizeWatchlistItem(value: unknown, index: number): WatchlistItem {
  const item = isRecord(value) ? value : {};
  const symbol = toStringValue(item.symbol, `symbol-${index}`);

  return {
    id: toStringValue(item.id, `watch-${index}`),
    symbol,
    symbolName: toStringValue(item.symbolName, '') || symbol,
    exchange: toStringValue(item.exchange, ''),
    currency: normalizeCurrency(item.currency),
    notes: toNullableString(item.notes),
    displayOrder: toFiniteNumber(item.displayOrder, index),
    addedAt: toStringValue(item.addedAt, ''),
    price: toFiniteNumber(item.price),
    change: toFiniteNumber(item.change),
    changePercent: toFiniteNumber(item.changePercent),
    open: toFiniteNumber(item.open),
    high: toFiniteNumber(item.high),
    low: toFiniteNumber(item.low),
    week52High: toFiniteNumber(item.week52High),
    week52Low: toFiniteNumber(item.week52Low),
    volume: toFiniteNumber(item.volume),
    priceAvailable: toBoolean(item.priceAvailable),
  };
}

export function normalizeWatchlist(value: unknown): WatchlistItem[] {
  return Array.isArray(value) ? value.map(normalizeWatchlistItem) : [];
}
