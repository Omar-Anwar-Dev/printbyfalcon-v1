'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { resetB2BPasswordAction } from '@/app/actions/auth';

type Props = { token: string; locale: 'ar' | 'en' };

export function ResetPasswordForm({ token, locale }: Props) {
  const isAr = locale === 'ar';
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set('token', token);
    start(async () => {
      const res = await resetB2BPasswordAction(form);
      if (!res.ok) {
        // The action returns either a generic Zod error
        // (`validation.invalid`) or a domain-specific key
        // (`auth.reset.invalid_or_expired`). For the generic one, we
        // know the only fields are the two passwords — so swap in a
        // password-specific message rather than the catch-all
        // "Invalid value" the global key resolves to.
        const message =
          res.errorKey === 'validation.invalid'
            ? isAr
              ? 'كلمة المرور غير صالحة — تأكد من المتطلبات أسفل الحقل.'
              : "Password didn't meet the requirements shown below the field."
            : t(res.errorKey as never, { default: t('common.error') });
        setError(message);
        return;
      }
      router.push(`/${locale}/b2b/login?reset=1`);
    });
  }

  if (!token) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {isAr
          ? 'الرابط غير صالح. اطلب رابطًا جديدًا.'
          : 'Missing or invalid reset token. Request a new one.'}
      </p>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="newPassword">
          {isAr ? 'كلمة المرور الجديدة' : 'New password'}
        </Label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          required
          minLength={10}
          dir="ltr"
          autoComplete="new-password"
          showLabel={isAr ? 'إظهار كلمة المرور' : 'Show password'}
          hideLabel={isAr ? 'إخفاء كلمة المرور' : 'Hide password'}
        />
        <p className="text-xs text-muted-foreground">
          {isAr
            ? '10 أحرف على الأقل، بها حروف كبيرة وصغيرة وأرقام.'
            : 'At least 10 characters, with upper, lower, and a digit.'}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {isAr ? 'تأكيد كلمة المرور' : 'Confirm password'}
        </Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          required
          dir="ltr"
          autoComplete="new-password"
          showLabel={isAr ? 'إظهار كلمة المرور' : 'Show password'}
          hideLabel={isAr ? 'إخفاء كلمة المرور' : 'Hide password'}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? isAr
            ? 'جارٍ الحفظ...'
            : 'Saving...'
          : isAr
            ? 'حفظ كلمة المرور الجديدة'
            : 'Save new password'}
      </Button>
    </form>
  );
}
