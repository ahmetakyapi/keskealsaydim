import { Link, useLocation } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Compass, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/BrandLogo';
import { Magnetic } from '@/components/fx/Magnetic';
import { PointerAurora } from '@/components/fx/PointerAurora';
import { useAuthStore } from '@/stores/authStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFinePointer, usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { EASE_BRAND } from '@/lib/utils';

/* A line that climbs and then falls off a cliff — decorative, not data. */
const CRASH =
  'M0 120 C 40 112, 70 96, 110 100 S 170 60, 210 66 S 260 30, 300 36 L 330 28 L 352 150 L 380 170 L 420 200';

/**
 * A real 404. The router used to bounce every unknown path to `/`, which made
 * a mistyped or dead share link look like a redirect rather than an error.
 *
 * Giant outlined digits lean away from the pointer; a price line climbs and
 * crashes underneath them.
 */
export default function NotFoundPage() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const reduced = usePrefersReducedMotion();
  const fine = useFinePointer();
  useDocumentTitle('Sayfa Bulunamadı');

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 16 });
  const sy = useSpring(my, { stiffness: 60, damping: 16 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [14, -14]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [-10, 10]);

  const interactive = fine && !reduced;

  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center"
      onPointerMove={(event) => {
        if (!interactive) return;
        mx.set(event.clientX / window.innerWidth - 0.5);
        my.set(event.clientY / window.innerHeight - 0.5);
      }}
    >
      <PointerAurora />

      <Link to="/" className="relative mb-6">
        <BrandLogo size="md" />
      </Link>

      <div className="relative [perspective:1000px]">
        <motion.p
          aria-hidden="true"
          className="display text-outline select-none text-[clamp(8rem,28vw,20rem)] leading-none"
          style={interactive ? { rotateX, rotateY } : undefined}
        >
          {['4', '0', '4'].map((digit, index) => (
            <motion.span
              key={index}
              className="inline-block"
              initial={reduced ? false : { y: '-120%', rotate: index === 1 ? -25 : 15, opacity: 0 }}
              animate={{ y: '0%', rotate: index === 1 ? -8 : 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 11, delay: 0.25 + index * 0.12 }}
            >
              {digit}
            </motion.span>
          ))}
        </motion.p>

        <svg
          viewBox="0 0 420 200"
          className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-1/2 w-full -translate-y-1/4"
          fill="none"
          aria-hidden="true"
        >
          <motion.path
            d={CRASH}
            className="stroke-danger"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1], delay: 0.8 }}
          />
        </svg>
      </div>

      <motion.div
        className="relative"
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE_BRAND, delay: 1 }}
      >
        <h1 className="display-sm text-2xl sm:text-3xl">Bu sayfa piyasadan çekilmiş</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          <span className="break-all font-mono text-xs text-foreground/70">{location.pathname}</span>{' '}
          adresi taşınmış, silinmiş ya da hiç var olmamış olabilir.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Magnetic>
            <Button asChild>
              <Link to={isAuthenticated ? '/dashboard' : '/'}>
                <Home className="h-4 w-4" aria-hidden="true" />
                {isAuthenticated ? 'Panele Dön' : 'Ana Sayfaya Dön'}
              </Link>
            </Button>
          </Magnetic>

          <Magnetic>
            {isAuthenticated ? (
              <Button variant="outline" asChild>
                <Link to="/compare">
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  Karşılaştırma Yap
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/login">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Giriş Yap
                </Link>
              </Button>
            )}
          </Magnetic>
        </div>
      </motion.div>
    </div>
  );
}
