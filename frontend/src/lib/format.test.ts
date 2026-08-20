import { describe, expect, it } from 'vitest';
import {
  changeTextClass,
  currencySymbol,
  directionOf,
  formatCompact,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatPercentValue,
  formatPrice,
  formatRelativeTime,
  formatSignedCurrency,
  subtractMonths,
  subtractYears,
  toISODate,
} from './format';

/**
 * These cover the defects that actually shipped in this app: a loss shown
 * identically to a gain, a doubled plus sign, a USD price labelled in lira,
 * and a date helper that skipped a month.
 */

describe('formatSignedCurrency', () => {
  it('keeps the sign in front of the symbol, not after it', () => {
    // "₺-1.234,00" was the old rendering; the sign has to lead.
    expect(formatSignedCurrency(-1234)).toBe('−₺1.234,00');
    expect(formatSignedCurrency(1234)).toBe('+₺1.234,00');
  });

  it('distinguishes a loss from a gain of the same magnitude', () => {
    expect(formatSignedCurrency(-1234)).not.toBe(formatSignedCurrency(1234));
  });

  it('treats zero as non-negative', () => {
    expect(formatSignedCurrency(0)).toBe('+₺0,00');
  });
});

describe('formatCurrency', () => {
  it('formats lira with the Turkish separators', () => {
    expect(formatCurrency(76249.46)).toBe('₺76.249,46');
  });

  it('honours a non-TRY currency instead of assuming lira', () => {
    const usd = formatCurrency(190, 'USD');
    expect(usd).toContain('190,00');
    expect(usd).not.toContain('₺');
  });

  it('falls back readably for pence, which is not an ISO currency', () => {
    expect(formatCurrency(250, 'GBX')).toBe('250,00 p');
  });

  it('survives a non-finite value rather than printing NaN', () => {
    expect(formatCurrency(Number.NaN)).toBe('₺0,00');
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe('₺0,00');
  });
});

describe('formatPrice', () => {
  it('gives sub-lira prices more precision', () => {
    expect(formatPrice(0.4321)).toBe('₺0,4321');
    expect(formatPrice(305.25)).toBe('₺305,25');
  });
});

describe('percentages', () => {
  it('adds exactly one sign — call sites must not prefix another', () => {
    expect(formatPercent(2.5)).toBe('+%2,50');
    expect(formatPercent(-2.5)).toBe('−%2,50');
    expect(formatPercent(2.5)).not.toContain('++');
  });

  it('omits the sign when direction is conveyed elsewhere', () => {
    expect(formatPercentValue(2.5)).toBe('%2,50');
  });
});

describe('direction helpers', () => {
  it('classifies up, down and flat', () => {
    expect(directionOf(0.5)).toBe('up');
    expect(directionOf(-0.5)).toBe('down');
    expect(directionOf(0)).toBe('flat');
  });

  it('does not colour a flat value as a gain', () => {
    // A 0% row rendering green was one of the audit findings.
    expect(changeTextClass(0)).toBe('text-muted-foreground');
    expect(changeTextClass(1)).toBe('text-success');
    expect(changeTextClass(-1)).toBe('text-danger');
  });
});

describe('currencySymbol', () => {
  it('maps the currencies the app trades in', () => {
    expect(currencySymbol('TRY')).toBe('₺');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('EUR')).toBe('€');
  });

  it('echoes an unknown code rather than inventing a symbol', () => {
    expect(currencySymbol('XYZ')).toBe('XYZ');
  });
});

describe('formatNumber and formatCompact', () => {
  it('uses a comma for decimals and a dot for thousands', () => {
    expect(formatNumber(1234.5)).toBe('1.234,50');
  });

  it('compacts large figures', () => {
    expect(formatCompact(1_500_000)).toMatch(/1,5/);
  });
});

describe('date helpers', () => {
  it('formats an ISO date in Turkish order', () => {
    expect(formatDate('2026-08-20')).toBe('20.08.2026');
  });

  it('returns a dash for an unparseable date instead of "Invalid Date"', () => {
    expect(formatDate('yok')).toBe('—');
  });

  it('builds an ISO date from local time, not UTC', () => {
    expect(toISODate(new Date(2026, 7, 20))).toBe('2026-08-20');
  });

  it('subtracts months without the end-of-month overflow setMonth causes', () => {
    // 31 March minus one month must be 28/29 February, never 3 March.
    expect(toISODate(subtractMonths(new Date(2026, 2, 31), 1))).toBe('2026-02-28');
    expect(toISODate(subtractMonths(new Date(2026, 4, 31), 1))).toBe('2026-04-30');
  });

  it('subtracts whole years', () => {
    expect(toISODate(subtractYears(new Date(2026, 7, 20), 3))).toBe('2023-08-20');
  });

  it('describes recent instants in Turkish', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    expect(formatRelativeTime(new Date('2026-08-20T11:59:50Z'), now)).toBe('Az önce');
    expect(formatRelativeTime(new Date('2026-08-20T11:30:00Z'), now)).toBe('30 dakika önce');
    expect(formatRelativeTime(new Date('2026-08-20T09:00:00Z'), now)).toBe('3 saat önce');
  });
});
