'use client';

import { useState, useTransition } from 'react';
import { updateFreeShipThresholdsAction } from '@/app/actions/admin-settings';

type Props = {
  locale: 'ar' | 'en';
  initial: { b2cEgp: number; b2bEgp: number };
};

export function FreeShipThresholdsForm({ locale, initial }: Props) {
  const isAr = locale === 'ar';
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateFreeShipThresholdsAction(values);
      if (!r.ok) {
        setMsg({ kind: 'err', text: isAr ? 'فشل الحفظ' : 'Save failed' });
        return;
      }
      setMsg({
        kind: 'ok',
        text: isAr ? 'تم الحفظ' : 'Saved',
      });
      setTimeout(() => setMsg(null), 2500);
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-paper p-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          {isAr ? 'حدود الشحن المجاني الافتراضية' : 'Free-shipping thresholds'}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {isAr
            ? 'تُطبَّق على المناطق التي ليس لها قيمة مخصّصة. القيم المخصّصة لكل منطقة تتجاوز هذه الحدود.'
            : 'Applied when a zone has no override. Per-zone overrides take priority.'}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">
            {isAr ? 'الأفراد (B2C) — ج.م' : 'B2C (EGP)'}
          </span>
          <input
            type="number"
            min={0}
            value={values.b2cEgp}
            onChange={(e) =>
              setValues({ ...values, b2cEgp: Number(e.target.value || 0) })
            }
            className="block w-full rounded border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">
            {isAr ? 'الشركات (B2B) — ج.م' : 'B2B (EGP)'}
          </span>
          <input
            type="number"
            min={0}
            value={values.b2bEgp}
            onChange={(e) =>
              setValues({ ...values, b2bEgp: Number(e.target.value || 0) })
            }
            className="block w-full rounded border border-border bg-background px-3 py-2"
          />
        </label>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
        >
          {isAr ? 'حفظ الحدود' : 'Save thresholds'}
        </button>
        {msg && (
          <span
            className={`text-xs ${
              msg.kind === 'ok' ? 'text-success' : 'text-error'
            }`}
          >
            {msg.text}
          </span>
        )}
      </div>
    </section>
  );
}
