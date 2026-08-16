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

/** Axis tick config shared by every time-series chart. */
export const axisDefaults = (palette: ChartPalette) => ({
  stroke: palette.axis,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
});

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
