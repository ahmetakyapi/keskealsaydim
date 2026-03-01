import api from './api';
import type { CompareRequest, CompareResponse } from '@/types';

export const compareService = {
  async compare(data: CompareRequest): Promise<CompareResponse> {
    const response = await api.post<CompareResponse>('/compare', data);
    return response.data;
  },

  async getHistory(page = 0, size = 10) {
    const response = await api.get('/compare/history', {
      params: { page, size },
    });
    return response.data;
  },

  async getShared(shareToken: string): Promise<CompareResponse> {
    const response = await api.get<CompareResponse>(`/compare/shared/${shareToken}`);
    return response.data;
  },
};
