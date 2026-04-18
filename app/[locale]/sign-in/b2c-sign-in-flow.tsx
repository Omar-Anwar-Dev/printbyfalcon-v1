'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  requestB2COtpAction,
  verifyB2COtpAction,
} from '@/app/actions/auth';

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
      <form className="space-y-4" onSubmit={onRequestOtp}>
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
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t('common.loading') : t('auth.sendOtp')}
        </Button>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onVerifyOtp}>
      <p className="text-sm text-muted-foreground">
        {t('auth.otpSent')} — {phone}
      </p>
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
        />
      </div>
      {devHint ? (
        <p className="text-xs text-amber-600">{devHint}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t('common.loading') : t('auth.verifyOtp')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => {
          setStep('phone');
          setError(null);
          setDevHint(null);
        }}
      >
        {t('common.or')}
      </Button>
    </form>
  );
}
