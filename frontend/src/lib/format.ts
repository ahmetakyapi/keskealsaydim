/**
 * Number, money and date formatting for the Turkish locale.
 *
 * Two rules drive the API here:
 *   1. A signed value must render its sign next to the number, never after a
 *      currency symbol — `-₺1.234,00`, not `₺-1.234,00`.
 *   2. A function either adds the sign or it does not, and its name says
 *      which. Callers were double-prefixing `+` because `formatPercent`
 *      already added one.
 */

export const BASE_CURRENCY = 'TRY';

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
  GBX: 'p',
  CHF: 'CHF',
  JPY: '¥',
};

function toFinite(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function currencySymbol(currency = BASE_CURRENCY): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency.toUpperCase();
}

/** Absolute money value with the currency symbol, no sign handling. */
export function formatCurrency(value: number, currency = BASE_CURRENCY): string {
  const safe = toFinite(value);
  const code = currency.toUpperCase();

  // GBX (pence) is not an ISO currency; Intl throws on it.
  if (!/^[A-Z]{3}$/.test(code) || code === 'GBX') {
    return `${formatNumber(safe)} ${currencySymbol(code)}`;
  }

  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${currencySymbol(code)}${formatNumber(safe)}`;
  }
}

/**
 * Money with an explicit sign in front of the symbol. Use for profit/loss,
 * daily change and any figure whose direction matters.
 */
export function formatSignedCurrency(value: number, currency = BASE_CURRENCY): string {
  const safe = toFinite(value);
  const sign = safe < 0 ? '−' : '+';
  return `${sign}${formatCurrency(Math.abs(safe), currency)}`;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(toFinite(value));
}

/** Share prices need more precision than money totals for penny stocks. */
export function formatPrice(value: number, currency = BASE_CURRENCY): string {
  const safe = toFinite(value);
  const decimals = Math.abs(safe) > 0 && Math.abs(safe) < 1 ? 4 : 2;
  const code = currency.toUpperCase();

  if (!/^[A-Z]{3}$/.test(code) || code === 'GBX') {
    return `${formatNumber(safe, decimals)} ${currencySymbol(code)}`;
  }

  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(safe);
  } catch {
    return `${currencySymbol(code)}${formatNumber(safe, decimals)}`;
  }
}

/** Percentage WITH a leading sign. Never prefix `+` at the call site. */
export function formatPercent(value: number, decimals = 2): string {
  const safe = toFinite(value);
  const sign = safe < 0 ? '−' : '+';
  return `${sign}%${formatNumber(Math.abs(safe), decimals)}`;
}

/** Percentage without a sign, for when direction is shown by colour or icon. */
export function formatPercentValue(value: number, decimals = 2): string {
  return `%${formatNumber(toFinite(value), decimals)}`;
}

export function formatCompact(value: number): string {
  const safe = toFinite(value);
  try {
    return new Intl.NumberFormat('tr-TR', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(safe);
  } catch {
    const abs = Math.abs(safe);
    const units = [
      { threshold: 1e12, suffix: 'Tn' },
      { threshold: 1e9, suffix: 'Mr' },
      { threshold: 1e6, suffix: 'Mn' },
      { threshold: 1e3, suffix: 'B' },
    ];
    for (const unit of units) {
      if (abs >= unit.threshold) {
        return `${formatNumber(safe / unit.threshold, 1)} ${unit.suffix}`;
      }
    }
    return formatNumber(safe, 0);
  }
}

export function formatCompactCurrency(value: number, currency = BASE_CURRENCY): string {
  return `${currencySymbol(currency)}${formatCompact(value)}`;
}

// ── Dates ───────────────────────────────────────────────────────────────────

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date): string {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatLongDate(value: string | Date): string {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(value: string | Date, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return '—';

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 0) return formatDateTime(date);
  if (seconds < 45) return 'Az önce';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dakika önce`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün önce`;
  return formatDate(date);
}

/** `2026-08-16` in local time — the format every API date field expects. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const TODAY_ISO = (): string => toISODate(new Date());

/**
 * Subtracts months without the end-of-month overflow `setMonth` produces
 * (31 Mart − 1 ay would otherwise land on 3 Mart).
 */
export function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() - months, 1);
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDayOfTargetMonth));
  return result;
}

export function subtractYears(date: Date, years: number): Date {
  return subtractMonths(date, years * 12);
}

// ── Direction helpers ───────────────────────────────────────────────────────

export type Direction = 'up' | 'down' | 'flat';

export function directionOf(value: number, epsilon = 1e-9): Direction {
  const safe = toFinite(value);
  if (safe > epsilon) return 'up';
  if (safe < -epsilon) return 'down';
  return 'flat';
}

export function changeTextClass(value: number): string {
  switch (directionOf(value)) {
    case 'up':
      return 'text-success';
    case 'down':
      return 'text-danger';
    default:
      return 'text-muted-foreground';
  }
}

export function changeBadgeClass(value: number): string {
  switch (directionOf(value)) {
    case 'up':
      return 'bg-success/12 text-success border-success/25';
    case 'down':
      return 'bg-danger/12 text-danger border-danger/25';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}
