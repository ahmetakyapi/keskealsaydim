import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/BrandLogo';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getApiErrorMessage } from '@/lib/api-error';
import { isValidEmail } from '@/lib/utils';

/** Safe post-login destination: internal paths only, never an absolute URL. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw;
}

export default function LoginPage() {
  useDocumentTitle('Giriş Yap');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const next = safeNext(searchParams.get('next'));

  // The interceptor appends `reason=expired` when it ends a stale session.
  useEffect(() => {
    if (searchParams.get('reason') === 'expired') {
      toast.info('Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.');
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = 'E-posta adresi gerekli';
    else if (!isValidEmail(email)) nextErrors.email = 'Geçerli bir e-posta adresi girin';
    if (!password) nextErrors.password = 'Şifre gerekli';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await authService.login({ email: email.trim(), password });
      setAuth(response.user, response.accessToken, response.refreshToken);
      navigate(next, { replace: true });
    } catch (err) {
      // Stays on the page with the typed e-mail intact; a 401 here means
      // "wrong password", which the interceptor no longer treats as a
      // session expiry.
      setErrors({ form: getApiErrorMessage(err, 'Giriş yapılamadı, lütfen tekrar deneyin.') });
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
            <h1 className="mt-4 text-xl font-semibold tracking-tight">Tekrar Hoş Geldiniz</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Portföyünüze ve senaryolarınıza erişmek için giriş yapın.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <Label htmlFor="login-email">E-posta</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                inputMode="email"
                placeholder="ornek@eposta.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                }}
                error={errors.email}
                icon={<Mail className="h-4 w-4" />}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="login-password">Şifre</Label>
              <Input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
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
            </div>

            {errors.form && (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {errors.form}
              </p>
            )}

            <Button type="submit" className="w-full" loading={submitting}>
              Giriş Yap
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Ücretsiz Kayıt Olun
            </Link>
          </p>
        </CardContent>
      </Card>

      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
        Şifrenizi unuttuysanız şu an için sıfırlama yapamıyoruz; destek için bize ulaşın.
      </p>
    </div>
  );
}
