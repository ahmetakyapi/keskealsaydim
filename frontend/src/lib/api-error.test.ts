import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiErrorMessage, isRetryableError } from './api-error';

function axiosError(options: { status?: number; data?: unknown; code?: string }): AxiosError {
  const error = new AxiosError('Network Error', options.code);
  if (options.status !== undefined) {
    error.response = {
      status: options.status,
      statusText: '',
      data: options.data,
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
  }
  return error;
}

/**
 * The backend already speaks Turkish; the job here is to make sure axios's
 * English transport strings ("Network Error", "timeout of 15000ms exceeded")
 * never reach the screen.
 */

describe('getApiErrorMessage', () => {
  it('prefers the backend message, which is the most specific', () => {
    const message = getApiErrorMessage(
      axiosError({ status: 400, data: { error: 'Adet pozitif olmalı' } })
    );
    expect(message).toBe('Adet pozitif olmalı');
  });

  it('translates a transport failure instead of showing "Network Error"', () => {
    const message = getApiErrorMessage(axiosError({ code: 'ERR_NETWORK' }));
    expect(message).toContain('İnternet bağlantısı');
    expect(message).not.toContain('Network');
  });

  it('translates a timeout', () => {
    expect(getApiErrorMessage(axiosError({ code: 'ECONNABORTED' }))).toContain('zamanında yanıt');
  });

  it('falls back to a status-specific Turkish message', () => {
    expect(getApiErrorMessage(axiosError({ status: 429 }))).toContain('Çok fazla istek');
    expect(getApiErrorMessage(axiosError({ status: 503 }))).toContain('kullanılamıyor');
  });

  it('ignores an HTML error page rather than dumping markup on screen', () => {
    const message = getApiErrorMessage(
      axiosError({ status: 500, data: '<!DOCTYPE html><html>...' })
    );
    expect(message).not.toContain('<');
    expect(message).toContain('Sunucuda');
  });

  it('uses the supplied fallback for an unknown failure', () => {
    expect(getApiErrorMessage({}, 'Özel mesaj')).toBe('Özel mesaj');
  });

  it('passes through an Error the app itself threw in Turkish', () => {
    expect(getApiErrorMessage(new Error('Sembol geçersiz'))).toBe('Sembol geçersiz');
  });

  it('does not surface an English Error message', () => {
    const message = getApiErrorMessage(new Error('Something broke'));
    expect(message).not.toBe('Something broke');
  });
});

describe('isRetryableError', () => {
  it('offers retry for transport and server failures', () => {
    expect(isRetryableError(axiosError({ code: 'ERR_NETWORK' }))).toBe(true);
    expect(isRetryableError(axiosError({ status: 503 }))).toBe(true);
  });

  it('does not offer retry for a client mistake', () => {
    expect(isRetryableError(axiosError({ status: 400 }))).toBe(false);
    expect(isRetryableError(new Error('x'))).toBe(false);
  });
});
