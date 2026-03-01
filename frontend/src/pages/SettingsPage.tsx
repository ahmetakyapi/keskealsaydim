import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Palette,
  Shield,
  Trash2,
  Camera,
  Mail,
  Phone,
  MapPin,
  Save,
  Moon,
  Sun,
  Smartphone,
  Globe,
  Lock,
  Key,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/lib/utils';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    dailySummary: true,
    marketNews: false,
    portfolioUpdates: true,
    weeklyReport: false,
  });

  const [security, setSecurity] = useState({
    twoFactor: false,
    loginAlerts: true,
    sessionTimeout: true,
  });

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <motion.div
      className="space-y-6 max-w-4xl"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Ayarlar</h1>
        <p className="text-white/60">Hesap ve uygulama ayarlarını yönet</p>
      </motion.div>

      {/* Profile Settings */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Profil Bilgileri</CardTitle>
              <p className="text-white/40 text-sm mt-1">Kişisel bilgilerini güncelle</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar size="xl">
                  <AvatarImage src={undefined} />
                  <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
                <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{user?.name}</h3>
                <p className="text-white/60 text-sm">{user?.email}</p>
                <Badge variant="default" className="mt-2">
                  Pro Üye
                </Badge>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input defaultValue={user?.name} icon={<User className="w-4 h-4" />} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue={user?.email} disabled icon={<Mail className="w-4 h-4" />} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input placeholder="+90 5XX XXX XX XX" icon={<Phone className="w-4 h-4" />} />
              </div>
              <div className="space-y-2">
                <Label>Konum</Label>
                <Input placeholder="İstanbul, Türkiye" icon={<MapPin className="w-4 h-4" />} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="gradient">
                <Save className="w-4 h-4 mr-2" />
                Değişiklikleri Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Settings */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <CardTitle>Bildirim Tercihleri</CardTitle>
              <p className="text-white/40 text-sm mt-1">Hangi bildirimleri almak istediğini seç</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              {
                key: 'priceAlerts',
                icon: Bell,
                label: 'Fiyat Alarmları',
                description: 'Hedef fiyata ulaşıldığında bildirim al',
              },
              {
                key: 'dailySummary',
                icon: Mail,
                label: 'Günlük Özet',
                description: 'Her gün portföy özetini email olarak al',
              },
              {
                key: 'marketNews',
                icon: Globe,
                label: 'Piyasa Haberleri',
                description: 'Önemli piyasa haberlerinden haberdar ol',
              },
              {
                key: 'portfolioUpdates',
                icon: Smartphone,
                label: 'Portföy Güncellemeleri',
                description: 'Varlıklarındaki önemli değişiklikler',
              },
              {
                key: 'weeklyReport',
                icon: CheckCircle2,
                label: 'Haftalık Rapor',
                description: 'Her hafta performans raporu al',
              },
            ].map((item) => {
              const Icon = item.icon;
              const isEnabled = notifications[item.key as keyof typeof notifications];

              return (
                <motion.div
                  key={item.key}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                  className="flex items-center justify-between py-4 px-4 -mx-4 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      isEnabled ? "bg-primary/20" : "bg-white/5"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5 transition-colors",
                        isEnabled ? "text-primary" : "text-white/40"
                      )} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{item.label}</p>
                      <p className="text-white/40 text-sm">{item.description}</p>
                    </div>
                  </div>
                  <Toggle
                    checked={isEnabled}
                    onChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle>Görünüm</CardTitle>
              <p className="text-white/40 text-sm mt-1">Uygulama temasını özelleştir</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'dark', label: 'Koyu Tema', icon: Moon, bg: 'bg-surface' },
                { value: 'light', label: 'Açık Tema', icon: Sun, bg: 'bg-gray-100' },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = theme === t.value;

                return (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value as 'dark' | 'light')}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all overflow-hidden group",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    {/* Preview */}
                    <div className={cn(
                      "w-full h-24 rounded-lg mb-4 flex items-center justify-center",
                      t.bg
                    )}>
                      <Icon className={cn(
                        "w-8 h-8",
                        t.value === 'dark' ? "text-white" : "text-gray-800"
                      )} />
                    </div>

                    {/* Label */}
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{t.label}</span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <motion.div
                        layoutId="theme-indicator"
                        className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security Settings */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div>
              <CardTitle>Güvenlik</CardTitle>
              <p className="text-white/40 text-sm mt-1">Hesap güvenliğini yönet</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              {
                key: 'twoFactor',
                icon: Key,
                label: 'İki Faktörlü Kimlik Doğrulama',
                description: 'Ekstra güvenlik katmanı ekle',
              },
              {
                key: 'loginAlerts',
                icon: Bell,
                label: 'Giriş Bildirimleri',
                description: 'Yeni cihazdan giriş yapıldığında bildir',
              },
              {
                key: 'sessionTimeout',
                icon: Lock,
                label: 'Otomatik Oturum Kapatma',
                description: '30 dakika işlem yapılmazsa çıkış yap',
              },
            ].map((item) => {
              const Icon = item.icon;
              const isEnabled = security[item.key as keyof typeof security];

              return (
                <motion.div
                  key={item.key}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                  className="flex items-center justify-between py-4 px-4 -mx-4 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      isEnabled ? "bg-success/20" : "bg-white/5"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5 transition-colors",
                        isEnabled ? "text-success" : "text-white/40"
                      )} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{item.label}</p>
                      <p className="text-white/40 text-sm">{item.description}</p>
                    </div>
                  </div>
                  <Toggle
                    checked={isEnabled}
                    onChange={(checked) =>
                      setSecurity((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </motion.div>
              );
            })}

            <div className="pt-4 mt-4 border-t border-white/5">
              <Button variant="outline" className="border-white/20 text-white">
                <Key className="w-4 h-4 mr-2" />
                Şifremi Değiştir
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div variants={fadeInUp}>
        <Card className="border-danger/20">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-danger" />
            </div>
            <div>
              <CardTitle className="text-danger">Tehlikeli Bölge</CardTitle>
              <p className="text-white/40 text-sm mt-1">Bu işlemler geri alınamaz</p>
            </div>
          </CardHeader>
          <CardContent>
            <GlassCard className="p-4 bg-danger/5 border-danger/20">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white font-medium mb-1">Hesabı Sil</h4>
                  <p className="text-white/60 text-sm">
                    Hesabını silersen tüm veriler kalıcı olarak silinir ve geri alınamaz.
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Hesabımı Sil
                </Button>
              </div>
            </GlassCard>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
