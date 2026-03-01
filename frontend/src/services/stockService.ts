import api from './api';
import type { StockPrice, StockSearchResult, StockHistory } from '@/types';

export const stockService = {
  async search(query: string): Promise<StockSearchResult[]> {
    const response = await api.get<StockSearchResult[]>('/stocks/search', {
      params: { q: query },
    });
    return response.data;
  },

  async getPrice(symbol: string): Promise<StockPrice> {
    const response = await api.get<StockPrice>(`/stocks/${symbol}/price`);
    return response.data;
  },

  async getHistory(
    symbol: string,
    from: string,
    to: string,
    interval = '1d'
  ): Promise<StockHistory> {
    const response = await api.get<StockHistory>(`/stocks/${symbol}/history`, {
      params: { from, to, interval },
    });
    return response.data;
  },
};
