'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePasswordAction } from '@/app/actions/auth';

export function ChangePasswordForm() {
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
      const result = await changePasswordAction(form);
      if (!result.ok) {
        setError(t(result.errorKey as never, { default: t('common.error') }));
        return;
      }
      router.push(`/${locale}/admin`);
      router.refresh();
    });
  }

  return (
    <form method="post" className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t('auth.passwordLabel')}</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          dir="ltr"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          dir="ltr"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
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
