'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateCustomerContactAction } from '@/app/actions/admin-customers';

export function CustomerContactForm({
  userId,
  initialName,
  initialEmail,
  phone,
  isAr,
}: {
  userId: string;
  initialName: string;
  initialEmail: string;
  phone: string;
  isAr: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateCustomerContactAction({ userId, name, email });
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      setFlash(true);
      router.refresh();
      setTimeout(() => setFlash(false), 2000);
    });
  }

  return (
    <form method="post" className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'الاسم' : 'Name'}
        </label>
        <Input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={120}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'الهاتف (غير قابل للتعديل)' : 'Phone (read-only)'}
        </label>
        <Input value={phone} readOnly dir="ltr" className="bg-muted" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'البريد الإلكتروني' : 'Email'}
        </label>
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
          placeholder={isAr ? 'اختياري' : 'Optional'}
        />
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error === 'customer.email_taken'
            ? isAr
              ? 'هذا البريد مستخدم بالفعل.'
              : 'This email is already used by another account.'
            : error === 'validation.invalid'
              ? isAr
                ? 'بيانات غير صحيحة.'
                : 'Invalid input.'
              : error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isAr
              ? 'جار الحفظ...'
              : 'Saving...'
            : isAr
              ? 'حفظ'
              : 'Save'}
        </Button>
        {flash ? (
          <span className="text-sm text-success">
            {isAr ? 'تم الحفظ ✓' : 'Saved ✓'}
          </span>
        ) : null}
      </div>
    </form>
  );
}
