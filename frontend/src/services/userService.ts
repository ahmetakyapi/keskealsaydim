import api from './api';
import type { ChartPeriod, ExperienceLevel, User, UserSettings } from '@/types';

export interface UpdateProfileRequest {
  name?: string;
  experienceLevel?: ExperienceLevel;
  preferredCurrency?: string;
  theme?: string;
  settings?: Partial<Omit<UserSettings, 'defaultChartPeriod'>> & {
    defaultChartPeriod?: ChartPeriod;
  };
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const userService = {
  async getMe(): Promise<User> {
    const res = await api.get<User>('/users/me');
    return res.data;
  },

  async updateMe(data: UpdateProfileRequest): Promise<User> {
    const res = await api.put<User>('/users/me', data);
    return res.data;
  },

  /** Succeeds only after re-authentication: every session is revoked. */
  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/users/password', data);
    return res.data;
  },

  async deleteAccount(password: string, confirm: string): Promise<void> {
    await api.delete('/users/me', { data: { password, confirm } });
  },
};
