import api from './api';
import type { WatchlistItem } from '@/types';

export const watchlistService = {
  async getWatchlist(): Promise<WatchlistItem[]> {
    const res = await api.get<WatchlistItem[]>('/watchlist');
    return res.data;
  },

  async addSymbol(symbol: string, symbolName?: string): Promise<{ id: string; symbol: string }> {
    const res = await api.post<{ id: string; symbol: string }>('/watchlist', { symbol, symbolName });
    return res.data;
  },

  async removeSymbol(id: string): Promise<void> {
    await api.delete(`/watchlist/${id}`);
  },
};
