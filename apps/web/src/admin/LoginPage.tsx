import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Seo } from '../components/Seo.js';
import { Field, inputClass } from '../components/Field.js';
import { Button } from '../components/motion/Button.js';
import { LanguageSwitch } from '../components/LanguageSwitch.js';
import { Logo } from '../components/Navbar.js';
import { useAdminSession } from './session.js';
import { adminErrorKey } from './messages.js';

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'admin.errors.required')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'admin.errors.email'),
  password: z.string().min(8, 'admin.errors.passwordShort').max(200),
});
type LoginValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const session = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin/products';
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: { email: '', password: '' } });

  if (session.status === 'signedIn') return <Navigate to={from} replace />;

  const msg = (key?: string) => (key ? t(key) : undefined);

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await session.signIn(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(t(adminErrorKey(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Seo title={t('admin.login.title')} description={t('admin.login.title')} path="/admin/login" noindex />
      <div className="relative isolate flex min-h-screen items-center justify-center px-4 py-10">
        <div aria-hidden className="bg-grid absolute inset-0 -z-10" />
        <div className="absolute left-4 top-4 md:left-6">
          <Logo compact />
        </div>
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <LanguageSwitch />
        </div>
        <div className="glass w-full max-w-md rounded-[2rem] p-6 md:p-8">
          <p className="eyebrow">{t('admin.title')}</p>
          <h1 className="t-h2 mt-4 text-ink">{t('admin.login.title')}</h1>
          <span aria-hidden className="accent-bar mt-4" />
          <p className="mt-2 text-sm text-muted">{t('admin.login.subtitle')}</p>
          {formError ? (
            <p role="alert" className="mt-5 rounded-xl border border-sale bg-card p-3 text-sm font-semibold text-sale">
              {formError}
            </p>
          ) : null}
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            <Field label={t('admin.login.email')} error={msg(errors.email?.message)}>
              {(p) => (
                <input
                  id={p.id}
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  className={inputClass}
                  aria-describedby={p.describedBy}
                  aria-invalid={p.invalid}
                  {...register('email')}
                />
              )}
            </Field>
            <Field label={t('admin.login.password')} error={msg(errors.password?.message)}>
              {(p) => (
                <input
                  id={p.id}
                  type="password"
                  autoComplete="current-password"
                  className={inputClass}
                  aria-describedby={p.describedBy}
                  aria-invalid={p.invalid}
                  {...register('password')}
                />
              )}
            </Field>
            <Button type="submit" className="w-full" disabled={submitting} aria-busy={submitting}>
              {submitting ? t('admin.login.submitting') : t('admin.login.submit')}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
