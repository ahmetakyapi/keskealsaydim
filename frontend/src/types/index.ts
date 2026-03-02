// ── Auth types ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  avatarUrl?: string;
  emailVerified: boolean;
  preferredCurrency: string;
  theme: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  experienceLevel?: string;
}

// ── Stock types ──────────────────────────────────────────────────────────────

export interface StockPrice {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap: number;
  week52High: number;
  week52Low: number;
  lastUpdated: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  sector?: string;
}

export interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

export interface StockHistory {
  symbol: string;
  interval: string;
  data: HistoryPoint[];
}

// ── Compare types (matching Go backend) ─────────────────────────────────────

export interface CompareRequest {
  symbolA: string;
  symbolAName?: string;
  symbolB: string;
  symbolBName?: string;
  startDate: string;
  endDate?: string;
  amount: number;
  amountType?: 'MONEY' | 'QUANTITY';
  title?: string;
  notes?: string;
  saveScenario?: boolean;
}

export interface SymbolCompareResult {
  startPrice: number;
  endPrice: number;
  changePercent: number;
  quantity: number;
  startValue: number;
  endValue: number;
  profit: number;
  profitPercent: number;
}

export interface CompareResultDifference {
  absoluteTL: number;
  percentagePoints: number;
  winnerSymbol: 'A' | 'B';
  missedOpportunity: boolean;
}

export interface CompareMetrics {
  symbolAVolatility: number;
  symbolBVolatility: number;
  correlation: number;
}

export interface CompareResultData {
  symbolA: SymbolCompareResult;
  symbolB: SymbolCompareResult;
  difference: CompareResultDifference;
  metrics: CompareMetrics;
}

export interface CompareResponse {
  scenarioId?: string;
  shareToken?: string;
  symbolA: string;
  symbolAName: string;
  symbolB: string;
  symbolBName: string;
  startDate: string;
  endDate: string;
  amount: number;
  amountType: string;
  title?: string;
  result: CompareResultData;
}

export interface SavedScenario {
  id: string;
  symbolA: string;
  symbolAName: string;
  symbolB: string;
  symbolBName: string;
  startDate: string;
  endDate?: string;
  amount: number;
  amountType: string;
  result: CompareResultData;
  title?: string;
  isFavorite: boolean;
  shareToken?: string;
  viewCount: number;
  createdAt: string;
}

export interface ScenariosPage {
  content: SavedScenario[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// ── Portfolio types ──────────────────────────────────────────────────────────

export interface Investment {
  id: string;
  symbol: string;
  symbolName: string;
  exchange: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  notes?: string;
  status: 'OPEN' | 'CLOSED' | 'PARTIAL';
  currency: string;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  profit: number;
  profitPercent: number;
  changePercent: number;
  dailyChange: number;
  weight: number;
  createdAt: string;
}

export interface PortfolioSummary {
  holdings: Investment[];
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  totalInvestments: number;
  openInvestments: number;
  closedInvestments: number;
}

export interface AddInvestmentRequest {
  symbol: string;
  symbolName?: string;
  exchange?: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  notes?: string;
}

// ── Watchlist types ──────────────────────────────────────────────────────────

export interface WatchlistItem {
  id: string;
  symbol: string;
  symbolName: string;
  exchange: string;
  notes?: string;
  displayOrder: number;
  addedAt: string;
  price: number;
  change: number;
  changePercent: number;
  week52High: number;
  week52Low: number;
  volume: number;
}

// ── Market types ─────────────────────────────────────────────────────────────

export interface MarketQuote {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  week52High: number;
  week52Low: number;
  lastUpdated: string;
}

export interface MarketOverview {
  quotes: MarketQuote[];
}

// ── Notification types ───────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: 'PRICE_ALERT' | 'PORTFOLIO_UPDATE' | 'NEWS' | 'SYSTEM' | 'COMPARISON_RESULT';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
