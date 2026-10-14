/**
 * Chart theming.
 *
 * Recharts needs concrete colour strings, not Tailwind classes, so the tokens
 * are read off the document once per theme change. Charts were previously
 * hard-coding hexes, which meant they kept dark-mode colours on a white page.
 */

export type ChartPalette = {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  text: string;
  muted: string;
  /** Categorical series colours, ordered by visual priority. */
  series: string[];
  up: string;
  down: string;
};

function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw ? `hsl(${raw})` : fallback;
}

function readTokenAlpha(name: string, alpha: number, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw ? `hsl(${raw} / ${alpha})` : fallback;
}

export function readChartPalette(): ChartPalette {
  const primary = readToken('--primary', 'hsl(160 84% 39%)');
  const secondary = readToken('--secondary', 'hsl(199 89% 48%)');

  return {
    grid: readTokenAlpha('--border', 0.6, 'hsl(205 22% 18% / 0.6)'),
    axis: readToken('--muted-foreground', 'hsl(214 18% 67%)'),
    tooltipBg: readToken('--popover', 'hsl(204 34% 11%)'),
    tooltipBorder: readToken('--border', 'hsl(205 22% 18%)'),
    text: readToken('--foreground', 'hsl(210 40% 96%)'),
    muted: readToken('--muted-foreground', 'hsl(214 18% 67%)'),
    // Two-series comparisons read best when the pair is clearly distinct;
    // the rest are for distribution charts.
    series: [
      primary,
      secondary,
      readToken('--warning', 'hsl(38 92% 55%)'),
      'hsl(280 65% 60%)',
      'hsl(20 85% 58%)',
      'hsl(200 20% 55%)',
    ],
    up: readToken('--success', 'hsl(162 88% 40%)'),
    down: readToken('--danger', 'hsl(355 85% 62%)'),
  };
}

/** Axis tick config shared by every time-series chart. 12px is the floor for
 * any text the app sets; 11px ticks were the only labels below it. */
export const axisDefaults = (palette: ChartPalette) => ({
  stroke: palette.axis,
  fontSize: 12,
  tickLine: false,
  axisLine: false,
});

const DAY_MS = 86_400_000;

/** Ranges longer than this label their ticks by month and year, not by day. */
const DAY_TICKS_MAX_DAYS = 200;

const monthYearFormat = new Intl.DateTimeFormat('tr-TR', { month: 'short', year: 'numeric' });

// Written by hand: Intl gives "03/08" for day + month in tr-TR, while every
// full date in the app reads "03.08.2026".
const dayMonth = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;

function parseDay(value: string): Date | null {
  // `2026-10-14` parses as UTC midnight, which is the previous day west of
  // Greenwich; read the parts instead so the label is the trading day.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Picks the x-axis label for a date series by its span. Day-and-month ticks
 * ("17.01") repeat every year, so over a three-year comparison the axis read
 * 17.01 · 17.04 · … · 17.01 with no way to tell the years apart. Long ranges
 * get "Oca 2025" instead.
 */
export function dateTickFormatter(first: string, last: string): (value: string) => string {
  const start = parseDay(first);
  const end = parseDay(last);
  const spanDays = start && end ? Math.abs(end.getTime() - start.getTime()) / DAY_MS : 0;
  const format = spanDays > DAY_TICKS_MAX_DAYS ? (date: Date) => monthYearFormat.format(date) : dayMonth;

  return (value: string) => {
    const date = parseDay(value);
    return date ? format(date) : value;
  };
}

/**
 * Thins a long series to at most `maxPoints`, always keeping the first and
 * last sample so the endpoints of a range stay exact.
 */
export function downsample<T>(points: T[], maxPoints = 240): T[] {
  if (points.length <= maxPoints || maxPoints < 2) return points;

  const step = (points.length - 1) / (maxPoints - 1);
  const out: T[] = [];
  for (let i = 0; i < maxPoints - 1; i += 1) {
    out.push(points[Math.round(i * step)]);
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Rebases a series to 100 so two instruments with different price levels can
 * be compared on one axis. Callers must format the axis as `value - 100`.
 */
export function toIndexed(values: number[]): number[] {
  const base = values.find((value) => value > 0);
  if (!base) return values.map(() => 100);
  return values.map((value) => (value / base) * 100);
}

/** Formats an indexed value (base 100) as the return it represents. */
export function formatIndexedTick(value: number): string {
  const delta = Math.round(value - 100);
  return `${delta >= 0 ? '+' : '−'}%${Math.abs(delta)}`;
}
