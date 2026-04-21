'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateB2BProfileContactAction } from '@/app/actions/b2b-self';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  userId: string;
  initial: {
    contactName: string;
    phone: string;
    email: string;
  };
  locale: 'ar' | 'en';
};

export function B2BProfileContactForm({ initial, locale }: Props) {
  const isAr = locale === 'ar';
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, start] = useTransition();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateB2BProfileContactAction(form);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      setSavedAt(new Date());
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-md border bg-background p-5"
    >
      <h2 className="text-base font-semibold">
        {isAr ? 'جهة الاتصال' : 'Primary contact'}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactName">{isAr ? 'الاسم' : 'Name'}</Label>
          <Input
            id="contactName"
            name="contactName"
            required
            defaultValue={initial.contactName}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">
            {isAr ? 'الموبايل (واتساب)' : 'Phone (WhatsApp)'}
          </Label>
          <Input
            id="phone"
            name="phone"
            required
            defaultValue={initial.phone}
            dir="ltr"
            autoComplete="tel"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="email">
            {isAr ? 'البريد الإلكتروني للعمل' : 'Work email'}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={initial.email}
            dir="ltr"
            autoComplete="email"
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-3">
        {savedAt ? (
          <span className="text-xs text-emerald-700">
            {isAr ? 'تم الحفظ ✓' : 'Saved ✓'}
          </span>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending
            ? isAr
              ? 'جارٍ الحفظ...'
              : 'Saving...'
            : isAr
              ? 'حفظ التعديلات'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
