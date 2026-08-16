import { useEffect, useState } from 'react';
import { readChartPalette, type ChartPalette } from '@/lib/chart';
import { useThemeStore } from '@/stores/themeStore';

/**
 * Chart colours resolved from CSS tokens, re-read whenever the theme changes
 * so charts repaint with the page instead of keeping dark colours on white.
 */
export function useChartPalette(): ChartPalette {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const [palette, setPalette] = useState<ChartPalette>(() => readChartPalette());

  useEffect(() => {
    // Read after the class swap has been committed to the DOM.
    const frame = requestAnimationFrame(() => setPalette(readChartPalette()));
    return () => cancelAnimationFrame(frame);
  }, [resolvedTheme]);

  return palette;
}
