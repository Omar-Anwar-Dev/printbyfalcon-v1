'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitB2BApplicationAction } from '@/app/actions/b2b-public';
import { GOVERNORATE_OPTIONS } from '@/lib/i18n/governorates';

type Props = { locale: 'ar' | 'en' };

type FieldError = { path: (string | number)[]; key: string };

export function B2BApplicationForm({ locale }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [pending, start] = useTransition();

  function resolveFieldErrors(errors: FieldError[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const e of errors) {
      const k = e.path.join('.');
      out[k] = t(e.key as never, { default: t('common.error') });
    }
    return out;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);
    start(async () => {
      const result = await submitB2BApplicationAction(form);
      if (!result.ok) {
        setError(t(result.errorKey as never, { default: t('common.error') }));
        if (result.fieldErrors) {
          setFieldErrors(resolveFieldErrors(result.fieldErrors));
        }
        return;
      }
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  if (success) {
    return (
      <div className="space-y-4 rounded-md border border-success/30 bg-success-soft p-4 text-sm text-success">
        <p className="font-semibold">{t('b2b.register.success.title')}</p>
        <p>{t('b2b.register.success.body')}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setSuccess(false)}
        >
          {t('b2b.register.success.another')}
        </Button>
      </div>
    );
  }

  return (
    <form method="post" className="space-y-5" onSubmit={onSubmit} noValidate>
      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold text-foreground">
          {t('b2b.register.section.company')}
        </legend>
        <Field
          id="companyName"
          label={t('b2b.register.field.companyName')}
          required
          error={fieldErrors.companyName}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="crNumber"
            label={t('b2b.register.field.crNumber')}
            required
            error={fieldErrors.crNumber}
          />
          <Field
            id="taxCardNumber"
            label={t('b2b.register.field.taxCardNumber')}
            required
            error={fieldErrors.taxCardNumber}
          />
        </div>
        <Field
          id="monthlyVolumeEstimate"
          label={t('b2b.register.field.monthlyVolumeEstimate')}
          placeholder={t('b2b.register.field.monthlyVolumeEstimatePlaceholder')}
          error={fieldErrors.monthlyVolumeEstimate}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold text-foreground">
          {t('b2b.register.section.contact')}
        </legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="contactName"
            label={t('b2b.register.field.contactName')}
            required
            autoComplete="name"
            error={fieldErrors.contactName}
          />
          <Field
            id="phone"
            label={t('b2b.register.field.phone')}
            required
            dir="ltr"
            placeholder="01XXXXXXXXX"
            autoComplete="tel"
            error={fieldErrors.phone}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="email"
            type="email"
            label={t('b2b.register.field.email')}
            required
            dir="ltr"
            autoComplete="email"
            error={fieldErrors.email}
          />
          <Field
            id="password"
            type="password"
            label={t('b2b.register.field.password')}
            required
            autoComplete="new-password"
            dir="ltr"
            help={t('b2b.register.field.passwordHelp')}
            error={fieldErrors.password}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold text-foreground">
          {t('b2b.register.section.delivery')}
        </legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="governorate">
              {t('b2b.register.field.governorate')}
            </Label>
            <select
              id="governorate"
              name="governorate"
              required
              defaultValue="CAIRO"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {GOVERNORATE_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {locale === 'ar' ? g.labelAr : g.labelEn}
                </option>
              ))}
            </select>
            {fieldErrors.governorate ? (
              <p className="text-sm text-destructive" role="alert">
                {fieldErrors.governorate}
              </p>
            ) : null}
          </div>
          <Field
            id="city"
            label={t('b2b.register.field.city')}
            required
            error={fieldErrors.city}
          />
        </div>
        <Field
          id="addressLine"
          label={t('b2b.register.field.addressLine')}
          placeholder={t('b2b.register.field.addressLinePlaceholder')}
          error={fieldErrors.addressLine}
        />
      </fieldset>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t('common.loading') : t('b2b.register.submit')}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {t('b2b.register.sla')}
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  type = 'text',
  required = false,
  placeholder,
  help,
  dir,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  dir?: 'ltr' | 'rtl';
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ms-1 text-destructive">*</span> : null}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        dir={dir}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
      />
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
