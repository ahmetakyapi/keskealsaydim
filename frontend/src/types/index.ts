// ── Auth ────────────────────────────────────────────────────────────────────

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type ChartPeriod = '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';

export interface UserSettings {
  notifyPriceAlerts: boolean;
  notifyDailySummary: boolean;
  notifyWeeklyReport: boolean;
  notifyNews: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  compactMode: boolean;
  showPortfolioValue: boolean;
  defaultChartPeriod: ChartPeriod;
}

export interface User {
  id: string;
  email: string;
  name: string;
  experienceLevel: ExperienceLevel;
  avatarUrl?: string | null;
  emailVerified: boolean;
  isActive?: boolean;
  preferredCurrency: string;
  theme: string;
  createdAt: string;
  lastLoginAt?: string | null;
  settings?: UserSettings;
  unreadNotifications?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user?: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  experienceLevel?: ExperienceLevel;
}

// ── Stocks ──────────────────────────────────────────────────────────────────

export interface StockPrice {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
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
  currency: string;
  data: HistoryPoint[];
}

// ── Compare ─────────────────────────────────────────────────────────────────

export type AmountType = 'MONEY' | 'QUANTITY';

export interface CompareRequest {
  symbolA: string;
  symbolAName?: string;
  symbolB: string;
  symbolBName?: string;
  startDate: string;
  endDate?: string;
  amount: number;
  amountType?: AmountType;
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
  /** Currency the instrument trades in; values above are converted to TRY. */
  currency: string;
  maxDrawdown: number;
  bestValue: number;
  worstValue: number;
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
  tradingDays: number;
}

/** One aligned trading day, both positions valued in TRY. */
export interface CompareSeriesPoint {
  date: string;
  valueA: number;
  valueB: number;
}

export interface CompareResultData {
  symbolA: SymbolCompareResult;
  symbolB: SymbolCompareResult;
  difference: CompareResultDifference;
  metrics: CompareMetrics;
  series: CompareSeriesPoint[];
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
  amountType: AmountType;
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
  endDate?: string | null;
  amount: number;
  amountType: AmountType;
  result: CompareResultData;
  title?: string | null;
  notes?: string | null;
  isFavorite: boolean;
  shareToken?: string | null;
  viewCount: number;
  createdAt: string;
}

export interface ScenariosPage {
  content: SavedScenario[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  favoriteCount: number;
  totalScenarios: number;
}

export interface SharedScenario {
  id: string;
  symbolA: string;
  symbolAName: string;
  symbolB: string;
  symbolBName: string;
  startDate: string;
  endDate?: string | null;
  amount: number;
  amountType: AmountType;
  result: CompareResultData;
  title?: string | null;
  shareToken: string;
  viewCount: number;
  createdAt: string;
}

// ── Portfolio ───────────────────────────────────────────────────────────────

export type InvestmentStatus = 'OPEN' | 'CLOSED' | 'PARTIAL';

export interface Investment {
  id: string;
  symbol: string;
  symbolName: string;
  exchange: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  buyCommission: number;
  notes?: string | null;
  status: InvestmentStatus;
  /** Trading currency of the instrument. Prices are in it; totals are TRY. */
  currency: string;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  profit: number;
  profitPercent: number;
  changePercent: number;
  dailyChange: number;
  weight: number;
  /** True when the live quote could not be fetched and cost is shown instead. */
  stale: boolean;
  createdAt: string;
}

export interface ClosedPosition {
  id: string;
  symbol: string;
  symbolName: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  sellPrice: number;
  sellDate: string;
  currency: string;
  profit: number;
  profitPercent: number;
  holdingDays: number;
}

export interface PortfolioSummary {
  holdings: Investment[];
  closedPositions: ClosedPosition[];
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  realizedProfit: number;
  dailyChange: number;
  dailyChangePercent: number;
  totalInvestments: number;
  openInvestments: number;
  closedInvestments: number;
  baseCurrency: string;
}

export interface AddInvestmentRequest {
  symbol: string;
  symbolName?: string;
  exchange?: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  buyCommission?: number;
  notes?: string;
}

export interface UpdateInvestmentRequest {
  symbolName?: string;
  quantity?: number;
  buyPrice?: number;
  buyDate?: string;
  buyCommission?: number;
  notes?: string;
}

export interface SellInvestmentRequest {
  sellPrice: number;
  sellDate?: string;
  quantity?: number;
  sellCommission?: number;
}

export interface SellInvestmentResponse {
  id: string;
  symbol: string;
  soldQuantity: number;
  partial: boolean;
  profit: number;
  profitPercent: number;
  currency: string;
}

// ── Watchlist ───────────────────────────────────────────────────────────────

export interface WatchlistItem {
  id: string;
  symbol: string;
  symbolName: string;
  exchange: string;
  currency: string;
  notes?: string | null;
  displayOrder: number;
  addedAt: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  week52High: number;
  week52Low: number;
  volume: number;
  /** False when the provider did not return a quote — do not render 0 as real. */
  priceAvailable: boolean;
}

export interface UpdateWatchlistItemRequest {
  notes?: string;
  symbolName?: string;
  displayOrder?: number;
}

// ── Market ──────────────────────────────────────────────────────────────────

export type MarketCategory = 'INDEX' | 'CURRENCY' | 'COMMODITY' | 'BIST' | 'US';
export type MarketState = 'OPEN' | 'CLOSED' | 'UNKNOWN';

export interface MarketQuote {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  category: MarketCategory;
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

export interface MarketOverview {
  quotes: MarketQuote[];
  fetchedAt: string;
  requestedSymbols: number;
  resolvedSymbols: number;
  /** True when some symbols failed; the UI says so rather than implying a full snapshot. */
  partial: boolean;
  usdTry: number;
  marketState: MarketState;
}

// ── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'PRICE_ALERT'
  | 'PORTFOLIO_UPDATE'
  | 'NEWS'
  | 'SYSTEM'
  | 'COMPARISON_RESULT';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsPage {
  content: AppNotification[];
  totalElements: number;
  unreadCount: number;
  page: number;
  size: number;
  totalPages: number;
}

// ── Price alerts ────────────────────────────────────────────────────────────

export type AlertDirection = 'ABOVE' | 'BELOW';
export type AlertStatus = 'ACTIVE' | 'TRIGGERED' | 'CANCELLED' | 'EXPIRED';

export interface PriceAlert {
  id: string;
  symbol: string;
  symbolName: string;
  targetPrice: number;
  direction: AlertDirection;
  status: AlertStatus;
  message?: string | null;
  notifyEmail: boolean;
  notifyPush: boolean;
  triggeredAt?: string | null;
  triggeredPrice?: number | null;
  expiresAt?: string | null;
  createdAt: string;
  currentPrice: number;
  distancePercent: number;
}

export interface AlertsResponse {
  content: PriceAlert[];
  triggeredCount: number;
}

export interface CreateAlertRequest {
  symbol: string;
  symbolName?: string;
  targetPrice: number;
  direction: AlertDirection;
  message?: string;
  expiresAt?: string;
}

export interface UpdateAlertRequest {
  targetPrice?: number;
  direction?: AlertDirection;
  status?: 'ACTIVE' | 'CANCELLED';
}
