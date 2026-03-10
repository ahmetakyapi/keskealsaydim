import type { Investment, MarketOverview, MarketQuote, PortfolioSummary } from '@/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeInvestmentStatus(value: unknown): Investment['status'] {
  return value === 'CLOSED' || value === 'PARTIAL' ? value : 'OPEN';
}

function normalizeInvestment(value: unknown, index: number): Investment {
  const item = isRecord(value) ? value : {};

  return {
    id: toStringValue(item.id, `holding-${index}`),
    symbol: toStringValue(item.symbol, ''),
    symbolName: toStringValue(item.symbolName, ''),
    exchange: toStringValue(item.exchange, ''),
    quantity: toFiniteNumber(item.quantity),
    buyPrice: toFiniteNumber(item.buyPrice),
    buyDate: toStringValue(item.buyDate, ''),
    notes: typeof item.notes === 'string' ? item.notes : undefined,
    status: normalizeInvestmentStatus(item.status),
    currency: toStringValue(item.currency, 'TRY'),
    currentPrice: toFiniteNumber(item.currentPrice),
    currentValue: toFiniteNumber(item.currentValue),
    totalCost: toFiniteNumber(item.totalCost),
    profit: toFiniteNumber(item.profit),
    profitPercent: toFiniteNumber(item.profitPercent),
    changePercent: toFiniteNumber(item.changePercent),
    dailyChange: toFiniteNumber(item.dailyChange),
    weight: toFiniteNumber(item.weight),
    createdAt: toStringValue(item.createdAt, ''),
  };
}

function normalizeMarketQuote(value: unknown, index: number): MarketQuote {
  const item = isRecord(value) ? value : {};

  return {
    symbol: toStringValue(item.symbol, `quote-${index}`),
    name: toStringValue(item.name, ''),
    exchange: toStringValue(item.exchange, ''),
    price: toFiniteNumber(item.price),
    previousClose: toFiniteNumber(item.previousClose),
    change: toFiniteNumber(item.change),
    changePercent: toFiniteNumber(item.changePercent),
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

  return {
    holdings,
    totalValue: toFiniteNumber(data.totalValue),
    totalCost: toFiniteNumber(data.totalCost),
    totalProfit: toFiniteNumber(data.totalProfit),
    totalProfitPercent: toFiniteNumber(data.totalProfitPercent),
    dailyChange: toFiniteNumber(data.dailyChange),
    dailyChangePercent: toFiniteNumber(data.dailyChangePercent),
    totalInvestments: toFiniteNumber(data.totalInvestments, holdings.length),
    openInvestments: toFiniteNumber(data.openInvestments, holdings.length),
    closedInvestments: toFiniteNumber(data.closedInvestments),
  };
}

export function normalizeMarketOverview(value: unknown): MarketOverview {
  const data = isRecord(value) ? value : {};

  return {
    quotes: Array.isArray(data.quotes) ? data.quotes.map(normalizeMarketQuote) : [],
  };
}
