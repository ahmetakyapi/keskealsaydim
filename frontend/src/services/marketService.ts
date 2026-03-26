import api from './api';
import { normalizeMarketOverview } from '@/lib/api-normalizers';
import type { MarketOverview } from '@/types';

const MARKET_OVERVIEW_TIMEOUT_MS = 20000;

export const marketService = {
  async getOverview(): Promise<MarketOverview> {
    const response = await api.get<MarketOverview>('/market/overview', {
      timeout: MARKET_OVERVIEW_TIMEOUT_MS,
    });
    return normalizeMarketOverview(response.data);
  },
};
