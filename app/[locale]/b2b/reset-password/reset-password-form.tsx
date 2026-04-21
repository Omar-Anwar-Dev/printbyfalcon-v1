'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetB2BPasswordAction } from '@/app/actions/auth';

type Props = { token: string; locale: 'ar' | 'en' };

export function ResetPasswordForm({ token, locale }: Props) {
  const isAr = locale === 'ar';
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
        setError(res.errorKey);
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
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          dir="ltr"
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {isAr ? 'تأكيد كلمة المرور' : 'Confirm password'}
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          dir="ltr"
          autoComplete="new-password"
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
