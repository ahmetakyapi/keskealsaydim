import api from './api';
import type { CompareRequest, CompareResponse, ScenariosPage, SharedScenario } from '@/types';

// Comparison fetches two price histories plus FX series server-side.
const COMPARE_TIMEOUT_MS = 25000;

export const compareService = {
  async compare(data: CompareRequest): Promise<CompareResponse> {
    const res = await api.post<CompareResponse>('/compare', data, { timeout: COMPARE_TIMEOUT_MS });
    return res.data;
  },

  async getHistory(page = 0, size = 10, favoritesOnly = false): Promise<ScenariosPage> {
    const res = await api.get<ScenariosPage>('/compare/history', {
      params: { page, size, favoritesOnly: favoritesOnly ? 'true' : undefined },
    });
    return res.data;
  },

  async updateScenario(
    id: string,
    data: { isFavorite?: boolean; title?: string; notes?: string }
  ): Promise<void> {
    await api.patch(`/compare/scenarios/${id}`, data);
  },

  async deleteScenario(id: string): Promise<void> {
    await api.delete(`/compare/scenarios/${id}`);
  },

  async getShared(shareToken: string): Promise<SharedScenario> {
    const res = await api.get<SharedScenario>(`/compare/shared/${encodeURIComponent(shareToken)}`);
    return res.data;
  },
};
