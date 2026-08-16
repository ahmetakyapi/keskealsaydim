import axios from 'axios';

type ErrorLikePayload = {
  error?: string;
  message?: string;
  detail?: string;
};

const DEFAULT_MESSAGE = 'Bir hata oluştu. Lütfen tekrar deneyin.';

/**
 * Axios surfaces transport failures with English strings ("Network Error",
 * "timeout of 15000ms exceeded"). Those reached the UI verbatim, so they are
 * translated here rather than shown raw.
 */
const TRANSPORT_MESSAGES: Record<string, string> = {
  ERR_NETWORK: 'İnternet bağlantısı kurulamadı. Bağlantınızı kontrol edip tekrar deneyin.',
  ECONNABORTED: 'Sunucu zamanında yanıt vermedi. Lütfen tekrar deneyin.',
  ETIMEDOUT: 'Sunucu zamanında yanıt vermedi. Lütfen tekrar deneyin.',
  ERR_CANCELED: 'İstek iptal edildi.',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Gönderilen bilgiler geçersiz.',
  401: 'Oturumunuz doğrulanamadı. Lütfen tekrar giriş yapın.',
  403: 'Bu işlem için yetkiniz yok.',
  404: 'Aradığınız kayıt bulunamadı.',
  409: 'Bu kayıt zaten mevcut.',
  429: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.',
  500: 'Sunucuda beklenmeyen bir hata oluştu.',
  502: 'Sunucuya ulaşılamıyor. Lütfen birazdan tekrar deneyin.',
  503: 'Servis şu anda kullanılamıyor. Lütfen birazdan tekrar deneyin.',
  504: 'Sunucu zamanında yanıt vermedi. Lütfen tekrar deneyin.',
};

function normalizePayloadMessage(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const text = payload.trim();
    // An HTML error page is not a message worth showing.
    return text.length > 0 && !text.startsWith('<') ? text : null;
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

export function getApiErrorMessage(err: unknown, fallback = DEFAULT_MESSAGE): string {
  if (axios.isAxiosError(err)) {
    // The backend's own Turkish message is always the most specific.
    const fromPayload = normalizePayloadMessage(err.response?.data);
    if (fromPayload) {
      return fromPayload;
    }

    if (err.response?.status && STATUS_MESSAGES[err.response.status]) {
      return STATUS_MESSAGES[err.response.status];
    }

    if (err.code && TRANSPORT_MESSAGES[err.code]) {
      return TRANSPORT_MESSAGES[err.code];
    }

    if (!err.response) {
      return TRANSPORT_MESSAGES.ERR_NETWORK;
    }
  }

  if (err instanceof Error && err.message.trim().length > 0 && !/^[\x20-\x7E]*$/.test(err.message)) {
    // Only pass through messages that already contain non-ASCII — i.e. ones
    // written in Turkish by our own code.
    return err.message.trim();
  }

  return fallback;
}

/** True when the failure is worth offering a "try again" affordance for. */
export function isRetryableError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (!err.response) return true;
  return [408, 429, 500, 502, 503, 504].includes(err.response.status);
}
