import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/card';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Geçerli bir email adresi giriniz';
    }

    if (!password) {
      newErrors.password = 'Şifre gereklidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      setAuth(response.user, response.accessToken, response.refreshToken);
      toast.success('Giriş başarılı!');
      navigate('/dashboard');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Giriş başarısız. Lütfen bilgilerini kontrol et.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-secondary/30 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center p-12 w-full">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/" className="flex items-center space-x-3 mb-12">
              <BrandLogo size="lg" />
            </Link>

            <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
              Tekrar hoş geldin!
            </h1>
            <p className="text-xl text-white/60 mb-12">
              Portföyünü takip etmeye ve yatırım fırsatlarını keşfetmeye devam et.
            </p>

            {/* Animated chart preview */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-white/60 text-sm">Portföy Değeri</span>
                <span className="text-success text-sm font-medium">+12.5%</span>
              </div>
              <div className="h-24 flex items-end gap-1">
                {[40, 55, 45, 60, 50, 70, 65, 80, 75, 90, 85, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="flex-1 bg-gradient-to-t from-primary to-secondary rounded-t"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Login form */}
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
              <h2 className="text-2xl font-bold text-white mb-2">Giriş Yap</h2>
              <p className="text-white/60">Hesabına giriş yaparak devam et</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="••••••••"
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
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-white/45">Oturum bu tarayicida korunur.</p>
                <button
                  type="button"
                  onClick={() => toast.error('Sifre sifirlama akisi henuz hazir degil.')}
                  className="text-sm text-primary hover:underline"
                >
                  Şifremi unuttum
                </button>
              </div>

              <Button type="submit" variant="gradient" className="w-full" size="lg" loading={isLoading}>
                Giriş Yap
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
                onClick={() => toast.error('Google ile giris henuz hazir degil.')}
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
                Hesabın yok mu?{' '}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Ücretsiz kayıt ol
                </Link>
              </p>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
