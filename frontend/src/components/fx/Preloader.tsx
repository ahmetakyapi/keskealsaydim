import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useMotionStore } from '@/stores/motionStore';

const EASE_CURTAIN = [0.76, 0, 0.24, 1] as const;
const COUNT_MS = 1700;

/**
 * Fixed path of a line that climbs, dips and climbs again — the shape of
 * every "keşke" story. Decorative only, so it is not data and claims none.
 */
const LINE =
  'M0 70 C 30 66, 45 58, 70 60 S 110 40, 130 46 S 160 70, 185 52 S 220 18, 250 26 S 290 8, 320 4';

/**
 * First-visit brand intro for the landing page.
 *
 * Counts to 100 while a line draws itself, then the whole panel wipes
 * upward to reveal the hero, whose headline is waiting on `introDone`.
 * Plays once per browser session, never on a deep link, never under
 * reduced motion, and any click or key skips it.
 */
export function Preloader() {
  const playIntro = useMotionStore((state) => state.playIntro);
  const finishIntro = useMotionStore((state) => state.finishIntro);
  const [visible, setVisible] = useState(playIntro);

  const progress = useMotionValue(0);
  const counter = useTransform(progress, (value) => String(Math.round(value)).padStart(3, '0'));
  const pathLength = useTransform(progress, [0, 100], [0, 1]);
  const barScale = useTransform(progress, [0, 100], [0, 1]);

  useEffect(() => {
    if (!visible) return;

    document.documentElement.style.overflow = 'hidden';
    const controls = animate(progress, 100, {
      duration: COUNT_MS / 1000,
      ease: [0.65, 0, 0.35, 1],
      onComplete: () => setVisible(false),
    });

    const skip = () => {
      controls.stop();
      progress.set(100);
      setVisible(false);
    };
    window.addEventListener('keydown', skip, { once: true });

    return () => {
      controls.stop();
      window.removeEventListener('keydown', skip);
      document.documentElement.style.overflow = '';
    };
  }, [visible, progress]);

  return (
    <AnimatePresence onExitComplete={finishIntro}>
      {visible && (
        <motion.div
          key="preloader"
          aria-hidden="true"
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-[100] flex cursor-pointer flex-col justify-between overflow-hidden bg-background p-6 sm:p-10"
          exit={{
            clipPath: 'inset(0% 0% 100% 0%)',
            transition: { duration: 0.95, ease: EASE_CURTAIN },
          }}
          initial={{ clipPath: 'inset(0% 0% 0% 0%)' }}
        >
          <div className="bloom left-1/4 top-1/4 h-96 w-96 bg-primary/25" />
          <div className="bloom bottom-0 right-1/4 h-80 w-80 bg-secondary/20" />

          <div className="relative flex items-start justify-between">
            <motion.p
              className="eyebrow text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              PİYASA VERİLERİ HAZIRLANIYOR
            </motion.p>
            <motion.p
              className="eyebrow text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              BIST · NASDAQ · DÖVİZ
            </motion.p>
          </div>

          <div className="relative mx-auto w-full max-w-4xl">
            <h2 className="display text-[clamp(3rem,11vw,9rem)] leading-[0.9]">
              {['Keşke', 'Alsaydım'].map((wordText, index) => (
                <span key={wordText} className="block overflow-hidden pb-[0.08em]">
                  <motion.span
                    className={index === 1 ? 'block text-primary' : 'block'}
                    initial={{ y: '110%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '-30%', opacity: 0 }}
                    transition={{ duration: 0.9, ease: EASE_CURTAIN, delay: 0.15 + index * 0.1 }}
                  >
                    {wordText}
                  </motion.span>
                </span>
              ))}
            </h2>

            <svg viewBox="0 0 320 80" className="mt-6 h-16 w-full sm:h-20" fill="none">
              <defs>
                <linearGradient id="preloader-line" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" style={{ stopColor: 'hsl(var(--secondary))' }} />
                  <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))' }} />
                </linearGradient>
              </defs>
              <motion.path
                d={LINE}
                stroke="url(#preloader-line)"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ pathLength }}
              />
            </svg>
          </div>

          <div className="relative flex items-end justify-between gap-6">
            <div className="h-px flex-1 overflow-hidden bg-border">
              <motion.div className="h-full origin-left bg-primary" style={{ scaleX: barScale }} />
            </div>
            <motion.span className="display tabular text-[clamp(3rem,9vw,7rem)] leading-none text-foreground">
              {counter}
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
