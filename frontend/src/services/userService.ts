import api from './api';
import type { User } from '@/types';

export interface UpdateProfileRequest {
  name?: string;
  experienceLevel?: string;
  preferredCurrency?: string;
  theme?: string;
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
};
