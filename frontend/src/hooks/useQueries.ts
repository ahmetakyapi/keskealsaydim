import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { subtractYears, toISODate, TODAY_ISO } from '@/lib/utils';
import { portfolioService } from '@/services/portfolioService';
import { marketService } from '@/services/marketService';
import { watchlistService } from '@/services/watchlistService';
import { userService } from '@/services/userService';
import { compareService } from '@/services/compareService';
import { stockService } from '@/services/stockService';
import { alertService, notificationService } from '@/services/notificationService';
import type { UpdateProfileRequest } from '@/services/userService';
import type {
  AddInvestmentRequest,
  CompareRequest,
  CreateAlertRequest,
  PortfolioSummary,
  SellInvestmentRequest,
  UpdateAlertRequest,
  UpdateInvestmentRequest,
  UpdateWatchlistItemRequest,
  WatchlistItem,
} from '@/types';

/**
 * Refresh cadence. The UI advertises live prices, so quote-backed queries
 * poll; everything else is invalidated on write instead.
 */
const LIVE_REFETCH_MS = 60_000;
const MARKET_REFETCH_MS = 120_000;

// ── Query keys ──────────────────────────────────────────────────────────────

export const queryKeys = {
  portfolio: ['portfolio'] as const,
  market: ['market-overview'] as const,
  watchlist: ['watchlist'] as const,
  userProfile: ['user-profile'] as const,
  notifications: (page: number, unreadOnly: boolean) =>
    ['notifications', page, unreadOnly] as const,
  notificationsRoot: ['notifications'] as const,
  alerts: ['alerts'] as const,
  compareHistory: (page: number, size: number, favoritesOnly: boolean) =>
    ['compare-history', page, size, favoritesOnly] as const,
  compareHistoryRoot: ['compare-history'] as const,
  sharedScenario: (token: string) => ['shared-scenario', token] as const,
  stockSearch: (query: string) => ['stock-search', query] as const,
  stockQuote: (symbol: string) => ['stock-quote', symbol] as const,
  stockHistory: (symbol: string, from: string, to: string, interval: string) =>
    ['stock-history', symbol, from, to, interval] as const,
} as const;

// ── Queries ─────────────────────────────────────────────────────────────────

export function usePortfolio() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.portfolio,
    queryFn: () => portfolioService.getPortfolio(),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: LIVE_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useMarketOverview() {
  return useQuery({
    queryKey: queryKeys.market,
    queryFn: () => marketService.getOverview(),
    staleTime: 60_000,
    refetchInterval: MARKET_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useWatchlist() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.watchlist,
    queryFn: () => watchlistService.getWatchlist(),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: LIVE_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useUserProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.userProfile,
    queryFn: async () => {
      const profile = await userService.getMe();
      // Keep the persisted auth store in step so the shell (name, avatar,
      // unread badge) never disagrees with the settings screen.
      useAuthStore.getState().updateUser(profile);
      return profile;
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useNotifications(page = 0, unreadOnly = false) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.notifications(page, unreadOnly),
    queryFn: () => notificationService.list(page, 20, unreadOnly),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useAlerts() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: () => alertService.list(),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useCompareHistory(page = 0, size = 10, favoritesOnly = false) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.compareHistory(page, size, favoritesOnly),
    queryFn: () => compareService.getHistory(page, size, favoritesOnly),
    enabled: isAuthenticated,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

/**
 * The landing page's live sample. Modelled as a query rather than a mutation
 * so the inputs live in the cache key: switching presets cannot race, and
 * going back to one the visitor already viewed is instant.
 */
export function useDemoComparison(
  symbolA: string,
  symbolB: string,
  years: number,
  amount = 10_000
) {
  return useQuery({
    queryKey: ['demo-comparison', symbolA, symbolB, years, amount] as const,
    queryFn: () =>
      compareService.compare({
        symbolA,
        symbolB,
        startDate: toISODate(subtractYears(new Date(), years)),
        endDate: TODAY_ISO(),
        amount,
        amountType: 'MONEY',
      }),
    enabled: Boolean(symbolA && symbolB && symbolA !== symbolB),
    staleTime: 15 * 60_000,
    retry: 1,
    placeholderData: (previous) => previous,
  });
}

export function useSharedScenario(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sharedScenario(token ?? ''),
    queryFn: () => compareService.getShared(token as string),
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useStockSearch(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: queryKeys.stockSearch(trimmed),
    queryFn: () => stockService.search(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useStockQuote(symbol: string | undefined) {
  return useQuery({
    queryKey: queryKeys.stockQuote(symbol ?? ''),
    queryFn: () => stockService.getPrice(symbol as string),
    enabled: Boolean(symbol),
    staleTime: 30_000,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useStockHistory(
  symbol: string | undefined,
  from: string,
  to: string,
  interval = '1d'
) {
  return useQuery({
    queryKey: queryKeys.stockHistory(symbol ?? '', from, to, interval),
    queryFn: () => stockService.getHistory(symbol as string, from, to, interval),
    enabled: Boolean(symbol),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

// ── Portfolio mutations ─────────────────────────────────────────────────────

export function useAddInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddInvestmentRequest) => portfolioService.addInvestment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio });
    },
  });
}

export function useUpdateInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvestmentRequest }) =>
      portfolioService.updateInvestment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio });
    },
  });
}

