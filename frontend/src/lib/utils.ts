import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function normalizeFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

// Format currency in Turkish Lira
export function formatCurrency(value: number, currency = 'TRY'): string {
  const safeValue = normalizeFiniteNumber(value);
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

// Format number with Turkish locale
export function formatNumber(value: number, decimals = 2): string {
  const safeValue = normalizeFiniteNumber(value);
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safeValue);
}

// Format percentage
export function formatPercent(value: number): string {
  const safeValue = normalizeFiniteNumber(value);
  const sign = safeValue >= 0 ? '+' : '';
  return `${sign}${formatNumber(safeValue)}%`;
}

// Format large numbers (K, M, B)
export function formatCompact(value: number): string {
  const safeValue = normalizeFiniteNumber(value);

  try {
    return new Intl.NumberFormat('tr-TR', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(safeValue);
  } catch {
    const absoluteValue = Math.abs(safeValue);
    const units = [
      { threshold: 1e12, suffix: 'Tn' },
      { threshold: 1e9, suffix: 'Mr' },
      { threshold: 1e6, suffix: 'Mn' },
      { threshold: 1e3, suffix: 'Bin' },
    ];

    for (const unit of units) {
      if (absoluteValue >= unit.threshold) {
        const compactValue = safeValue / unit.threshold;
        return `${formatNumber(compactValue, 1)} ${unit.suffix}`;
      }
    }

    return formatNumber(safeValue, 0);
  }
}

// Format date in Turkish locale
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

// Format date with time
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Az önce';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`;

  return formatDate(date);
}

// Get change color class
export function getChangeColor(value: number): string {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-danger';
  return 'text-muted-foreground';
}

// Get change background class
export function getChangeBgColor(value: number): string {
  if (value > 0) return 'bg-success/10 text-success';
  if (value < 0) return 'bg-danger/10 text-danger';
  return 'bg-muted text-muted-foreground';
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  waitFor: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

// Sleep function
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate random string
export function generateId(length = 8): string {
  return Math.random().toString(36).substring(2, length + 2);
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.substring(0, length)}...`;
}
