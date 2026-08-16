import api from './api';
import type { AlertsResponse, CreateAlertRequest, NotificationsPage, PriceAlert, UpdateAlertRequest } from '@/types';

export const notificationService = {
  async list(page = 0, size = 20, unreadOnly = false): Promise<NotificationsPage> {
    const res = await api.get<NotificationsPage>('/notifications', {
      params: { page, size, unreadOnly: unreadOnly ? 'true' : undefined },
    });
    return res.data;
  },

  /** Marks a single notification read, or every unread one when id is omitted. */
  async markRead(id?: string): Promise<void> {
    await api.patch(id ? `/notifications/${id}` : '/notifications');
  },

  async remove(id?: string): Promise<void> {
    await api.delete(id ? `/notifications/${id}` : '/notifications');
  },
};

export const alertService = {
  async list(): Promise<AlertsResponse> {
    const res = await api.get<AlertsResponse>('/alerts');
    return res.data;
  },

  async create(data: CreateAlertRequest): Promise<Pick<PriceAlert, 'id' | 'symbol'>> {
    const res = await api.post<Pick<PriceAlert, 'id' | 'symbol'>>('/alerts', data);
    return res.data;
  },

  async update(id: string, data: UpdateAlertRequest): Promise<void> {
    await api.patch(`/alerts/${id}`, data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/alerts/${id}`);
  },
};
