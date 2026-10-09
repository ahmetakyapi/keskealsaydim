import { describe, expect, it } from 'vitest';
import { wrap } from './motion';

describe('wrap', () => {
  it('leaves values inside the range alone', () => {
    expect(wrap(-50, -25, -30)).toBe(-30);
  });

  it('includes the lower bound and excludes the upper one', () => {
    expect(wrap(-50, -25, -50)).toBe(-50);
    expect(wrap(-50, -25, -25)).toBe(-50);
  });

  it('folds values past either end back in', () => {
    expect(wrap(-50, -25, -55)).toBe(-30);
    expect(wrap(-50, -25, -20)).toBe(-45);
    expect(wrap(-50, -25, 1000)).toBe(-50);
  });

  it('handles negative travel of many ranges', () => {
    expect(wrap(0, 10, -1)).toBe(9);
    expect(wrap(0, 10, -101)).toBe(9);
  });
});
