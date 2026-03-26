import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { lazy, Suspense, useEffect } from 'react';

// Components
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ComparePage = lazy(() => import('@/pages/ComparePage'));
const PortfolioPage = lazy(() => import('@/pages/PortfolioPage'));
const WatchlistPage = lazy(() => import('@/pages/WatchlistPage'));
const MarketPage = lazy(() => import('@/pages/MarketPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

function RouteLoader() {
  return (
    <div className="min-h-[45vh] w-full bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { setLoading } = useAuthStore();
  const { theme, syncTheme } = useThemeStore();

  useEffect(() => {
    syncTheme();
    setLoading(false);
  }, [setLoading, syncTheme]);

  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      syncTheme();
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, syncTheme]);

  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={
            <Suspense fallback={<RouteLoader />}>
              <LandingPage />
            </Suspense>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Suspense fallback={<RouteLoader />}>
                <LoginPage />
              </Suspense>
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Suspense fallback={<RouteLoader />}>
                <RegisterPage />
              </Suspense>
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <DashboardLayout>
                  <ComparePage />
                </DashboardLayout>
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/portfolio"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <DashboardLayout>
                  <PortfolioPage />
                </DashboardLayout>
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/watchlist"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <DashboardLayout>
                  <WatchlistPage />
                </DashboardLayout>
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/market"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <DashboardLayout>
                  <MarketPage />
                </DashboardLayout>
              </Suspense>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Suspense fallback={<RouteLoader />}>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </Suspense>
            </PrivateRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
