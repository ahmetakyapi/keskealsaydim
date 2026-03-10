import api from './api';
import type { AuthResponse, LoginRequest, RefreshResponse, RegisterRequest } from '@/types';

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const response = await api.post<RefreshResponse>('/auth/refresh', { refreshToken });
    return response.data;
  },

  async logout(refreshToken?: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },
};
