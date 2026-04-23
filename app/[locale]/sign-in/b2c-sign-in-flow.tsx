'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestB2COtpAction, verifyB2COtpAction } from '@/app/actions/auth';

type Step = 'phone' | 'otp';

export function B2CSignInFlow() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [devHint, setDevHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onRequestOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const phoneValue = (form.get('phone') as string | null)?.trim() ?? '';
    start(async () => {
      const result = await requestB2COtpAction(form);
      if (!result.ok) {
        setError(t(result.errorKey as never, { default: t('common.error') }));
        return;
      }
      setPhone(phoneValue);
      if (result.data.devCode) {
        setDevHint(`${t('auth.devOtpHint')}: ${result.data.devCode}`);
      }
      setStep('otp');
    });
  }

  async function onVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set('phone', phone);
    start(async () => {
      const result = await verifyB2COtpAction(form);
      if (!result.ok) {
        setError(t(result.errorKey as never, { default: t('common.error') }));
        return;
      }
      router.push(`/${locale}`);
      router.refresh();
    });
  }

  if (step === 'phone') {
    return (
      <form className="space-y-5" onSubmit={onRequestOtp}>
        <div className="space-y-2">
          <Label htmlFor="phone">{t('auth.phoneLabel')}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            placeholder={t('auth.phonePlaceholder')}
            dir="ltr"
            autoComplete="tel"
            className="font-mono tracking-wider"
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full bg-accent text-accent-foreground hover:bg-accent-strong"
          disabled={pending}
        >
          {pending ? t('common.loading') : t('auth.sendOtp')}
        </Button>
      </form>
    );
  }

  const isAr = locale === 'ar';

  return (
    <form className="space-y-5" onSubmit={onVerifyOtp}>
      <div className="rounded-md border border-border bg-paper px-3 py-2.5 text-sm">
        <span className="text-muted-foreground">{t('auth.otpSent')}</span>{' '}
        <span className="num font-medium text-foreground">{phone}</span>
      </div>
      <div className="space-y-2">
        <Label htmlFor="code">{t('auth.otpLabel')}</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          dir="ltr"
          autoComplete="one-time-code"
          className="text-center font-mono text-lg tracking-[0.5em]"
        />
      </div>
      {devHint ? (
        <p className="rounded border border-warning/20 bg-warning-soft px-2.5 py-1.5 text-xs text-warning">
          {devHint}
        </p>
      ) : null}

      {/* Optional profile fields — grouped so returning users can skip straight to verify */}
      <details className="group rounded-md border border-border">
        <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
          <span>
            {isAr
              ? 'إضافة اسم أو بريد (اختياري)'
              : 'Add name or email (optional)'}
          </span>
          <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="space-y-3 border-t border-border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">
              {t('auth.registrationNameLabel')}
            </Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder={t('auth.registrationNamePlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('auth.registrationNameHelp')}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">
              {t('auth.registrationEmailLabel')}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              dir="ltr"
            />
          </div>
        </div>
      </details>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Button
          type="submit"
          className="w-full bg-accent text-accent-foreground hover:bg-accent-strong"
          disabled={pending}
        >
          {pending ? t('common.loading') : t('auth.verifyOtp')}
        </Button>
        <button
          type="button"
          onClick={() => {
            setStep('phone');
            setError(null);
            setDevHint(null);
          }}
          className="block w-full text-center text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {isAr ? 'تغيير الرقم' : 'Change number'}
        </button>
      </div>
    </form>
  );
}
