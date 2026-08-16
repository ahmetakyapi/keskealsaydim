import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatting lives in `format.ts`; re-exported so existing imports of
// `@/lib/utils` keep working.
export * from './format';

/** Motion curve shared by every Framer Motion transition in the app. */
export const EASE_BRAND = [0.22, 1, 0.36, 1] as const;

export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_BRAND },
  },
} as const;

export const staggerChildren = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
} as const;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export function truncate(text: string, length: number): string {
  return text.length <= length ? text : `${text.slice(0, length)}…`;
}

/**
 * Turkish-aware fold for client-side search: lowercase plus diacritic
 * stripping, so "iş" matches "İŞ" and "sise" matches "Şişe".
 */
export function foldTurkish(value: string): string {
  const map: Record<string, string> = {
    ı: 'i', I: 'i', İ: 'i', i: 'i',
    ş: 's', Ş: 's',
    ğ: 'g', Ğ: 'g',
    ü: 'u', Ü: 'u',
    ö: 'o', Ö: 'o',
    ç: 'c', Ç: 'c',
  };
  return Array.from(value.trim())
    .map((char) => map[char] ?? char.toLowerCase())
    .join('');
}

/** Case-folded "does the haystack contain the needle" for Turkish text. */
export function matchesQuery(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return foldTurkish(haystack).includes(foldTurkish(needle));
}

/**
 * Normalises user-typed symbols: upper-cases with the Turkish-safe rule
 * (`i → I`, never `İ`) and keeps the dot in `BRK-B` / `USDTRY=X` style tickers.
 */
export function normalizeSymbolInput(value: string): string {
  return value
    .replace(/[ıi]/g, 'I')
    .toUpperCase()
    .replace(/[^A-Z0-9.\-=^]/g, '');
}

export function debounce<T extends (...args: never[]) => void>(
  func: T,
  waitFor: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };
  return debounced;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Derives up to two initials from a display name, for avatar fallbacks. */
export function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  // Turkish casing: "irem" must initial as "İ", not "I".
  return parts.map((part) => part.charAt(0).toLocaleUpperCase('tr-TR')).join('') || '?';
}