export function useSellInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SellInvestmentRequest }) =>
      portfolioService.sellInvestment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio });
    },
  });
}

/**
 * Removes the row from the cache before the request resolves so the table does
 * not sit there showing a position the user just deleted, and puts it back if
 * the call fails.
 */
export function useDeleteInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => portfolioService.deleteInvestment(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.portfolio });
      const previous = queryClient.getQueryData<PortfolioSummary>(queryKeys.portfolio);

      if (previous) {
        queryClient.setQueryData<PortfolioSummary>(queryKeys.portfolio, {
          ...previous,
          holdings: previous.holdings.filter((holding) => holding.id !== id),
          openInvestments: Math.max(0, previous.openInvestments - 1),
        });
      }

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.portfolio, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio });
    },
  });
}

// ── Watchlist mutations ─────────────────────────────────────────────────────

export function useAddWatchlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { symbol: string; symbolName?: string; notes?: string }) =>
      watchlistService.addSymbol(params.symbol, params.symbolName, params.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist });
    },
  });
}

export function useUpdateWatchlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWatchlistItemRequest }) =>
      watchlistService.updateItem(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlist });
      const previous = queryClient.getQueryData<WatchlistItem[]>(queryKeys.watchlist);

      if (previous) {
        queryClient.setQueryData<WatchlistItem[]>(
          queryKeys.watchlist,
          previous.map((item) => (item.id === id ? { ...item, ...data } : item))
        );
      }

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.watchlist, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist });
    },
  });
}

export function useRemoveWatchlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => watchlistService.removeSymbol(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlist });
      const previous = queryClient.getQueryData<WatchlistItem[]>(queryKeys.watchlist);

      if (previous) {
        queryClient.setQueryData<WatchlistItem[]>(
          queryKeys.watchlist,
          previous.filter((item) => item.id !== id)
        );
      }

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.watchlist, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist });
    },
  });
}

// ── Compare mutations ───────────────────────────────────────────────────────

export function useCompare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CompareRequest) => compareService.compare(data),
    onSuccess: (_result, variables) => {
      if (variables.saveScenario) {
        queryClient.invalidateQueries({ queryKey: queryKeys.compareHistoryRoot });
      }
    },
  });
}

export function useUpdateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { isFavorite?: boolean; title?: string; notes?: string };
    }) => compareService.updateScenario(id, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.compareHistoryRoot });
    },
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => compareService.deleteScenario(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.compareHistoryRoot });
    },
  });
}

// ── Notification & alert mutations ──────────────────────────────────────────

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id?: string) => notificationService.markRead(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsRoot });
      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id?: string) => notificationService.remove(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsRoot });
      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile });
    },
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAlertRequest) => alertService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAlertRequest }) =>
      alertService.update(id, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => alertService.remove(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

// ── Profile mutations ───────────────────────────────────────────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => userService.updateMe(data),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.userProfile, profile);
      useAuthStore.getState().updateUser(profile);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: userService.changePassword,
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: ({ password, confirm }: { password: string; confirm: string }) =>
      userService.deleteAccount(password, confirm),
  });
}
