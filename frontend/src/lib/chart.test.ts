import { describe, expect, it } from 'vitest';
import { dateTickFormatter, downsample, formatIndexedTick, monthStartTicks, toIndexed } from './chart';

describe('downsample', () => {
  const points = Array.from({ length: 1000 }, (_, i) => ({ i }));

  it('leaves a short series untouched', () => {
    const short = points.slice(0, 10);
    expect(downsample(short, 240)).toBe(short);
  });

  it('thins to the requested count', () => {
    expect(downsample(points, 100)).toHaveLength(100);
  });

  it('always keeps both endpoints so a range stays exact', () => {
    const out = downsample(points, 50);
    expect(out[0]).toBe(points[0]);
    expect(out[out.length - 1]).toBe(points[points.length - 1]);
  });

  it('is monotonic — thinning must not reorder the series', () => {
    const out = downsample(points, 37) as Array<{ i: number }>;
    for (let n = 1; n < out.length; n += 1) {
      expect(out[n].i).toBeGreaterThan(out[n - 1].i);
    }
  });
});

describe('toIndexed', () => {
  it('rebases a series to 100', () => {
    expect(toIndexed([50, 75, 100])).toEqual([100, 150, 200]);
  });

  it('uses the first positive value as the base, skipping leading zeros', () => {
    expect(toIndexed([0, 50, 100])).toEqual([0, 100, 200]);
  });

  it('degrades to a flat line when there is nothing to rebase on', () => {
    expect(toIndexed([0, 0])).toEqual([100, 100]);
  });
});

describe('formatIndexedTick', () => {
  it('renders the base as zero return, not as 100%', () => {
    // The old landing chart printed the raw index on the axis while the
    // tooltip subtracted 100, so the same point read "955%" and "+855.0%".
    expect(formatIndexedTick(100)).toBe('+%0');
  });

  it('renders gains and losses relative to the base', () => {
    expect(formatIndexedTick(955)).toBe('+%855');
    expect(formatIndexedTick(60)).toBe('−%40');
  });
});

describe('dateTickFormatter', () => {
  it('labels short ranges by day and month', () => {
    const tick = dateTickFormatter('2026-07-14', '2026-10-14');
    expect(tick('2026-08-03')).toBe('03.08');
  });

  it('adds the year once a range spans more than a few months', () => {
    const tick = dateTickFormatter('2023-10-16', '2026-10-14');
    expect(tick('2025-01-17')).toBe('Oca 2025');
    // The point of the change: the same day in two years no longer reads alike.
    expect(tick('2024-01-17')).not.toBe(tick('2025-01-17'));
  });

  it('reads the calendar day, not the UTC instant', () => {
    const tick = dateTickFormatter('2026-10-01', '2026-10-31');
    expect(tick('2026-10-01')).toBe('01.10');
  });

  it('passes through a value it cannot parse', () => {
    expect(dateTickFormatter('2026-01-01', '2026-02-01')('bugün')).toBe('bugün');
  });
});

describe('monthStartTicks', () => {
  it('puts one tick on the first sample of each month of a long range', () => {
    const dates = ['2026-03-02', '2026-03-20', '2026-04-01', '2026-06-03', '2026-06-25', '2026-10-13'];
    expect(monthStartTicks(dates)).toEqual(['2026-03-02', '2026-04-01', '2026-06-03', '2026-10-13']);
  });

  it('never yields two ticks that print the same month label', () => {
    const dates = Array.from({ length: 220 }, (_, i) => {
      const d = new Date(2026, 2, 2 + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const ticks = monthStartTicks(dates) ?? [];
    const tick = dateTickFormatter(dates[0], dates[dates.length - 1]);
    const labels = ticks.map(tick);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('leaves day-labelled ranges to the chart', () => {
    expect(monthStartTicks(['2026-07-14', '2026-08-14', '2026-10-14'])).toBeUndefined();
  });
});
