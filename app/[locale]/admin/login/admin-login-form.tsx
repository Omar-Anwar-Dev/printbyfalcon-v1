'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginB2BAction } from '@/app/actions/auth';

/**
 * Admins use the same credentials action as B2B (email + password), but after
 * a successful login we verify the role is ADMIN — otherwise bounce to home.
 */
export function AdminLoginForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    start(async () => {
      const result = await loginB2BAction(form);
      if (!result.ok) {
        setError(t(result.errorKey as never, { default: t('common.error') }));
        return;
      }
      if (result.data.userType !== 'ADMIN') {
        setError(t('admin.unauthorized'));
        return;
      }
      router.push(
        result.data.mustChangePassword
          ? `/${locale}/admin/change-password`
          : `/${locale}/admin`,
      );
      router.refresh();
    });
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.emailLabel')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t('auth.passwordLabel')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t('common.loading') : t('auth.submit')}
      </Button>
    </form>
  );
}
