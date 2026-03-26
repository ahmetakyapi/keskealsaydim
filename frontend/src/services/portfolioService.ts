import api from './api';
import { normalizePortfolioSummary } from '@/lib/api-normalizers';
import type { PortfolioSummary, AddInvestmentRequest } from '@/types';

const PORTFOLIO_TIMEOUT_MS = 15000;

export const portfolioService = {
  async getPortfolio(): Promise<PortfolioSummary> {
    const res = await api.get<PortfolioSummary>('/portfolio', {
      timeout: PORTFOLIO_TIMEOUT_MS,
    });
    return normalizePortfolioSummary(res.data);
  },

  async addInvestment(data: AddInvestmentRequest): Promise<{ id: string; symbol: string }> {
    const res = await api.post<{ id: string; symbol: string }>('/portfolio', data);
    return res.data;
  },

  async deleteInvestment(id: string): Promise<void> {
    await api.delete(`/portfolio/${id}`);
  },
};
