import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useMotionStore } from '@/stores/motionStore';

const EASE_CURTAIN = [0.76, 0, 0.24, 1] as const;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** When the two lines start drawing, and for how long (seconds). */
const DRAW_DELAY = 0.12;
const DRAW_S = 1.2;
/** How long the finished chart holds before the curtain lifts. */
const HOLD_S = 0.32;
/** Hard ceiling: whatever happens, the page is never left covered. */
const FAILSAFE_MS = 4000;

/** Chart space. The SVGs stretch to their box, so only ratios matter. */
const W = 1000;
const H = 600;

type Point = readonly [number, number];

/**
 * Shared opening stretch: the two picks move together for a while, which is
 * exactly why nobody could tell them apart at the time.
 */
const SHARED: Point[] = [
  [0, 452],
  [70, 440],
  [130, 458],
  [200, 430],
  [270, 444],
  [330, 418],
];

/** What you bought: drifts sideways and goes nowhere. */
const BOUGHT: Point[] = [
  ...SHARED,
  [400, 430],
  [470, 408],
  [545, 426],
  [620, 404],
  [700, 418],
  [780, 400],
  [860, 414],
  [930, 404],
  [1000, 410],
];

/** What you could have bought: keeps climbing. */
const MISSED: Point[] = [
  ...SHARED,
  [400, 384],
  [470, 350],
  [545, 358],
  [620, 290],
  [700, 262],
  [780, 196],
  [860, 172],
  [930, 118],
  [1000, 86],
];

/** Catmull-Rom through the points, emitted as cubic Béziers. */
function toBezierSegments(points: Point[]) {
  const segments: [Point, Point, Point, Point][] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    segments.push([p1, c1, c2, p2]);
  }
  return segments;
}

function toPath(points: Point[]) {
  const segments = toBezierSegments(points);
  return segments.reduce(
    (d, [, c1, c2, end]) => `${d} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${end[0]} ${end[1]}`,
    `M ${points[0][0]} ${points[0][1]}`,
  );
}

