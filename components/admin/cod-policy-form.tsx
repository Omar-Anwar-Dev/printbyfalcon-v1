'use client';

import { useState, useTransition } from 'react';
import { updateCodPolicyAction } from '@/app/actions/admin-settings';
import type { CodPolicy } from '@/lib/settings/cod';

export function CodPolicyForm({
  locale,
  initial,
}: {
  locale: 'ar' | 'en';
  initial: CodPolicy;
}) {
  const isAr = locale === 'ar';
  const [policy, setPolicy] = useState<CodPolicy>(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const r = await updateCodPolicyAction(policy);
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

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={policy.enabled}
          onChange={(e) => setPolicy({ ...policy, enabled: e.target.checked })}
        />
        <span className="font-medium">
          {isAr
            ? 'تفعيل الدفع عند الاستلام عالميًا'
            : 'Enable cash on delivery globally'}
        </span>
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>{isAr ? 'نوع الرسوم' : 'Fee type'}</span>
          <select
            value={policy.feeType}
            onChange={(e) =>
              setPolicy({
                ...policy,
                feeType: e.target.value as 'FIXED' | 'PERCENT',
              })
            }
            className="w-full rounded-md border bg-background px-3 py-2"
          >
            <option value="FIXED">
              {isAr ? 'مبلغ ثابت (ج.م)' : 'Fixed EGP'}
            </option>
            <option value="PERCENT">
              {isAr ? 'نسبة مئوية من الإجمالي' : 'Percentage of subtotal'}
            </option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>
            {policy.feeType === 'FIXED'
              ? isAr
                ? 'قيمة الرسوم (ج.م)'
                : 'Fee (EGP)'
              : isAr
                ? 'نسبة الرسوم %'
                : 'Fee %'}
          </span>
          <input
            type="number"
            min={0}
            step={policy.feeType === 'FIXED' ? 1 : 0.1}
            value={policy.feeValue}
            onChange={(e) =>
              setPolicy({ ...policy, feeValue: Number(e.target.value) })
            }
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span>
            {isAr
              ? 'الحد الأقصى لقيمة الطلب المسموح به بالدفع عند الاستلام (ج.م)'
              : 'Max order value for COD (EGP)'}
          </span>
          <input
            type="number"
            min={0}
            value={policy.maxOrderEgp}
            onChange={(e) =>
              setPolicy({ ...policy, maxOrderEgp: Number(e.target.value) })
            }
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
      </div>

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
