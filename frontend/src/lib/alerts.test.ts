import { describe, expect, it } from 'vitest';
import { distanceToTarget } from './alerts';

describe('distanceToTarget', () => {
  it('measures a floor alert as the fall still needed from today', () => {
    const distance = distanceToTarget(279.25, 200, 'BELOW');
    expect(distance?.reached).toBe(false);
    expect(distance?.movePercent).toBeCloseTo(-28.38, 2);
  });

  it('measures a ceiling alert as the rise still needed', () => {
    const distance = distanceToTarget(100, 110, 'ABOVE');
    expect(distance?.reached).toBe(false);
    expect(distance?.movePercent).toBeCloseTo(10, 6);
  });

  it('reports a target already passed as reached', () => {
    expect(distanceToTarget(120, 110, 'ABOVE')?.reached).toBe(true);
    expect(distanceToTarget(90, 110, 'BELOW')?.reached).toBe(true);
  });

  it('has nothing to say without a live price', () => {
    expect(distanceToTarget(0, 110, 'ABOVE')).toBeNull();
  });
});
