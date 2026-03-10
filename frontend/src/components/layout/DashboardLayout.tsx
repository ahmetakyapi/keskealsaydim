import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  GitCompare,
  Wallet,
  Star,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  User,
  PanelLeft,
  Sparkles,
  X,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { stockService } from '@/services/stockService';
import { authService } from '@/services/authService';
import { userService } from '@/services/userService';
import type { StockSearchResult } from '@/types';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Karşılaştır', href: '/compare', icon: GitCompare },
  { name: 'Portföyüm', href: '/portfolio', icon: Wallet },
  { name: 'Favorilerim', href: '/watchlist', icon: Star },
  { name: 'Piyasa', href: '/market', icon: BarChart3 },
  { name: 'Ayarlar', href: '/settings', icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, refreshToken } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const compactMode = Boolean(user?.settings?.compactMode);
  const unreadCount = user?.unreadNotifications ?? 0;

  useEffect(() => {
    let ignore = false;
    userService
      .getMe()
      .then((profile) => {
        if (!ignore) {
          useAuthStore.getState().updateUser(profile);
        }
      })
      .catch(() => {
        // Non-blocking background refresh
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let active = true;
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await stockService.search(query);
        if (!active) return;
        setSearchResults(results.slice(0, 6));
        setSearchOpen(true);
      } catch {
        if (!active) return;
        setSearchResults([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 280);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch {
      // Local logout should still complete even if revoke fails.
    } finally {
      logout();
      window.location.href = '/';
    }
  };

  const handleSearchSelect = (item: StockSearchResult) => {
    navigate(`/compare?symbol=${encodeURIComponent(item.symbol)}`);
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  const SidebarContent = (
    <>
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        <Link to="/dashboard" className="flex items-center space-x-3">
          <BrandLogo showText={!sidebarCollapsed} />
        </Link>

        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'relative flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_12px_-3px_rgba(16,185,129,0.3)]'
                  : 'text-white/60 hover:bg-white/[0.04] hover:text-white border border-transparent'
              )}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0 transition-transform duration-200', !isActive && 'group-hover:scale-110')} />
              {!sidebarCollapsed && <span className="ml-3 font-medium whitespace-nowrap">{item.name}</span>}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl border border-primary/30 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div
          className={cn(
            'flex items-center rounded-xl p-2 bg-white/5 border border-white/10 transition-all',
            sidebarCollapsed ? 'justify-center' : 'space-x-3'
          )}
        >
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-white/45 truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-surface-dark">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/12 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-32 right-[-8rem] h-80 w-80 rounded-full bg-secondary/15 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-emerald-300/8 blur-[140px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 88 : 288 }}
          className={cn(
            'hidden md:flex fixed left-0 top-0 h-full bg-surface/95 border-r border-white/10 z-50 flex-col',
            sidebarCollapsed ? 'w-[88px]' : 'w-72'
          )}
        >
          {SidebarContent}

          <button
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="hidden md:flex absolute -right-3 top-20 w-7 h-7 rounded-full bg-surface border border-white/15 items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </motion.aside>

        <aside
          className={cn(
            'md:hidden fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-surface/95 border-r border-white/10 flex flex-col transition-transform duration-300',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {SidebarContent}
        </aside>

        <div
          className={cn(
            'flex-1 min-w-0 transition-all duration-300',
            sidebarCollapsed ? 'md:ml-[88px]' : 'md:ml-72'
          )}
        >
          <header className="h-16 border-b border-white/[0.06] bg-surface/80 backdrop-blur-xl px-3 md:px-6 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-2 md:gap-3 w-full max-w-xl" ref={searchRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden text-white/70"
              >
                <PanelLeft className="w-5 h-5" />
              </Button>

              <div className="relative w-full">
                <Input
                  placeholder="Hisse ara ve karşılaştırma başlat..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value.toUpperCase())}
                  onFocus={() => {
                    if (searchResults.length > 0) setSearchOpen(true);
                  }}
                  className="bg-white/8 border-white/15 pl-10"
                  icon={<Search className="w-4 h-4" />}
                />

                <AnimatePresence>
                  {searchOpen && (searchLoading || searchResults.length > 0 || searchQuery.trim().length >= 2) && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute top-12 left-0 right-0 rounded-xl border border-white/10 bg-surface/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
                    >
                      {searchLoading ? (
                        <div className="px-4 py-3 text-sm text-white/60 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Aranıyor...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-white/50">Sonuç bulunamadı</div>
                      ) : (
                        <div className="py-1">
                          {searchResults.map((item) => (
                            <button
                              key={`${item.symbol}-${item.exchange}`}
                              onClick={() => handleSearchSelect(item)}
                              className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-white font-medium text-sm">{item.symbol.replace('.IS', '')}</p>
                                  <p className="text-white/45 text-xs truncate">{item.name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-white/50">{item.exchange}</p>
                                  <p className="text-[11px] text-primary/80">Karşılaştır</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-white/70 hover:text-white"
                title="Tema değiştir"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/settings')}
                className="text-white/70 hover:text-white relative"
                title="Bildirimler"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-danger text-[10px] font-semibold text-white px-1 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-white/70 hover:text-white"
              >
                <LogOut className="w-5 h-5 md:mr-2" />
                <span className="hidden md:inline">Çıkış</span>
              </Button>
            </div>
          </header>

          <main className={cn('flex-1', compactMode ? 'p-4 md:p-5' : 'p-4 md:p-6')}>
            <div
              className={cn(compactMode ? 'space-y-4' : 'space-y-6')}
            >
              <div className="md:hidden flex items-center gap-2 text-white/50 text-xs mb-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Gerçek zamanlı veri akışı aktif
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
