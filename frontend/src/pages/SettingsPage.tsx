import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Palette,
  Save,
  RefreshCw,
  Globe,
  Mail,
  Smartphone,
  Sparkles,
  SlidersHorizontal,
  Moon,
  Sun,
  MonitorSmartphone,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useUserProfile, useUpdateProfile } from '@/hooks/useQueries';
import type { UserSettings } from '@/types';
import { cn, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const DEFAULT_SETTINGS: UserSettings = {
  notifyPriceAlerts: true,
  notifyDailySummary: true,
  notifyWeeklyReport: false,
  notifyNews: true,
  emailNotifications: true,
  pushNotifications: true,
  compactMode: false,
};

const EXPERIENCE_OPTIONS = [
  { value: 'BEGINNER', label: 'Yeni Başlayan' },
  { value: 'INTERMEDIATE', label: 'Orta Seviye' },
  { value: 'ADVANCED', label: 'İleri Seviye' },
  { value: 'EXPERT', label: 'Uzman' },
] as const;

const CURRENCY_OPTIONS = [
  { value: 'TRY', label: 'Türk Lirası (TRY)' },
  { value: 'USD', label: 'ABD Doları (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
] as const;

type ThemeMode = 'dark' | 'light' | 'system';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const profileQuery = useUserProfile();
  const updateProfile = useUpdateProfile();

  const loading = profileQuery.isLoading;
  const refreshing = profileQuery.isFetching && !profileQuery.isLoading;

  const [name, setName] = useState(user?.name ?? '');
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel ?? 'BEGINNER');
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferredCurrency ?? 'TRY');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Sync form state when profile data changes
  const profileData = profileQuery.data;
  useEffect(() => {
    const nextUser = profileData ?? user;
    if (!nextUser) return;

    setName(nextUser.name ?? '');
    setExperienceLevel(nextUser.experienceLevel ?? 'BEGINNER');
    setPreferredCurrency(nextUser.preferredCurrency ?? 'TRY');
    setSettings({ ...DEFAULT_SETTINGS, ...(nextUser.settings ?? {}) });

    if (
      nextUser.theme === 'dark' ||
      nextUser.theme === 'light' ||
      nextUser.theme === 'system'
    ) {
      setTheme(nextUser.theme);
    }
  }, [profileData, user, setTheme]);

  const handleSaveProfile = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error('Ad en az 2 karakter olmalı.');
      return;
    }

    try {
      const updated = await updateProfile.mutateAsync({
        name: trimmedName,
        experienceLevel,
        preferredCurrency,
      });
      useAuthStore.getState().updateUser(updated);
      toast.success('Profil bilgileri kaydedildi.');
    } catch {
      toast.error('Profil güncellenemedi.');
    }
  };

  const handleSavePreferences = async () => {
    try {
      const updated = await updateProfile.mutateAsync({ settings });
      useAuthStore.getState().updateUser(updated);
      toast.success('Bildirim tercihleri kaydedildi.');
    } catch {
      toast.error('Bildirim tercihleri güncellenemedi.');
    }
  };

  const handleSaveAppearance = async () => {
    try {
      const updated = await updateProfile.mutateAsync({
        theme,
        settings: { compactMode: settings.compactMode },
      });
      useAuthStore.getState().updateUser(updated);
      toast.success('Görünüm tercihleri kaydedildi.');
    } catch {
      toast.error('Görünüm tercihleri güncellenemedi.');
    }
  };

  const unreadNotifications = user?.unreadNotifications ?? 0;

  const notificationItems = useMemo(
    () => [
      {
        key: 'notifyPriceAlerts' as const,
        icon: Bell,
        title: 'Fiyat alarmları',
        description: 'Hedef fiyata ulaşıldığında haber ver',
      },
      {
        key: 'notifyDailySummary' as const,
        icon: Sparkles,
        title: 'Günlük özet',
        description: 'Portföy değişimini günlük olarak gönder',
      },
      {
        key: 'notifyWeeklyReport' as const,
        icon: SlidersHorizontal,
        title: 'Haftalık rapor',
        description: 'Haftalık performans özeti oluştur',
      },
      {
        key: 'notifyNews' as const,
        icon: Globe,
        title: 'Piyasa haberleri',
        description: 'Önemli gelişmelerde anlık bilgilendir',
      },
      {
        key: 'emailNotifications' as const,
        icon: Mail,
        title: 'E-posta bildirimi',
        description: 'Bildirimleri e-posta ile de ilet',
      },
      {
        key: 'pushNotifications' as const,
        icon: Smartphone,
        title: 'Push bildirimi',
        description: 'Mobil/masaüstü push bildirimi gönder',
      },
    ],
    []
  );

  const getInitials = (fullName?: string) => {
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <motion.div
        className="space-y-6 max-w-6xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="skeleton-shimmer rounded-2xl p-6 md:p-8 space-y-4">
          <div className="space-y-3">
            <div className="w-48 h-7 rounded-lg skeleton-shimmer" />
            <div className="w-72 h-4 rounded-lg skeleton-shimmer" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="skeleton-shimmer rounded-2xl p-6 space-y-4">
            <div className="w-28 h-5 rounded-lg skeleton-shimmer" />
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full skeleton-shimmer" />
              <div className="space-y-2">
                <div className="w-32 h-4 rounded-lg skeleton-shimmer" />
                <div className="w-40 h-3 rounded-lg skeleton-shimmer" />
              </div>
            </div>
          </div>
          <div className="xl:col-span-2 skeleton-shimmer rounded-2xl p-6 space-y-4">
            <div className="w-32 h-5 rounded-lg skeleton-shimmer" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={`settings-sk-${i}`} className="space-y-2">
                  <div className="w-20 h-3 rounded-lg skeleton-shimmer" />
                  <div className="w-full h-10 rounded-lg skeleton-shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="skeleton-shimmer rounded-2xl p-6 space-y-3">
          <div className="w-40 h-5 rounded-lg skeleton-shimmer" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`notif-sk-${i}`} className="skeleton-shimmer rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
                <div className="space-y-2">
                  <div className="w-24 h-3 rounded-lg skeleton-shimmer" />
                  <div className="w-40 h-3 rounded-lg skeleton-shimmer" />
                </div>
              </div>
              <div className="w-10 h-6 rounded-full skeleton-shimmer" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6 max-w-6xl"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeInUp}>
        <GlassCard className="relative overflow-hidden p-6 md:p-8 border-primary/20 border-breathing">
          <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Hesap Ayarları</h1>
              <p className="text-white/65 text-sm md:text-base">
                Tüm tercihleriniz gerçek kullanıcı verisi olarak kaydedilir.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {user?.email ?? 'Kullanıcı'}
              </Badge>
              <Badge variant={unreadNotifications > 0 ? 'warning' : 'outline'} className="text-xs">
                {unreadNotifications > 0
                  ? `${unreadNotifications} okunmamış bildirim`
                  : 'Okunmamış bildirim yok'}
              </Badge>
              <Button variant="outline" className="border-white/20 text-white" onClick={() => profileQuery.refetch()} disabled={refreshing}>
                <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
                Yenile
              </Button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-primary" />
              Hesap Özeti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar size="xl">
                <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-white font-semibold leading-none">{user?.name ?? '-'}</p>
                <p className="text-white/60 text-sm">{user?.email ?? '-'}</p>
                <Badge variant="outline" className="text-[11px] mt-1">
                  Son giriş: {user?.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Bilinmiyor'}
                </Badge>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <GlassCard className="p-3">
                <p className="text-white/50 text-xs">Deneyim</p>
                <p className="text-white font-semibold text-sm mt-1">
                  {EXPERIENCE_OPTIONS.find((x) => x.value === experienceLevel)?.label ?? experienceLevel}
                </p>
              </GlassCard>
              <GlassCard className="p-3">
                <p className="text-white/50 text-xs">Para Birimi</p>
                <p className="text-white font-semibold text-sm mt-1">{preferredCurrency}</p>
              </GlassCard>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-primary" />
              Profil Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  icon={<User className="w-4 h-4" />}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input value={user?.email ?? ''} disabled icon={<Mail className="w-4 h-4" />} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Deneyim Seviyesi</Label>
                <select
                  value={experienceLevel}
                  onChange={(event) =>
                    setExperienceLevel(
                      event.target.value as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
                    )
                  }
                  className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-surface text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Varsayılan Para Birimi</Label>
                <select
                  value={preferredCurrency}
                  onChange={(event) => setPreferredCurrency(event.target.value)}
                  className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-surface text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="gradient" onClick={handleSaveProfile} loading={updateProfile.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Profili Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-secondary" />
              Bildirim Tercihleri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {notificationItems.map((item) => {
              const Icon = item.icon;
              const enabled = settings[item.key];
              return (
                <motion.div
                  key={item.key}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center border shrink-0',
                      enabled ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-white/40'
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm">{item.title}</p>
                      <p className="text-white/45 text-xs">{item.description}</p>
                    </div>
                  </div>
                  <Toggle
                    checked={enabled}
                    onChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        [item.key]: checked,
                      }))
                    }
                  />
                </motion.div>
              );
            })}

            <div className="pt-4 flex justify-end">
              <Button variant="gradient" onClick={handleSavePreferences} loading={updateProfile.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Bildirimleri Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="w-5 h-5 text-primary" />
              Görünüm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  value: 'dark' as ThemeMode,
                  title: 'Koyu',
                  subtitle: 'Odaklı kullanım',
                  icon: Moon,
                  preview: 'bg-slate-900',
                },
                {
                  value: 'light' as ThemeMode,
                  title: 'Açık',
                  subtitle: 'Yüksek kontrast',
                  icon: Sun,
                  preview: 'bg-slate-100',
                },
                {
                  value: 'system' as ThemeMode,
                  title: 'Sistem',
                  subtitle: 'Cihaz tercihi',
                  icon: MonitorSmartphone,
                  preview: 'bg-gradient-to-r from-slate-900 to-slate-100',
                },
              ].map((item) => {
                const Icon = item.icon;
                const selected = theme === item.value;

                return (
                  <button
                    key={item.value}
                    onClick={() => setTheme(item.value)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-white/10 bg-white/5 hover:border-white/25'
                    )}
                  >
                    <div className={cn('h-20 rounded-lg mb-3 border border-white/10', item.preview)} />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {item.title}
                        </p>
                        <p className="text-white/45 text-xs mt-1">{item.subtitle}</p>
                      </div>
                      {selected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <GlassCard className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-medium text-sm">Kompakt Mod</p>
                <p className="text-white/45 text-xs">Daha sıkı satır yüksekliği ve yoğun yerleşim</p>
              </div>
              <Toggle
                checked={settings.compactMode}
                onChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    compactMode: checked,
                  }))
                }
              />
            </GlassCard>

            <div className="flex justify-end">
              <Button variant="gradient" onClick={handleSaveAppearance} loading={updateProfile.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Görünümü Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
