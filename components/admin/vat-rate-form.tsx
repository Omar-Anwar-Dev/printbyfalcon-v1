'use client';

import { useState, useTransition } from 'react';
import { updateVatRateAction } from '@/app/actions/admin-settings';
import type { VatRate } from '@/lib/settings/vat';

export function VatRateForm({
  locale,
  initial,
}: {
  locale: 'ar' | 'en';
  initial: VatRate;
}) {
  const isAr = locale === 'ar';
  const [percent, setPercent] = useState(initial.percent);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const r = await updateVatRateAction({ percent });
      if (!r.ok) {
        setErr(isAr ? 'فشل الحفظ' : 'Save failed');
        return;
      }
      setMsg(isAr ? 'تم الحفظ' : 'Saved');
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-md border bg-background p-4"
    >
      {msg ? (
        <div className="rounded-md border border-emerald-400/40 bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}
      <label className="space-y-1 text-sm">
        <span>{isAr ? 'نسبة الضريبة %' : 'VAT rate %'}</span>
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="w-full rounded-md border bg-background px-3 py-2"
        />
        <span className="block text-xs text-muted-foreground">
          {isAr
            ? 'تُطبَّق على جميع المنتجات غير المُعفاة.'
            : 'Applied to every non-exempt product at checkout.'}
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {isAr ? 'حفظ' : 'Save'}
      </button>
    </form>
  );
}