/** Dense (x, y) samples of the smoothed curve, for placing the line heads. */
function sample(points: Point[]) {
  const out: Point[] = [];
  for (const [a, b, c, d] of toBezierSegments(points)) {
    for (let step = 0; step < 24; step += 1) {
      const t = step / 24;
      const u = 1 - t;
      out.push([
        u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
        u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      ]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function yAt(samples: Point[], x: number) {
  for (let i = 1; i < samples.length; i += 1) {
    const [x1, y1] = samples[i];
    if (x1 >= x) {
      const [x0, y0] = samples[i - 1];
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return samples[samples.length - 1][1];
}

const BOUGHT_D = toPath(BOUGHT);
const MISSED_D = toPath(MISSED);
// The regret gap: up the missed line, back along the bought one.
const GAP_D = `${MISSED_D} L ${W} ${H} L 0 ${H} Z`;
const BOUGHT_SAMPLES = sample(BOUGHT);
const MISSED_SAMPLES = sample(MISSED);

const GRID_ROWS = [0.2, 0.4, 0.6, 0.8];
const GRID_COLS = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];

/** Shared props for strokes that must stay hairline at any aspect ratio. */
const HAIRLINE = { vectorEffect: 'non-scaling-stroke' as const, fill: 'none' };

/**
 * First-visit brand intro for the landing page.
 *
 * Two price lines draw across a faint chart: for a while they move as one,
 * then they part — what you bought drifts sideways, what you could have
 * bought keeps climbing, and the gap between them fills in. The wordmark
 * rises over it and the panel lifts away on a rising edge.
 *
 * Plays once per browser session, only on `/`, never under reduced motion
 * (see `motionStore`). A click or key skips it, and a timer guarantees the
 * page is uncovered even if the animation clock stalls. Only transform,
 * opacity and clip-path are animated.
 */
export function Preloader() {
  const playIntro = useMotionStore((state) => state.playIntro);
  const finishIntro = useMotionStore((state) => state.finishIntro);
  const [visible, setVisible] = useState(playIntro);

  // 0 → 1 across the chart's width; everything on the chart follows it.
  const progress = useMotionValue(0);
  const reveal = useTransform(progress, (v) => `inset(-4% ${(1 - v) * 100}% -4% 0%)`);
  const headX = useTransform(progress, (v) => `${v * 100}%`);
  const boughtY = useTransform(progress, (v) => `${(yAt(BOUGHT_SAMPLES, v * W) / H) * 100}%`);
  const missedY = useTransform(progress, (v) => `${(yAt(MISSED_SAMPLES, v * W) / H) * 100}%`);
  // Labels and the gap only make sense once the lines have parted.
  const partedOpacity = useTransform(progress, [0.38, 0.55], [0, 1]);
  const gapOpacity = useTransform(progress, [0.3, 0.9], [0, 1]);

  useEffect(() => {
    if (!visible) return;

    document.documentElement.style.overflow = 'hidden';
    let holdTimer: number | undefined;
    const controls = animate(progress, 1, {
      delay: DRAW_DELAY,
      duration: DRAW_S,
      ease: [0.45, 0, 0.2, 1],
      onComplete: () => {
        holdTimer = window.setTimeout(() => setVisible(false), HOLD_S * 1000);
      },
    });
    const failsafe = window.setTimeout(() => setVisible(false), FAILSAFE_MS);

    const skip = () => {
      controls.stop();
      setVisible(false);
    };
    window.addEventListener('keydown', skip, { once: true });

    return () => {
      controls.stop();
      window.clearTimeout(holdTimer);
      window.clearTimeout(failsafe);
      window.removeEventListener('keydown', skip);
      document.documentElement.style.overflow = '';
    };
  }, [visible, progress]);

  // The hero starts its own entrance as the curtain begins to lift, so the
  // headline is already arriving when the panel clears it.
  useEffect(() => {
    if (playIntro && !visible) finishIntro();
  }, [playIntro, visible, finishIntro]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          aria-hidden="true"
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-[100] cursor-pointer overflow-hidden bg-background"
          // A rising edge — lower on the left, higher on the right — sweeps
          // the panel away, the same slope as the line that won.
          initial={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 112%, 0% 130%)' }}
          exit={{
            clipPath: 'polygon(0% 0%, 100% 0%, 100% -30%, 0% -12%)',
            transition: { duration: 0.85, ease: EASE_CURTAIN },
          }}
        >
          <div className="bloom -left-24 top-1/4 h-96 w-96 bg-primary/20" />
          <div className="bloom -right-16 top-0 h-80 w-80 bg-secondary/15" />

          {/* Chart */}
          <motion.div
            className="absolute bottom-[14%] left-0 right-[9%] top-[36%] sm:right-[7%] lg:top-[16%]"
            exit={{ y: '-6%', opacity: 0, transition: { duration: 0.6, ease: EASE_CURTAIN } }}
          >
            {/* Grid */}
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
            >
              {GRID_ROWS.map((row, index) => (
                <motion.line
                  key={`r${row}`}
                  x1={0}
                  x2={W}
                  y1={row * H}
                  y2={row * H}
                  {...HAIRLINE}
                  style={{ stroke: 'hsl(var(--border))', transformOrigin: '0% 50%', transformBox: 'fill-box' }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.9, ease: EASE_OUT, delay: index * 0.05 }}
                />
              ))}
              {GRID_COLS.map((col, index) => (
                <motion.line
                  key={`c${col}`}
                  x1={col * W}
                  x2={col * W}
                  y1={0}
                  y2={H}
                  {...HAIRLINE}
                  strokeDasharray="2 6"
                  style={{ stroke: 'hsl(var(--border))' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ duration: 0.6, delay: 0.1 + index * 0.04 }}
                />
              ))}
            </svg>

            {/* Lines and the gap, revealed left to right in step with the heads */}
            <motion.div className="absolute inset-0" style={{ clipPath: reveal }}>
              <svg
                className="absolute inset-0 h-full w-full overflow-visible"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="preloader-gap" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" style={{ stopColor: 'hsl(var(--success))', stopOpacity: 0.26 }} />
                    <stop offset="100%" style={{ stopColor: 'hsl(var(--success))', stopOpacity: 0.02 }} />
                  </linearGradient>
                  <clipPath id="preloader-above-bought">
                    <path d={`${BOUGHT_D} L ${W} 0 L 0 0 Z`} />
                  </clipPath>
                </defs>
                <motion.path
                  d={GAP_D}
                  fill="url(#preloader-gap)"
                  clipPath="url(#preloader-above-bought)"
                  style={{ opacity: gapOpacity }}
                />
                <path
                  d={BOUGHT_D}
                  {...HAIRLINE}
                  strokeWidth={2}
                  strokeLinecap="round"
                  style={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <path
                  d={MISSED_D}
                  {...HAIRLINE}
                  strokeWidth={2.75}
                  strokeLinecap="round"
                  style={{ stroke: 'hsl(var(--success))' }}
                />
              </svg>
            </motion.div>

            {/* Line heads. The layer is the chart's size, so a percentage
                translate is a position inside the chart. */}
            <motion.div className="absolute inset-0" style={{ x: headX, y: boughtY }}>
              <span className="absolute left-0 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-muted-foreground" />
              <motion.span
                className="absolute left-0 top-0 -translate-x-full translate-y-3 whitespace-nowrap pr-2 text-xs font-medium text-muted-foreground"
                style={{ opacity: partedOpacity }}
              >
                Aldığın
              </motion.span>
            </motion.div>
            <motion.div className="absolute inset-0" style={{ x: headX, y: missedY }}>
              <span className="absolute left-0 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-success shadow-[0_0_0_6px_hsl(var(--success)/0.18)]" />
              <motion.span
                className="absolute left-0 top-0 -translate-x-full -translate-y-[calc(100%+0.75rem)] whitespace-nowrap pr-2 text-xs font-semibold text-success"
                style={{ opacity: partedOpacity }}
              >
                Alabileceğin
              </motion.span>
            </motion.div>
          </motion.div>

          {/* Wordmark */}
          <motion.div
            className="absolute inset-x-0 top-[13%] px-6 sm:px-12 lg:top-[17%] lg:px-20"
            exit={{ y: '-40%', opacity: 0, transition: { duration: 0.6, ease: EASE_CURTAIN } }}
          >
            <h2 className="display text-[clamp(3.25rem,12vw,8.5rem)] leading-[0.9]">
              {['Keşke', 'Alsaydım'].map((wordText, index) => (
                <span key={wordText} className="block overflow-hidden pb-[0.08em]">
                  <motion.span
                    className={index === 1 ? 'block text-primary' : 'block'}
                    initial={{ y: '110%' }}
                    animate={{ y: '0%' }}
                    transition={{ duration: 0.85, ease: EASE_CURTAIN, delay: 0.45 + index * 0.1 }}
                  >
                    {wordText}
                  </motion.span>
                </span>
              ))}
            </h2>
            <motion.p
              className="mt-3 max-w-xs text-sm text-muted-foreground sm:text-base"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.9 }}
            >
              Aldığın ile alabileceğin arasındaki fark.
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
