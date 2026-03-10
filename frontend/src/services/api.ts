import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { RefreshResponse } from '@/types';
import { useAuthStore } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_GET_RETRIES = 2;

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
  _networkRetryCount?: number;
};

let refreshRequest: Promise<RefreshResponse> | null = null;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shouldRetryRequest(error: AxiosError, request: RetriableRequestConfig) {
  const method = (request.method ?? 'get').toLowerCase();
  if (method !== 'get') {
    return false;
  }

  if ((request._networkRetryCount ?? 0) >= MAX_GET_RETRIES) {
    return false;
  }

  if (request.url?.includes('/auth/refresh')) {
    return false;
  }

  if (error.code === 'ECONNABORTED' || !error.response) {
    return true;
  }

  return RETRYABLE_STATUSES.has(error.response.status);
}

async function refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
  if (!refreshRequest) {
    refreshRequest = axios
      .post<RefreshResponse>(`${API_URL}/auth/refresh`, {
        refreshToken,
      })
      .then((response) => {
        const payload = response.data;
        const currentUser = payload.user ?? useAuthStore.getState().user;

        if (currentUser) {
          useAuthStore.getState().setAuth(currentUser, payload.accessToken, payload.refreshToken);
        } else {
          useAuthStore.setState({
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        }

        return payload;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (shouldRetryRequest(error, originalRequest)) {
      originalRequest._networkRetryCount = (originalRequest._networkRetryCount ?? 0) + 1;
      await wait(250 * originalRequest._networkRetryCount);
      return api(originalRequest);
    }

    // If 401 and not already retrying auth refresh
    if (error.response?.status === 401 && !originalRequest._authRetry) {
      originalRequest._authRetry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const refreshed = await refreshAccessToken(refreshToken);
          const { accessToken } = refreshed;

          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
