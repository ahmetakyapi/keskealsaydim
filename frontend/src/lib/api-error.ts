import axios from 'axios';

type ErrorLikePayload = {
  error?: string;
  message?: string;
  detail?: string;
};

function normalizePayloadMessage(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const text = payload.trim();
    return text.length > 0 ? text : null;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as ErrorLikePayload;
  const message = candidate.error ?? candidate.message ?? candidate.detail;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }

  return null;
}

export function getApiErrorMessage(
  err: unknown,
  fallback = 'Bir hata oluştu. Lütfen tekrar deneyin.'
): string {
  if (axios.isAxiosError(err)) {
    const fromPayload = normalizePayloadMessage(err.response?.data);
    if (fromPayload) {
      return fromPayload;
    }

    if (typeof err.message === 'string' && err.message.trim().length > 0) {
      return err.message.trim();
    }
  }

  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message.trim();
  }

  return fallback;
}
