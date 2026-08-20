import { describe, expect, it } from 'vitest';
import { downsample, formatIndexedTick, toIndexed } from './chart';

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
