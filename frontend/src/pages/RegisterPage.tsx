import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/card';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';

const experienceLevels = [
  { value: 'BEGINNER', label: 'Yeni Başlayan', description: 'Yatırıma yeni başlıyorum' },
  { value: 'INTERMEDIATE', label: 'Orta Seviye', description: '1-3 yıl deneyimim var' },
  { value: 'ADVANCED', label: 'İleri Seviye', description: '3+ yıl aktif yatırımcıyım' },
  { value: 'EXPERT', label: 'Uzman', description: 'Profesyonel yatırımcıyım' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('BEGINNER');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { name?: string; email?: string; password?: string } = {};

    if (!name || name.length < 2) {
      newErrors.name = 'Ad en az 2 karakter olmalıdır';
    }

    if (!email) {
      newErrors.email = 'Email gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Geçerli bir email adresi giriniz';
    }

    if (!password || password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await authService.register({ name, email, password, experienceLevel });
      setAuth(response.user, response.accessToken, response.refreshToken);
      toast.success('Hesabınız oluşturuldu!');
      navigate('/dashboard');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Kayıt başarısız. Lütfen tekrar deneyin.'));
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const strengthLabels = ['Çok zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok güçlü'];

  return (
    <div className="min-h-screen bg-surface-dark flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/" aria-label="Keşke Alsaydım ana sayfa">
              <BrandLogo />
            </Link>
          </div>

          <GlassCard className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Hesap Oluştur</h2>
              <p className="text-white/60">Yatırım yolculuğuna hemen başla</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/80">Ad Soyad</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ahmet Yılmaz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                  icon={<User className="w-4 h-4" />}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  icon={<Mail className="w-4 h-4" />}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80">Şifre</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="En az 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                    icon={<Lock className="w-4 h-4" />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full ${
                            i < passwordStrength() ? strengthColors[passwordStrength() - 1] : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-white/40">
                      Şifre gücü: {strengthLabels[passwordStrength() - 1] || 'Çok zayıf'}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">Yatırım Deneyimi</Label>
                <div className="grid grid-cols-2 gap-2">
                  {experienceLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setExperienceLevel(level.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        experienceLevel === level.value
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-white/10 hover:border-white/20 text-white/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{level.label}</span>
                        {experienceLevel === level.value && (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs opacity-60 mt-1">{level.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" variant="gradient" className="w-full" size="lg" loading={isLoading}>
                Hesap Oluştur
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-white/40">veya</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-white/20 text-white"
                size="lg"
                onClick={() => toast.error('Google ile kayit henuz hazir degil.')}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google ile devam et
              </Button>

              <p className="text-center text-white/60 text-sm mt-6">
                Zaten hesabın var mı?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Giriş yap
                </Link>
              </p>

              <p className="text-center text-white/40 text-xs mt-4">
                Hesap oluşturarak{' '}
                <button
                  type="button"
                  onClick={() => toast.error('Kullanim sartlari sayfasi henuz hazir degil.')}
                  className="text-primary hover:underline"
                >
                  Kullanım Şartları
                </button>
                {' '}ve{' '}
                <button
                  type="button"
                  onClick={() => toast.error('Gizlilik politikasi sayfasi henuz hazir degil.')}
                  className="text-primary hover:underline"
                >
                  Gizlilik Politikası
                </button>
                'nı kabul etmiş olursunuz.
              </p>
            </form>
          </GlassCard>
        </motion.div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
        <div className="absolute top-1/4 -right-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-1/4 w-96 h-96 bg-secondary/30 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center p-12 w-full">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/" className="flex items-center space-x-3 mb-12">
              <BrandLogo size="lg" />
            </Link>

            <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
              Yatırım Fırsatlarını Keşfet
            </h1>
            <p className="text-xl text-white/60 mb-12">
              Geçmişteki kararlarını analiz et, gelecekteki yatırımlarında daha bilinçli ol.
            </p>

            <div className="space-y-4">
              {[
                'Hisse karşılaştırmaları yap',
                'Portföyünü anlık takip et',
                'Detaylı analizlerle karar al',
                'Kaçırdığın fırsatları gör',
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  </div>
                  <span className="text-white/80">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
