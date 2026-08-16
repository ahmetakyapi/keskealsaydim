import api from './api';
import { normalizePortfolioSummary } from '@/lib/api-normalizers';
import type {
  AddInvestmentRequest,
  PortfolioSummary,
  SellInvestmentRequest,
  SellInvestmentResponse,
  UpdateInvestmentRequest,
} from '@/types';

// Quotes are fetched server-side for every holding, so this call is slower
// than a plain database read.
const PORTFOLIO_TIMEOUT_MS = 20000;

export const portfolioService = {
  async getPortfolio(): Promise<PortfolioSummary> {
    const res = await api.get<PortfolioSummary>('/portfolio', { timeout: PORTFOLIO_TIMEOUT_MS });
    return normalizePortfolioSummary(res.data);
  },

  async addInvestment(data: AddInvestmentRequest): Promise<{ id: string; symbol: string; currency: string }> {
    const res = await api.post<{ id: string; symbol: string; currency: string }>('/portfolio', data);
    return res.data;
  },

  async updateInvestment(id: string, data: UpdateInvestmentRequest): Promise<void> {
    await api.put(`/portfolio/${id}`, data);
  },

  async sellInvestment(id: string, data: SellInvestmentRequest): Promise<SellInvestmentResponse> {
    const res = await api.patch<SellInvestmentResponse>(`/portfolio/${id}?action=sell`, data);
    return res.data;
  },

  async deleteInvestment(id: string): Promise<void> {
    await api.delete(`/portfolio/${id}`);
  },
};
