import type { AlertDirection } from '@/types';

export interface TargetDistance {
  /** The price is already at or past the target. */
  reached: boolean;
  /** Signed move from today's price to the target, as a percentage of today's price. */
  movePercent: number;
}

/**
 * How far an alert's target is from the current price, phrased the way a
 * reader asks it: "how much does it still have to move?".
 *
 * The API reports the gap relative to the *target* (279,25 against a 200
 * floor came out as "+%39,63 hedefe göre"), which is neither the size nor the
 * direction of the move the alert is waiting for. The same gap measured from
 * today's price is a 28,4% fall.
 */
export function distanceToTarget(
  current: number,
  target: number,
  direction: AlertDirection
): TargetDistance | null {
  if (!(current > 0) || !(target > 0)) return null;

  const reached = direction === 'ABOVE' ? current >= target : current <= target;
  return { reached, movePercent: ((target - current) / current) * 100 };
}
