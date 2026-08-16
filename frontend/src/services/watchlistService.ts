import api from './api';
import { normalizeWatchlist } from '@/lib/api-normalizers';
import type { UpdateWatchlistItemRequest, WatchlistItem } from '@/types';

const WATCHLIST_TIMEOUT_MS = 20000;

export const watchlistService = {
  async getWatchlist(): Promise<WatchlistItem[]> {
    const res = await api.get<WatchlistItem[]>('/watchlist', { timeout: WATCHLIST_TIMEOUT_MS });
    return normalizeWatchlist(res.data);
  },

  async addSymbol(symbol: string, symbolName?: string, notes?: string) {
    const res = await api.post<{ id: string; symbol: string; symbolName: string; exchange: string }>(
      '/watchlist',
      { symbol, symbolName, notes }
    );
    return res.data;
  },

  async updateItem(id: string, data: UpdateWatchlistItemRequest): Promise<void> {
    await api.patch(`/watchlist/${id}`, data);
  },

  async removeSymbol(id: string): Promise<void> {
    await api.delete(`/watchlist/${id}`);
  },
};
