import { lazy, Suspense, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoadingState } from '@/components/ui/skeleton';
import { RouteCurtain } from '@/components/fx/RouteCurtain';
import { Preloader } from '@/components/fx/Preloader';
import { TopLoader } from '@/components/fx/TopLoader';
import { usePendingSignal } from '@/hooks/usePendingSignal';
import { safeNextPath } from '@/lib/next-path';
import { GlobalPointerFx } from '@/components/fx/GlobalPointerFx';

const loaders = {
  landing: () => import('@/pages/LandingPage'),
  login: () => import('@/pages/LoginPage'),
  register: () => import('@/pages/RegisterPage'),
  layout: () => import('@/components/layout/DashboardLayout'),
  dashboard: () => import('@/pages/DashboardPage'),
  compare: () => import('@/pages/ComparePage'),
  portfolio: () => import('@/pages/PortfolioPage'),
  watchlist: () => import('@/pages/WatchlistPage'),
  market: () => import('@/pages/MarketPage'),
  stock: () => import('@/pages/StockDetailPage'),
  alerts: () => import('@/pages/AlertsPage'),
  notifications: () => import('@/pages/NotificationsPage'),
  settings: () => import('@/pages/SettingsPage'),
  shared: () => import('@/pages/SharedScenarioPage'),
  notFound: () => import('@/pages/NotFoundPage'),
} as const;

const LandingPage = lazy(loaders.landing);
const LoginPage = lazy(loaders.login);
const RegisterPage = lazy(loaders.register);
const DashboardLayout = lazy(loaders.layout);
const DashboardPage = lazy(loaders.dashboard);
const ComparePage = lazy(loaders.compare);
const PortfolioPage = lazy(loaders.portfolio);
const WatchlistPage = lazy(loaders.watchlist);
const MarketPage = lazy(loaders.market);
const StockDetailPage = lazy(loaders.stock);
const AlertsPage = lazy(loaders.alerts);
const NotificationsPage = lazy(loaders.notifications);
const SettingsPage = lazy(loaders.settings);
const SharedScenarioPage = lazy(loaders.shared);
const NotFoundPage = lazy(loaders.notFound);

/**
 * Warms every route chunk once the browser is idle, so a page transition
 * never has to stop mid-curtain to download the page it is revealing.
 */
function usePrefetchRoutes() {
  useEffect(() => {
    const idle =
      window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 1500));
    const handle = idle(() => {
      Object.values(loaders).forEach((load) => void load().catch(() => undefined));
    });
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle as number);
      else window.clearTimeout(handle as number);
    };
  }, []);
}

/** Paths that render inside the app shell. They share one transition key. */
const APP_PREFIXES = [
  '/dashboard',
  '/compare',
  '/portfolio',
  '/watchlist',
  '/market',
  '/stocks',
  '/alerts',
  '/notifications',
  '/settings',
];

function worldOf(pathname: string): string {
  const inApp = APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return inApp ? 'app' : pathname;
}

function RouteFallback() {
  usePendingSignal();
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <PageLoadingState message="Sayfa yükleniyor…" />
    </div>
  );
}

function AuthGate() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <PageLoadingState message="Oturum kontrol ediliyor…" />
    </div>
  );
}

/** Public page: curtain transition + its own suspense boundary. */
function PublicPage({ children }: { children: React.ReactNode }) {
  return (
    <RouteCurtain>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </RouteCurtain>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <AuthGate />;

  if (!isAuthenticated) {
    // Remember where the visitor was headed so login can return them there
    // instead of always dropping them on the dashboard.
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [searchParams] = useSearchParams();

  if (isLoading) return <AuthGate />;
  // Signing in flips this guard while the login page is still on screen
  // behind the curtain. A fixed "/dashboard" here won that race against the
  // form's own navigate(next), so a landing "popular comparison" opened
  // signed out ended on the dashboard instead of the comparison.
  if (isAuthenticated) return <Navigate to={safeNextPath(searchParams.get('next'))} replace />;

  return <>{children}</>;
}

/** Wraps a protected page in the app shell and its own suspense boundary. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <RouteCurtain>
      <PrivateRoute>
        <Suspense fallback={<AuthGate />}>
          <DashboardLayout>
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>{children}</Suspense>
            </ErrorBoundary>
          </DashboardLayout>
        </Suspense>
      </PrivateRoute>
    </RouteCurtain>
  );
}

/**
 * Scroll reset for navigation inside one world. A change of world is reset
 * by `AnimatePresence.onExitComplete` instead: jumping to the top while the
 * old page is still being covered would show the jump.
 */
function ScrollToTop({ world }: { world: string }) {
  const { pathname } = useLocation();
  const previousWorld = useRef(world);

  useEffect(() => {
    const sameWorld = previousWorld.current === world;
    previousWorld.current = world;
    if (sameWorld) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, world]);

  return null;
}

function App() {
  const location = useLocation();
  const world = worldOf(location.pathname);
  usePrefetchRoutes();

  const setLoading = useAuthStore((state) => state.setLoading);
  const theme = useThemeStore((state) => state.theme);
  const syncTheme = useThemeStore((state) => state.syncTheme);

  useEffect(() => {
    syncTheme();
    setLoading(false);
  }, [setLoading, syncTheme]);

  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => syncTheme();

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, syncTheme]);

  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={200}>
        <ScrollToTop world={world} />
        <GlobalPointerFx />
        <TopLoader />
        <Preloader />

        <AnimatePresence
          mode="wait"
          initial={false}
          onExitComplete={() => window.scrollTo({ top: 0, behavior: 'auto' })}
        >
        <Routes location={location} key={world}>
          {/* Public */}
          <Route
            path="/"
            element={
              <PublicPage>
                <LandingPage />
              </PublicPage>
            }
          />
          <Route
            path="/login"
            element={
              <PublicPage>
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              </PublicPage>
            }
          />
          <Route
            path="/register"
            element={
              <PublicPage>
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              </PublicPage>
            }
          />
          {/* Shared scenarios must open for signed-out visitors — the whole
              point of a share link. It used to sit behind PrivateRoute. */}
          <Route
            path="/s/:token"
            element={
              <PublicPage>
                <SharedScenarioPage />
              </PublicPage>
            }
          />

          {/* Protected */}
          <Route path="/dashboard" element={<Shell><DashboardPage /></Shell>} />
          <Route path="/compare" element={<Shell><ComparePage /></Shell>} />
          <Route path="/portfolio" element={<Shell><PortfolioPage /></Shell>} />
          <Route path="/watchlist" element={<Shell><WatchlistPage /></Shell>} />
          <Route path="/market" element={<Shell><MarketPage /></Shell>} />
          <Route path="/stocks/:symbol" element={<Shell><StockDetailPage /></Shell>} />
          <Route path="/alerts" element={<Shell><AlertsPage /></Shell>} />
          <Route path="/notifications" element={<Shell><NotificationsPage /></Shell>} />
          <Route path="/settings" element={<Shell><SettingsPage /></Shell>} />

          {/* A wrong URL deserves an explanation, not a silent bounce home. */}
          <Route
            path="*"
            element={
              <PublicPage>
                <NotFoundPage />
              </PublicPage>
            }
          />
        </Routes>
        </AnimatePresence>

        <Toaster />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
