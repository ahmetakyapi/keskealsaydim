import api from './api';
import type { CompareRequest, CompareResponse, ScenariosPage } from '@/types';

export const compareService = {
  async compare(data: CompareRequest): Promise<CompareResponse> {
    const res = await api.post<CompareResponse>('/compare', data);
    return res.data;
  },

  async getHistory(page = 0, size = 10): Promise<ScenariosPage> {
    const res = await api.get<ScenariosPage>('/compare/history', { params: { page, size } });
    return res.data;
  },

  async getShared(shareToken: string): Promise<CompareResponse> {
    const res = await api.get<CompareResponse>(`/compare/shared/${shareToken}`);
    return res.data;
  },
};
