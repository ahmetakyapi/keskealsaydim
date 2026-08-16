import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Bell,
  KeyRound,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Save,
  Sun,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/ui/page-header';
import { ShimmerCard } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useChangePassword,
  useDeleteAccount,
  useUpdateProfile,
  useUserProfile,
} from '@/hooks/useQueries';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, type Theme } from '@/stores/themeStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn, formatDate, formatDateTime, initialsOf } from '@/lib/utils';
import type { ChartPeriod, ExperienceLevel, UserSettings } from '@/types';

const EXPERIENCE_LEVELS: Array<{ value: ExperienceLevel; label: string; hint: string }> = [
  { value: 'BEGINNER', label: 'Yeni Başlayan', hint: 'Temel kavramları öğreniyorum' },
  { value: 'INTERMEDIATE', label: 'Orta Seviye', hint: 'Bir süredir yatırım yapıyorum' },
  { value: 'ADVANCED', label: 'İleri Seviye', hint: 'Portföyümü aktif yönetiyorum' },
  { value: 'EXPERT', label: 'Uzman', hint: 'Profesyonel olarak ilgileniyorum' },
];

const CHART_PERIODS: Array<{ value: ChartPeriod; label: string }> = [
  { value: '1W', label: '1 Hafta' },
  { value: '1M', label: '1 Ay' },
  { value: '3M', label: '3 Ay' },
  { value: '6M', label: '6 Ay' },
  { value: '1Y', label: '1 Yıl' },
  { value: '5Y', label: '5 Yıl' },
];

const THEMES: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Açık', icon: Sun },
  { value: 'dark', label: 'Koyu', icon: Moon },
  { value: 'system', label: 'Sistem', icon: Monitor },
];

const NOTIFICATION_TOGGLES: Array<{
  key: keyof Pick<
    UserSettings,
    'notifyPriceAlerts' | 'notifyDailySummary' | 'notifyWeeklyReport' | 'notifyNews'
  >;
  label: string;
  description: string;
  /** Not every switch has a delivery mechanism behind it yet. */
  implemented: boolean;
}> = [
  {
    key: 'notifyPriceAlerts',
    label: 'Fiyat Alarmları',
    description: 'Kurduğunuz alarm tetiklendiğinde bildirim oluşturulur.',
    implemented: true,
  },
  {
    key: 'notifyDailySummary',
    label: 'Günlük Portföy Özeti',
    description: 'Gün sonunda portföyünüzün özeti gönderilir.',
    implemented: false,
  },
  {
    key: 'notifyWeeklyReport',
    label: 'Haftalık Rapor',
    description: 'Haftalık performans raporu gönderilir.',
    implemented: false,
  },
  {
    key: 'notifyNews',
    label: 'Haber Bildirimleri',
    description: 'Takip ettiğiniz hisselerle ilgili haberler bildirilir.',
    implemented: false,
  },
];

