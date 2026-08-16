import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { RefreshResponse } from '@/types';
import { useAuthStore } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_GET_RETRIES = 2;
const REFRESH_TIMEOUT_MS = 10_000;

/**
 * Endpoints that legitimately answer 401 as part of their normal contract.
 * A 401 from `/auth/login` means "wrong password", not "your session
 * expired" — treating it as the latter reloaded the page and threw away the
 * user's typed credentials along with the error message.
 */
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/users/password'];

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
  _networkRetryCount?: number;
};

let refreshRequest: Promise<RefreshResponse> | null = null;
let isLoggingOut = false;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isAuthEndpoint(url?: string) {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

/**
 * Ends the session and sends the user to the login screen, preserving where
 * they were so they land back there after signing in.
 */
export function forceLogout(reason?: string) {
  if (isLoggingOut) return;
  isLoggingOut = true;

  useAuthStore.getState().logout();

  const current = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams();
  if (current && current !== '/' && !current.startsWith('/login')) {
    params.set('next', current);
  }
  if (reason) {
    params.set('reason', reason);
  }

  const query = params.toString();
  window.location.replace(`/login${query ? `?${query}` : ''}`);
}

function shouldRetryRequest(error: AxiosError, request: RetriableRequestConfig) {
  const method = (request.method ?? 'get').toLowerCase();
  if (method !== 'get') {
    return false;
  }
  if ((request._networkRetryCount ?? 0) >= MAX_GET_RETRIES) {
    return false;
  }
  if (isAuthEndpoint(request.url)) {
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
      .post<RefreshResponse>(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        // Without a timeout an unresponsive refresh call blocks every queued
        // request in the app indefinitely.
        { timeout: REFRESH_TIMEOUT_MS }
      )
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
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (shouldRetryRequest(error, originalRequest)) {
      originalRequest._networkRetryCount = (originalRequest._networkRetryCount ?? 0) + 1;
      await wait(300 * originalRequest._networkRetryCount);
      return api(originalRequest);
    }

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Let the calling screen render the server's message.
    if (isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (originalRequest._authRetry) {
      // The refreshed token was rejected too — the session is genuinely gone.
      forceLogout('expired');
      return Promise.reject(error);
    }

    originalRequest._authRetry = true;

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      forceLogout('expired');
      return Promise.reject(error);
    }

    try {
      const refreshed = await refreshAccessToken(refreshToken);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
      return await api(originalRequest);
    } catch (refreshError) {
      forceLogout('expired');
      return Promise.reject(refreshError);
    }
  }
);

/**
 * Keeps sibling tabs in step. Token rotation in one tab invalidates the
 * refresh token the others hold; without this the next call from a background
 * tab would 401 and log the user out of every tab at once.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== 'yoa-auth' || !event.newValue) return;

    try {
      const parsed = JSON.parse(event.newValue) as {
        state?: { accessToken?: string | null; refreshToken?: string | null; isAuthenticated?: boolean };
      };
      const next = parsed.state;
      if (!next) return;

      const current = useAuthStore.getState();
      if (next.accessToken && next.accessToken !== current.accessToken) {
        useAuthStore.setState({
          accessToken: next.accessToken,
          refreshToken: next.refreshToken ?? null,
          isAuthenticated: Boolean(next.isAuthenticated),
        });
      } else if (!next.isAuthenticated && current.isAuthenticated) {
        useAuthStore.getState().logout();
      }
    } catch {
      /* a malformed payload is not worth breaking the tab over */
    }
  });
}

export default api;
