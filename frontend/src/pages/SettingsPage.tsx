import { motion } from 'framer-motion';
import { User, Bell, Palette, Globe, Shield, Key, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Ayarlar</h1>
        <p className="text-white/60">Hesap ve uygulama ayarlarını yönet</p>
      </div>

      {/* Profile Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <CardTitle>Profil Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue={user?.email} disabled />
              </div>
            </div>
            <Button variant="gradient">Değişiklikleri Kaydet</Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-secondary" />
            </div>
            <CardTitle>Bildirim Tercihleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Fiyat Alarmları', description: 'Hedef fiyata ulaşıldığında bildirim al' },
              { label: 'Günlük Özet', description: 'Her gün portföy özetini email olarak al' },
              { label: 'Piyasa Haberleri', description: 'Önemli piyasa haberlerinden haberdar ol' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-white font-medium">{item.label}</p>
                  <p className="text-white/40 text-sm">{item.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-500" />
            </div>
            <CardTitle>Görünüm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    theme === t
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`w-full h-20 rounded-lg mb-3 ${
                    t === 'dark' ? 'bg-surface' : 'bg-gray-100'
                  }`} />
                  <p className="text-white font-medium capitalize">{t === 'dark' ? 'Koyu' : 'Açık'}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-danger/20">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-danger" />
            </div>
            <CardTitle className="text-danger">Tehlikeli Bölge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 mb-4">
              Hesabını silersen tüm veriler kalıcı olarak silinir ve geri alınamaz.
            </p>
            <Button variant="destructive">Hesabımı Sil</Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
