/**
 * Wraps `value` into the half-open range [min, max). The seam that makes an
 * endless marquee endless: travel keeps growing, the rendered offset loops.
 */
export function wrap(min: number, max: number, value: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}
