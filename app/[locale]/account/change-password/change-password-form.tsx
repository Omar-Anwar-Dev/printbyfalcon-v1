'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { changePasswordAction } from '@/app/actions/auth';

export function ChangePasswordForm({
  locale,
  redirectTo,
}: {
  locale: 'ar' | 'en';
  redirectTo: string;
}) {
  const isAr = locale === 'ar';
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const labels = {
    current: isAr ? 'كلمة المرور الحالية' : 'Current password',
    next: isAr ? 'كلمة المرور الجديدة' : 'New password',
    confirm: isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password',
    save: isAr ? 'حفظ كلمة المرور الجديدة' : 'Save new password',
    saving: isAr ? 'جارٍ الحفظ...' : 'Saving...',
    show: isAr ? 'إظهار كلمة المرور' : 'Show password',
    hide: isAr ? 'إخفاء كلمة المرور' : 'Hide password',
  };

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
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <form method="post" className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{labels.current}</Label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          required
          dir="ltr"
          autoComplete="current-password"
          showLabel={labels.show}
          hideLabel={labels.hide}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">{labels.next}</Label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          required
          minLength={10}
          dir="ltr"
          autoComplete="new-password"
          showLabel={labels.show}
          hideLabel={labels.hide}
        />
        <p className="text-xs text-muted-foreground">
          {isAr
            ? '10 أحرف على الأقل، بها حروف كبيرة وصغيرة وأرقام.'
            : 'At least 10 characters, with upper, lower, and a digit.'}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{labels.confirm}</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          required
          dir="ltr"
          autoComplete="new-password"
          showLabel={labels.show}
          hideLabel={labels.hide}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? labels.saving : labels.save}
      </Button>
    </form>
  );
}
