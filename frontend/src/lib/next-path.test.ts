import { describe, expect, it } from 'vitest';
import { safeNextPath } from './next-path';

describe('safeNextPath', () => {
  it('keeps an internal path with its query', () => {
    expect(safeNextPath('/compare?a=THYAO&b=ASELS')).toBe('/compare?a=THYAO&b=ASELS');
  });

  it('falls back to the dashboard without a destination', () => {
    expect(safeNextPath(null)).toBe('/dashboard');
    expect(safeNextPath('')).toBe('/dashboard');
  });

  it('refuses anything that leaves the site', () => {
    expect(safeNextPath('https://example.com')).toBe('/dashboard');
    expect(safeNextPath('//example.com')).toBe('/dashboard');
    expect(safeNextPath('/\\example.com')).toBe('/dashboard');
  });
});
