import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  PanelLeft,
  Settings,
  Star,
  Sun,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BrandLogo } from '@/components/BrandLogo';
import { SymbolSearch } from '@/components/SymbolSearch';
import { PageTransition } from '@/components/Motion';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, type Theme } from '@/stores/themeStore';
import { authService } from '@/services/authService';
import { useUserProfile } from '@/hooks/useQueries';
import { cn, EASE_BRAND, initialsOf } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

const NAVIGATION = [
  { name: 'Panel', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Karşılaştır', href: '/compare', icon: GitCompare },
  { name: 'Portföyüm', href: '/portfolio', icon: Wallet },
  { name: 'İzleme Listem', href: '/watchlist', icon: Star },
  { name: 'Piyasa', href: '/market', icon: BarChart3 },
  { name: 'Fiyat Alarmları', href: '/alerts', icon: Bell },
] as const;

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Açık', icon: Sun },
  { value: 'dark', label: 'Koyu', icon: Moon },
  { value: 'system', label: 'Sistem', icon: Monitor },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, refreshToken } = useAuthStore();
  const { theme, resolvedTheme, setTheme } = useThemeStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const reduced = usePrefersReducedMotion();

  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // Keeps the shell's name/avatar/badge in step with the server.
  const { data: profile } = useUserProfile();
  const currentUser = profile ?? user;
  const unreadCount = currentUser?.unreadNotifications ?? 0;
  const compactMode = Boolean(currentUser?.settings?.compactMode);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // The drawer is off-canvas rather than unmounted, so without this its links
  // stay in the tab order and keyboard users tab into an invisible menu.
  useEffect(() => {
    if (!mobileOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [mobileOpen]);

  // ⌘K / Ctrl+K focuses the symbol search, the way every other market app works.
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.querySelector('input')?.focus();
      }
    }
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch {
      // A failed revoke must not trap the user in a signed-in shell.
    } finally {
      logout();
      window.location.replace('/');
    }
  };

  const isActiveRoute = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const activePage = NAVIGATION.find((item) => isActiveRoute(item.href));

  // `scope` keeps the desktop sidebar's and the drawer's indicators apart,
  // otherwise opening the drawer would fly the pill across the screen.
  const renderNav = (collapsed: boolean, scope: string) => (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Ana gezinme">
      {NAVIGATION.map((item, index) => {
        const active = isActiveRoute(item.href);
        const link = (
          <Link
            key={item.href}
            to={item.href}
            aria-current={active ? 'page' : undefined}
            style={{ animationDelay: `${index * 40}ms` }}
            className={cn(
              'group relative flex animate-fade-in items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              collapsed && 'justify-center',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && (
              <motion.span
                layoutId={reduced ? undefined : `nav-active-${scope}`}
                aria-hidden="true"
                className="absolute inset-0 rounded-xl border border-primary/25 bg-primary/12"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              >
                <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />
              </motion.span>
            )}
            {!active && (
              <span
                aria-hidden="true"
                className="absolute inset-0 scale-95 rounded-xl bg-accent opacity-0 transition-[opacity,transform] duration-300 group-hover:scale-100 group-hover:opacity-100"
              />
            )}
            <item.icon
              className="relative h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110"
              aria-hidden="true"
            />
            {!collapsed && <span className="relative ml-3 truncate">{item.name}</span>}
            {collapsed && <span className="sr-only">{item.name}</span>}
          </Link>
        );

        if (!collapsed) return link;

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.name}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );

  const renderSidebarBody = (collapsed: boolean, showCloseButton: boolean, scope: string) => (
    <>
      <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4">
        <Link to="/dashboard" className="flex items-center gap-3" aria-label="Panele git">
          <BrandLogo showText={!collapsed} />
        </Link>
        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Menüyü kapat"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {renderNav(collapsed, scope)}

      <div className="border-t border-border p-3">
        <Link
          to="/settings"
          className={cn(
            'flex items-center rounded-xl border p-2 transition-colors',
            collapsed ? 'justify-center' : 'gap-3',
            isActiveRoute('/settings')
              ? 'border-primary/25 bg-primary/12'
              : 'border-transparent hover:bg-accent'
          )}
        >
          <Avatar size="sm">
            {currentUser?.avatarUrl && <AvatarImage src={currentUser.avatarUrl} alt="" />}
            <AvatarFallback>{initialsOf(currentUser?.name)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {currentUser?.name ?? 'Hesabım'}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {currentUser?.email}
              </span>
            </span>
          )}
          {collapsed && <span className="sr-only">Ayarlar</span>}
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only-focusable fixed left-4 top-4 z-[60] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        İçeriğe atla
      </a>

      {/* Backdrop + drawer. Unmounted when closed, which also keeps the
          drawer's links out of the tab order. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
        {mobileOpen && (
          <motion.div
            key="drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Gezinme menüsü"
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl md:hidden"
            initial={reduced ? false : { x: '-100%' }}
            animate={{ x: 0 }}
            exit={reduced ? undefined : { x: '-100%' }}
            transition={{ duration: 0.45, ease: EASE_BRAND }}
          >
            {renderSidebarBody(false, true, 'drawer')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] md:flex',
          sidebarCollapsed ? 'w-[84px]' : 'w-64'
        )}
      >
        {renderSidebarBody(sidebarCollapsed, false, 'desktop')}
        <button
          type="button"
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          aria-label={sidebarCollapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      <div className={cn('flex min-h-dvh flex-col transition-[padding]', sidebarCollapsed ? 'md:pl-[84px]' : 'md:pl-64')}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-surface/85 px-3 backdrop-blur-xl md:px-6">
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
            aria-expanded={mobileOpen}
          >
            <PanelLeft className="h-5 w-5" />
          </Button>

          <h2 className="hidden h-5 shrink-0 overflow-hidden text-sm font-medium text-muted-foreground lg:block">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={activePage?.name ?? location.pathname}
                className="block"
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE_BRAND }}
              >
                {activePage?.name ?? (isActiveRoute('/settings') ? 'Ayarlar' : '')}
              </motion.span>
            </AnimatePresence>
          </h2>

          <div ref={searchInputRef} className="ml-auto w-full max-w-sm md:mx-4">
            <SymbolSearch
              label="Hisse ara"
              hideLabel
              placeholder="Hisse ara  (⌘K)"
              onSelect={(result) => navigate(`/stocks/${encodeURIComponent(result.symbol)}`)}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate('/notifications')}
              aria-label={
                unreadCount > 0 ? `Bildirimler, ${unreadCount} okunmamış` : 'Bildirimler'
              }
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-danger-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Hesap menüsü">
                  <Avatar size="sm">
                    {currentUser?.avatarUrl && <AvatarImage src={currentUser.avatarUrl} alt="" />}
                    <AvatarFallback>{initialsOf(currentUser?.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <span className="block truncate text-sm font-medium text-foreground">
                    {currentUser?.name}
                  </span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {currentUser?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuLabel>Görünüm</DropdownMenuLabel>
                {THEME_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => setTheme(option.value)}
                    className={cn(theme === option.value && 'bg-accent text-accent-foreground')}
                  >
                    <option.icon className="h-4 w-4" aria-hidden="true" />
                    {option.label}
                    {option.value === 'system' && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {resolvedTheme === 'dark' ? 'Koyu' : 'Açık'}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/settings')}>
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Ayarlar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/settings#hesap')}>
                  <User className="h-4 w-4" aria-hidden="true" />
                  Hesap Bilgilerim
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive disabled={loggingOut} onSelect={() => void handleLogout()}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className={cn('flex-1 focus:outline-none', compactMode ? 'p-3 md:p-4' : 'p-4 md:p-6')}
        >
          <PageTransition
            key={location.pathname}
            className={cn('mx-auto w-full max-w-7xl', compactMode ? 'space-y-4' : 'space-y-6')}
          >
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
