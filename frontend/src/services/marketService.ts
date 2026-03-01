import api from './api';
import type { MarketOverview } from '@/types';

export const marketService = {
  async getOverview(): Promise<MarketOverview> {
    const response = await api.get<MarketOverview>('/market/overview');
    return response.data;
  },
};
