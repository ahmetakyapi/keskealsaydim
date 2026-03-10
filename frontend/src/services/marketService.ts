import api from './api';
import { normalizeMarketOverview } from '@/lib/api-normalizers';
import type { MarketOverview } from '@/types';

export const marketService = {
  async getOverview(): Promise<MarketOverview> {
    const response = await api.get<MarketOverview>('/market/overview');
    return normalizeMarketOverview(response.data);
  },
};