export default function SettingsPage() {
  useDocumentTitle('Ayarlar');

  const { data: profile, isLoading, isError, error, refetch, isFetching } = useUserProfile();
  const updateProfile = useUpdateProfile();
  const { theme, setTheme, hydrateFromProfile } = useThemeStore();
  const logout = useAuthStore((state) => state.logout);

  const [name, setName] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('BEGINNER');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // The server is the source of truth; local edits start from it and are
  // discarded on refetch only when they have not been touched.
  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setExperienceLevel(profile.experienceLevel);
    setSettings(profile.settings ?? null);
    hydrateFromProfile(profile.theme);
  }, [profile, hydrateFromProfile]);

  const profileDirty = useMemo(
    () =>
      Boolean(profile) &&
      (name.trim() !== profile?.name || experienceLevel !== profile?.experienceLevel),
    [name, experienceLevel, profile]
  );

  const settingsDirty = useMemo(() => {
    if (!profile?.settings || !settings) return false;
    return (Object.keys(settings) as Array<keyof UserSettings>).some(
      (key) => settings[key] !== profile.settings?.[key]
    );
  }, [settings, profile?.settings]);

  const themeDirty = Boolean(profile) && theme !== profile?.theme;
  const anyDirty = profileDirty || settingsDirty || themeDirty;

  // Guard against navigating away mid-edit.
  useEffect(() => {
    if (!anyDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [anyDirty]);

  /**
   * One save for the whole page. Splitting it into three buttons meant saving
   * one section overwrote the unsaved edits in the others, because each
   * request sent the full profile payload.
   */
  const handleSave = async () => {
    if (!profile || !anyDirty) return;

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error('Ad en az 2 karakter olmalı');
      return;
    }

    try {
      await updateProfile.mutateAsync({
        ...(profileDirty ? { name: trimmedName, experienceLevel } : {}),
        ...(themeDirty ? { theme } : {}),
        ...(settingsDirty && settings ? { settings } : {}),
      });
      toast.success('Ayarlarınız kaydedildi');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  };

  if (isError) {
    return (
      <Card>
        <ErrorState
          error={error}
          title="Ayarlar yüklenemedi"
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ayarlar"
        description="Hesap bilgileriniz, görünüm tercihleriniz ve bildirim seçenekleriniz."
        actions={
          <Button onClick={() => void handleSave()} disabled={!anyDirty} loading={updateProfile.isPending}>
            {!updateProfile.isPending && <Save className="h-4 w-4" aria-hidden="true" />}
            Değişiklikleri Kaydet
          </Button>
        }
      />

      {anyDirty && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-4 py-2.5 text-sm text-warning"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Kaydedilmemiş değişiklikleriniz var.
        </div>
      )}

      {isLoading || !profile ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ShimmerCard />
          <ShimmerCard />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Profile */}
          <Card id="hesap">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Hesap Bilgilerim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar size="xl">
                  {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
                  <AvatarFallback>{initialsOf(profile.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{profile.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant={profile.emailVerified ? 'success' : 'neutral'} size="sm">
                      {profile.emailVerified ? 'E-posta doğrulandı' : 'E-posta doğrulanmadı'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="settings-name">Ad Soyad</Label>
                <Input
                  id="settings-name"
                  value={name}
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="settings-email">E-posta</Label>
                <Input
                  id="settings-email"
                  value={profile.email}
                  readOnly
                  disabled
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  E-posta adresi şu anda değiştirilemiyor.
                </p>
              </div>

              <div>
                <Label htmlFor="settings-experience">Yatırım Deneyimi</Label>
                <Select
                  value={experienceLevel}
                  onValueChange={(value) => setExperienceLevel(value as ExperienceLevel)}
                >
                  <SelectTrigger id="settings-experience" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {EXPERIENCE_LEVELS.find((level) => level.value === experienceLevel)?.hint}
                </p>
              </div>

              <Separator />

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Üyelik Tarihi</dt>
                  <dd>{formatDate(profile.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Son Giriş</dt>
                  <dd>{profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Görünüm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Tema</legend>
                <div
                  role="radiogroup"
                  aria-label="Tema seçimi"
                  className="grid grid-cols-3 gap-2"
                >
                  {THEMES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={theme === option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border p-3 text-sm transition-colors',
                        theme === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      )}
                    >
                      <option.icon className="h-5 w-5" aria-hidden="true" />
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tema seçimi bu tarayıcıda hemen uygulanır, kaydettiğinizde hesabınıza da yazılır.
                </p>
              </fieldset>

              <Separator />

              <SettingRow
                id="setting-compact"
                label="Kompakt Mod"
                description="Kart ve tablolarda daha az boşluk kullanılır."
                checked={settings?.compactMode ?? false}
                onChange={(value) => updateSetting('compactMode', value)}
              />

              <SettingRow
                id="setting-show-value"
                label="Portföy Tutarlarını Göster"
                description="Kapalıyken portföy ekranındaki tutarlar bulanıklaştırılır."
                checked={settings?.showPortfolioValue ?? true}
                onChange={(value) => updateSetting('showPortfolioValue', value)}
              />

              <div>
                <Label htmlFor="setting-chart-period">Varsayılan Grafik Aralığı</Label>
                <Select
                  value={settings?.defaultChartPeriod ?? '1M'}
                  onValueChange={(value) => updateSetting('defaultChartPeriod', value as ChartPeriod)}
                >
                  <SelectTrigger id="setting-chart-period" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="setting-currency">Görüntüleme Para Birimi</Label>
                <Input
                  id="setting-currency"
                  value="Türk Lirası (₺)"
                  readOnly
                  disabled
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Tüm toplamlar Türk lirası cinsinden hesaplanır. Yabancı hisseler işlem günündeki
                  kurdan çevrilir.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Bildirimler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {NOTIFICATION_TOGGLES.map((item) => (
                <SettingRow
                  key={item.key}
                  id={`setting-${item.key}`}
                  label={item.label}
                  description={item.description}
                  badge={
                    item.implemented ? undefined : (
                      <Badge variant="neutral" size="sm">
                        Yakında
                      </Badge>
                    )
                  }
                  checked={settings?.[item.key] ?? false}
                  disabled={!item.implemented}
                  onChange={(value) => updateSetting(item.key, value)}
                />
              ))}

              <Separator />

              <SettingRow
                id="setting-email"
                label="E-posta Bildirimleri"
                description="Bildirimler ayrıca e-posta ile gönderilir."
                badge={
                  <Badge variant="neutral" size="sm">
                    Yakında
                  </Badge>
                }
                checked={settings?.emailNotifications ?? false}
                disabled
                onChange={(value) => updateSetting('emailNotifications', value)}
              />
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Güvenlik
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Şifre</p>
                  <p className="text-sm text-muted-foreground">
                    Şifrenizi değiştirdiğinizde tüm oturumlarınız sonlandırılır.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                  Şifre Değiştir
                </Button>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Oturumu Kapat</p>
                  <p className="text-sm text-muted-foreground">
                    Bu cihazdaki oturumunuzu sonlandırın.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logout();
                    window.location.replace('/');
                  }}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Çıkış Yap
                </Button>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.04] p-3">
                <div>
                  <p className="text-sm font-medium text-destructive">Hesabı Sil</p>
                  <p className="text-sm text-muted-foreground">
                    Portföyünüz, senaryolarınız ve tüm verileriniz kalıcı olarak silinir.
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Hesabı Sil
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}

function SettingRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  badge,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {label}
          {badge}
        </label>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <Toggle id={id} checked={checked} onChange={onChange} disabled={disabled} aria-label={label} />
    </div>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const changePassword = useChangePassword();
  const logout = useAuthStore((state) => state.logout);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (newPassword.length < 8) {
      setFormError('Yeni şifre en az 8 karakter olmalı');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('Şifreler eşleşmiyor');
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      toast.success('Şifreniz güncellendi, lütfen tekrar giriş yapın');
      logout();
      window.location.replace('/login');
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Şifre Değiştir</DialogTitle>
          <DialogDescription>
            Güvenliğiniz için şifre değişikliğinden sonra tüm cihazlarda yeniden giriş yapmanız
            gerekir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="current-password">Mevcut Şifre</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="new-password">Yeni Şifre</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">En az 8 karakter.</p>
          </div>
          <div>
            <Label htmlFor="confirm-password">Yeni Şifre (Tekrar)</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1.5"
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" loading={changePassword.isPending}>
              Şifreyi Güncelle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteAccount = useDeleteAccount();
  const logout = useAuthStore((state) => state.logout);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState('');

  const CONFIRM_PHRASE = 'HESABIMI SIL';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    try {
      await deleteAccount.mutateAsync({ password, confirm });
      logout();
      window.location.replace('/');
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Hesabı Kalıcı Olarak Sil</DialogTitle>
          <DialogDescription>
            Portföyünüz, izleme listeniz, kayıtlı senaryolarınız ve paylaşım bağlantılarınız
            silinecek. Bu işlem geri alınamaz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="delete-password">Şifreniz</Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="delete-confirm">
              Onaylamak için <span className="font-mono">{CONFIRM_PHRASE}</span> yazın
            </Label>
            <Input
              id="delete-confirm"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="mt-1.5"
              autoComplete="off"
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button
              type="submit"
              variant="destructive"
              loading={deleteAccount.isPending}
              disabled={confirm.trim().toUpperCase() !== CONFIRM_PHRASE || password.length === 0}
            >
              {deleteAccount.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Hesabımı Sil
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
