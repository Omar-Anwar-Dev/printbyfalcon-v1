'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { acceptAdminInviteAction } from '@/app/actions/admin-users';

export function AdminInviteAcceptForm({
  token,
  isAr,
}: {
  token: string;
  isAr: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set('token', token);
    startTransition(async () => {
      const res = await acceptAdminInviteAction(fd);
      // Success path redirects server-side; we only reach here on error.
      if (res && !res.ok) setError(res.errorKey);
    });
  }

  return (
    <form method="post" className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'اسمك' : 'Your name'}
        </label>
        <Input name="name" required minLength={2} maxLength={120} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'كلمة المرور' : 'Password'}
        </label>
        <Input
          type="password"
          name="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {isAr ? '8 أحرف على الأقل.' : 'At least 8 characters.'}
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'تأكيد كلمة المرور' : 'Confirm password'}
        </label>
        <Input
          type="password"
          name="confirmPassword"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error === 'admin.invite.invalid_or_expired'
            ? isAr
              ? 'الدعوة غير صالحة أو منتهية.'
              : 'Invitation is invalid or expired.'
            : error === 'admin.invite.email_taken'
              ? isAr
                ? 'هذا البريد مستخدم بالفعل.'
                : 'This email is already taken.'
              : error === 'validation.invalid'
                ? isAr
                  ? 'تأكد من أن كلمتا المرور متطابقتان.'
                  : 'Check that the passwords match and meet the minimum length.'
                : error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? isAr
            ? 'جار التفعيل...'
            : 'Activating...'
          : isAr
            ? 'تفعيل الحساب'
            : 'Activate account'}
      </Button>
    </form>
  );
}
