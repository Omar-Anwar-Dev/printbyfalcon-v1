'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Phone, Lock } from 'lucide-react';
import { updateB2CProfileAction } from '@/app/actions/b2c-self';

type Props = {
  initial: {
    name: string;
    phone: string;
    email: string;
  };
  locale: 'ar' | 'en';
};

const LABELS = {
  ar: {
    name: 'الاسم',
    phone: 'رقم الموبايل',
    email: 'البريد الإلكتروني',
    emailOptional: 'اختياري',
    phoneNote: 'رقم الموبايل مرتبط بحسابك. للتغيير، تواصل مع الدعم.',
    save: 'حفظ التعديلات',
    saving: 'جارٍ الحفظ...',
    saved: 'تم الحفظ',
    emailPlaceholder: 'example@email.com',
  },
  en: {
    name: 'Name',
    phone: 'Mobile number',
    email: 'Email',
    emailOptional: 'optional',
    phoneNote: 'Your phone is your sign-in. Contact support to change it.',
    save: 'Save changes',
    saving: 'Saving...',
    saved: 'Saved',
    emailPlaceholder: 'example@email.com',
  },
};

const ERROR_TEXT: Record<string, { ar: string; en: string }> = {
  'auth.not_signed_in': {
    ar: 'يجب تسجيل الدخول أولاً.',
    en: 'You need to sign in first.',
  },
  'profile.email_in_use': {
    ar: 'هذا البريد الإلكتروني مستخدم من قبل حساب آخر.',
    en: 'This email is already used by another account.',
  },
  'validation.invalid': {
    ar: 'تأكّد من البيانات المدخلة.',
    en: 'Please check the values you entered.',
  },
  'name.too_short': {
    ar: 'الاسم قصير جداً.',
    en: 'Name is too short.',
  },
  'name.too_long': {
    ar: 'الاسم طويل جداً.',
    en: 'Name is too long.',
  },
  'email.invalid': {
    ar: 'البريد الإلكتروني غير صحيح.',
    en: 'Email is not valid.',
  },
};

function errorText(key: string, isAr: boolean): string {
  const entry = ERROR_TEXT[key];
  if (entry) return isAr ? entry.ar : entry.en;
  return isAr ? 'حدث خطأ، حاول مرة أخرى.' : 'Something went wrong. Try again.';
}

export function ProfileForm({ initial, locale }: Props) {
  const isAr = locale === 'ar';
  const labels = LABELS[locale];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);

  const dirty = name !== initial.name || email !== initial.email;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSavedTick(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('name', name);
      fd.set('email', email);
      const res = await updateB2CProfileAction(fd);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      setSavedTick(true);
      router.refresh();
      // Hide the saved tick after 2.5s so it doesn't sit there forever.
      setTimeout(() => setSavedTick(false), 2500);
    });
  }

  const inputBase =
    'h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';
  const labelBase =
    'mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground';

  return (
    <form method="post" onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div>
          <label htmlFor="b2c-name" className={labelBase}>
            <span>{labels.name}</span>
          </label>
          <input
            id="b2c-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            className={inputBase}
            minLength={2}
            maxLength={80}
          />
        </div>

        {/* Phone — read-only */}
        <div>
          <label htmlFor="b2c-phone" className={labelBase}>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {labels.phone}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground">
              <Lock className="h-3 w-3" strokeWidth={2} aria-hidden />
              {isAr ? 'محمي' : 'locked'}
            </span>
          </label>
          <input
            id="b2c-phone"
            type="tel"
            dir="ltr"
            value={initial.phone}
            disabled
            readOnly
            className={`${inputBase} num text-start font-mono`}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {labels.phoneNote}
          </p>
        </div>

        {/* Email — optional */}
        <div className="sm:col-span-2">
          <label htmlFor="b2c-email" className={labelBase}>
            <span>{labels.email}</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              {labels.emailOptional}
            </span>
          </label>
          <input
            id="b2c-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            placeholder={labels.emailPlaceholder}
            className={`${inputBase} text-start`}
            maxLength={254}
          />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-error/30 bg-error-soft px-3 py-2 text-sm text-error"
        >
          {errorText(error, isAr)}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        {savedTick ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            {labels.saved}
          </span>
        ) : null}
        <button
          type="submit"
          disabled={pending || !dirty}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? labels.saving : labels.save}
        </button>
      </div>
    </form>
  );
}
