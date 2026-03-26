import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { portfolioService } from '@/services/portfolioService';
import { marketService } from '@/services/marketService';
import { watchlistService } from '@/services/watchlistService';
import { userService } from '@/services/userService';
import { compareService } from '@/services/compareService';
import { stockService } from '@/services/stockService';
import type { UpdateProfileRequest } from '@/services/userService';
import type { AddInvestmentRequest, CompareRequest } from '@/types';

// ── Query Keys ──────────────────────────────────────────────────────────────

export const queryKeys = {
  portfolio: ['portfolio'] as const,
  market: ['market-overview'] as const,
  watchlist: ['watchlist'] as const,
  userProfile: ['user-profile'] as const,
  compareHistory: (page: number, size: number) =>
    ['compare-history', page, size] as const,
  stockSearch: (query: string) => ['stock-search', query] as const,
} as const;

// ── Query Hooks ─────────────────────────────────────────────────────────────

export function usePortfolio() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.portfolio,
    queryFn: () => portfolioService.getPortfolio(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useMarketOverview() {
  return useQuery({
    queryKey: queryKeys.market,
    queryFn: () => marketService.getOverview(),
    staleTime: 2 * 60_000,
  });
}

export function useWatchlist() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.watchlist,
    queryFn: () => watchlistService.getWatchlist(),
    enabled: isAuthenticated,
  });
}

export function useUserProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.userProfile,
    queryFn: () => userService.getMe(),
    enabled: isAuthenticated,
  });
}

export function useCompareHistory(page = 0, size = 10) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.compareHistory(page, size),
    queryFn: () => compareService.getHistory(page, size),
    enabled: isAuthenticated,
  });
}

export function useStockSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.stockSearch(query),
    queryFn: () => stockService.search(query),
    enabled: query.length >= 2,
  });
}

// ── Mutation Hooks ──────────────────────────────────────────────────────────

export function useAddInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddInvestmentRequest) =>
      portfolioService.addInvestment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio });
    },
  });
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => portfolioService.deleteInvestment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio });
    },
  });
}

export function useAddWatchlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { symbol: string; symbolName?: string }) =>
      watchlistService.addSymbol(params.symbol, params.symbolName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist });
    },
  });
}

export function useRemoveWatchlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => watchlistService.removeSymbol(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist });
    },
  });
}

export function useCompare() {
  return useMutation({
    mutationFn: (data: CompareRequest) => compareService.compare(data),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => userService.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile });
    },
  });
}
