import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrandLogo } from '@/components/BrandLogo';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn, isValidEmail } from '@/lib/utils';
import type { ExperienceLevel } from '@/types';

const EXPERIENCE_LEVELS: Array<{ value: ExperienceLevel; label: string }> = [
  { value: 'BEGINNER', label: 'Yeni Başlayan' },
  { value: 'INTERMEDIATE', label: 'Orta Seviye' },
  { value: 'ADVANCED', label: 'İleri Seviye' },
  { value: 'EXPERT', label: 'Uzman' },
];

const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignores bytes past 72; the server rejects longer, so say so here.
const MAX_PASSWORD_BYTES = 72;

function passwordChecks(password: string) {
  return [
    { label: `En az ${MIN_PASSWORD_LENGTH} karakter`, ok: password.length >= MIN_PASSWORD_LENGTH },
    { label: 'En az bir harf', ok: /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(password) },
    { label: 'En az bir rakam', ok: /\d/.test(password) },
  ];
}

export default function RegisterPage() {
  useDocumentTitle('Kayıt Ol');
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('BEGINNER');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const checks = useMemo(() => passwordChecks(password), [password]);
  const passwordStrong = checks.every((check) => check.ok);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    const trimmedName = name.trim();

    // Count characters, not bytes — "Ayşe" is 4 characters.
    if ([...trimmedName].length < 2) nextErrors.name = 'Ad en az 2 karakter olmalı';
    else if ([...trimmedName].length > 100) nextErrors.name = 'Ad en fazla 100 karakter olabilir';

    if (!email.trim()) nextErrors.email = 'E-posta adresi gerekli';
    else if (!isValidEmail(email)) nextErrors.email = 'Geçerli bir e-posta adresi girin';

    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı`;
    } else if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
      nextErrors.password = 'Şifre çok uzun, daha kısa bir şifre seçin';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await authService.register({
        name: trimmedName,
        email: email.trim(),
        password,
        experienceLevel,
      });
      setAuth(response.user, response.accessToken, response.refreshToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrors({ form: getApiErrorMessage(err, 'Kayıt oluşturulamadı, lütfen tekrar deneyin.') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Ana sayfaya dön
      </Link>

      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <BrandLogo size="lg" showText={false} />
            <h1 className="mt-4 text-xl font-semibold tracking-tight">Ücretsiz Hesap Oluşturun</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Portföyünüzü takip edin, senaryolarınızı kaydedin ve paylaşın.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <Label htmlFor="register-name">Ad Soyad</Label>
              <Input
                id="register-name"
                name="name"
                autoComplete="name"
                autoFocus
                placeholder="Adınız Soyadınız"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (errors.name) setErrors((current) => ({ ...current, name: '' }));
                }}
                error={errors.name}
                icon={<User className="h-4 w-4" />}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="register-email">E-posta</Label>
              <Input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="ornek@eposta.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errors.email) setErrors((current) => ({ ...current, email: '' }));
                }}
                error={errors.email}
                icon={<Mail className="h-4 w-4" />}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="register-password">Şifre</Label>
              <Input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) setErrors((current) => ({ ...current, password: '' }));
                }}
                error={errors.password}
                icon={<Lock className="h-4 w-4" />}
                className="mt-1.5"
                trailing={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                }
              />

              {password.length > 0 && (
                <ul className="mt-2 space-y-1" aria-live="polite">
                  {checks.map((check) => (
                    <li
                      key={check.label}
                      className={cn(
                        'flex items-center gap-1.5 text-xs',
                        check.ok ? 'text-success' : 'text-muted-foreground'
                      )}
                    >
                      <Check
                        className={cn('h-3 w-3', !check.ok && 'opacity-40')}
                        aria-hidden="true"
                      />
                      {check.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <Label htmlFor="register-experience">Yatırım Deneyiminiz</Label>
              <Select
                value={experienceLevel}
                onValueChange={(value) => setExperienceLevel(value as ExperienceLevel)}
              >
                <SelectTrigger id="register-experience" className="mt-1.5">
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
                Arayüzdeki açıklamaların ayrıntı düzeyini belirler. Sonradan değiştirebilirsiniz.
              </p>
            </div>

            {errors.form && (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {errors.form}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={submitting}
              disabled={!passwordStrong && password.length > 0}
            >
              Hesap Oluştur
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Giriş Yapın
            </Link>
          </p>
        </CardContent>
      </Card>

      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
        Keşke Alsaydım yatırım tavsiyesi vermez; gösterilen veriler bilgilendirme amaçlıdır.
      </p>
    </div>
  );
}
