// User types
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
  rememberMe?: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  experienceLevel?: string;
}

// Stock types
export interface StockPrice {
  symbol: string;
  name?: string;
  exchange?: string;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  marketCap?: number;
  week52High?: number;
  week52Low?: number;
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
  adjustedClose?: number;
}

export interface StockHistory {
  symbol: string;
  interval: string;
  data: HistoryPoint[];
}

// Comparison types
export interface CompareRequest {
  symbolA: string;
  symbolB: string;
  startDate: string;
  endDate?: string;
  amount: number;
  amountType?: 'MONEY' | 'QUANTITY';
}

export interface SymbolResult {
  symbol: string;
  name: string;
  startPrice: number;
  endPrice: number;
  changePercent: number;
  quantity: number;
  startValue: number;
  endValue: number;
  profit: number;
  profitPercent: number;
}

export interface ComparisonSummary {
  differenceAmount: number;
  differencePercent: number;
  winnerSymbol: 'A' | 'B';
  missedOpportunity: boolean;
  message: string;
}

export interface ChartDataPoint {
  date: string;
  priceA: number;
  priceB: number;
  normalizedA: number;
  normalizedB: number;
}

export interface MetricsComparison {
  volatilityA: number;
  volatilityB: number;
  maxDrawdownA: number;
  maxDrawdownB: number;
  avgVolumeA: number;
  avgVolumeB: number;
  correlation: number;
}

export interface CompareResponse {
  scenarioId?: string;
  symbolA: string;
  symbolAName?: string;
  symbolB: string;
  symbolBName?: string;
  startDate: string;
  endDate: string;
  investmentAmount: number;
  resultA: SymbolResult;
  resultB: SymbolResult;
  summary: ComparisonSummary;
  chartData: ChartDataPoint[];
  metrics: MetricsComparison;
}

// Investment types
export interface Investment {
  id: string;
  symbol: string;
  symbolName?: string;
  exchange: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  buyCommission?: number;
  sellPrice?: number;
  sellDate?: string;
  sellCommission?: number;
  status: 'OPEN' | 'CLOSED' | 'PARTIAL';
  currency: string;
  notes?: string;
  tags?: string[];
  currentPrice?: number;
  currentValue?: number;
  totalCost?: number;
  profit?: number;
  profitPercent?: number;
  weight?: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  totalInvestments: number;
  openInvestments: number;
  closedInvestments: number;
  bestPerformer?: Investment;
  worstPerformer?: Investment;
  sectorDistribution?: Record<string, number>;
  holdings: Investment[];
}

// Watchlist types
export interface WatchlistItem {
  id: string;
  symbol: string;
  symbolName?: string;
  exchange: string;
  notes?: string;
  displayOrder: number;
  addedAt: string;
  price?: number;
  change?: number;
  changePercent?: number;
  week52High?: number;
  week52Low?: number;
  marketCap?: number;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: 'ABOVE' | 'BELOW' | 'CROSS';
  status: 'ACTIVE' | 'TRIGGERED' | 'CANCELLED' | 'EXPIRED';
  message?: string;
  notifyEmail: boolean;
  notifyPush: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;
  expiresAt?: string;
  createdAt: string;
}

// Market types
export interface MarketOverview {
  indices: Record<string, {
    value: number;
    change: number;
    changePercent: number;
  }>;
  currencies: Record<string, {
    value: number;
    change: number;
    changePercent: number;
  }>;
  commodities: Record<string, {
    value: number;
    change: number;
    changePercent: number;
  }>;
  gainers: StockPrice[];
  losers: StockPrice[];
  mostActive: StockPrice[];
  lastUpdated: string;
}

// Notification types
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
