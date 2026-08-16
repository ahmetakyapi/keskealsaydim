import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoadingState } from '@/components/ui/skeleton';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ComparePage = lazy(() => import('@/pages/ComparePage'));
const PortfolioPage = lazy(() => import('@/pages/PortfolioPage'));
const WatchlistPage = lazy(() => import('@/pages/WatchlistPage'));
const MarketPage = lazy(() => import('@/pages/MarketPage'));
const StockDetailPage = lazy(() => import('@/pages/StockDetailPage'));
const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const SharedScenarioPage = lazy(() => import('@/pages/SharedScenarioPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function RouteFallback() {
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

  if (isLoading) return <AuthGate />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

/** Wraps a protected page in the app shell and its own suspense boundary. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PrivateRoute>
      <Suspense fallback={<AuthGate />}>
        <DashboardLayout>
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>{children}</Suspense>
          </ErrorBoundary>
        </DashboardLayout>
      </Suspense>
    </PrivateRoute>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

function App() {
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
        <ScrollToTop />
        <Routes>
          {/* Public */}
          <Route
            path="/"
            element={
              <Suspense fallback={<RouteFallback />}>
                <LandingPage />
              </Suspense>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Suspense fallback={<RouteFallback />}>
                  <LoginPage />
                </Suspense>
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Suspense fallback={<RouteFallback />}>
                  <RegisterPage />
                </Suspense>
              </PublicRoute>
            }
          />
          {/* Shared scenarios must open for signed-out visitors — the whole
              point of a share link. It used to sit behind PrivateRoute. */}
          <Route
            path="/s/:token"
            element={
              <Suspense fallback={<RouteFallback />}>
                <SharedScenarioPage />
              </Suspense>
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
              <Suspense fallback={<RouteFallback />}>
                <NotFoundPage />
              </Suspense>
            }
          />
        </Routes>

        <Toaster />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
