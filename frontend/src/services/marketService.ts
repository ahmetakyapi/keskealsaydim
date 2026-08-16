import api from './api';
import { normalizeMarketOverview } from '@/lib/api-normalizers';
import type { MarketOverview } from '@/types';

// The overview fans out to ~35 symbols server-side.
const MARKET_OVERVIEW_TIMEOUT_MS = 25000;

export const marketService = {
  async getOverview(): Promise<MarketOverview> {
    const response = await api.get<MarketOverview>('/market/overview', {
      timeout: MARKET_OVERVIEW_TIMEOUT_MS,
    });
    return normalizeMarketOverview(response.data);
  },
};
