'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestB2BPasswordResetAction } from '@/app/actions/auth';

export function ForgotPasswordForm({ locale }: { locale: 'ar' | 'en' }) {
  const isAr = locale === 'ar';
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    start(async () => {
      const res = await requestB2BPasswordResetAction(form);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        {isAr
          ? 'لو البريد مسجّل عندنا هنلاقي رسالة في إيميلك خلال دقيقة. الرابط صالح لمدة ساعة.'
          : "If that email is on file you'll find a reset link in your inbox within a minute. The link is valid for one hour."}
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="email">{isAr ? 'بريد العمل' : 'Work email'}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
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
            ? 'جارٍ الإرسال...'
            : 'Sending...'
          : isAr
            ? 'إرسال الرابط'
            : 'Send reset link'}
      </Button>
    </form>
  );
}
