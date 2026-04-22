'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  createPromoCodeAction,
  togglePromoCodeActiveAction,
  updatePromoCodeAction,
} from '@/app/actions/admin-promo';

type Initial = {
  id?: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrderEgp: number | null;
  /// Sprint 9 fix — optional EGP ceiling on the computed discount.
  maxDiscountEgp: number | null;
  usageLimit: number | null;
  validFrom: string;
  validTo: string;
  active: boolean;
};

const EMPTY: Initial = {
  code: '',
  type: 'PERCENT',
  value: 10,
  minOrderEgp: null,
  maxDiscountEgp: null,
  usageLimit: null,
  validFrom: '',
  validTo: '',
  active: true,
};

export function PromoCodeForm({
  locale,
  mode,
  initial,
}: {
  locale: 'ar' | 'en';
  mode: 'create' | 'edit';
  initial?: Initial;
}) {
  const isAr = locale === 'ar';
  const [state, setState] = useState<Initial>(initial ?? EMPTY);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const ERR_LABEL: Record<string, string> = isAr
    ? {
        'validation.failed': 'تحقق من الحقول.',
        'promo.code_exists': 'هذا الكود موجود مسبقًا.',
        'promo.percent_out_of_range': 'قيمة النسبة يجب أن تكون بين 1 و100.',
        'promo.date_window_invalid': 'تاريخ البداية يجب أن يسبق النهاية.',
        'promo.invalid_code': 'الكود يحتوي على أحرف غير مسموحة.',
        'promo.create_failed': 'فشل إنشاء الكود.',
        'promo.update_failed': 'فشل تعديل الكود.',
      }
    : {
        'validation.failed': 'Please check the fields.',
        'promo.code_exists': 'This code already exists.',
        'promo.percent_out_of_range': 'Percent must be between 1 and 100.',
        'promo.date_window_invalid': 'Start date must precede end date.',
        'promo.invalid_code': 'Code contains invalid characters.',
        'promo.create_failed': 'Failed to create code.',
        'promo.update_failed': 'Failed to update code.',
      };

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const input = {
        code: state.code,
        type: state.type,
        value: state.value,
        minOrderEgp: state.minOrderEgp,
        maxDiscountEgp: state.maxDiscountEgp,
        usageLimit: state.usageLimit,
        validFrom: state.validFrom || undefined,
        validTo: state.validTo || undefined,
        active: state.active,
      };
      const r =
        mode === 'create'
          ? await createPromoCodeAction(input)
          : await updatePromoCodeAction(state.id!, input);
      if (!r.ok) {
        setErr(ERR_LABEL[r.errorKey] ?? r.errorKey);
        return;
      }
      if (mode === 'create') {
        router.push('/admin/settings/promo-codes');
      } else {
        setMsg(isAr ? 'تم الحفظ' : 'Saved');
      }
    });
  }

  function onToggleActive() {
    if (!state.id) return;
    startTransition(async () => {
      const r = await togglePromoCodeActiveAction(state.id!);
      if (r.ok) {
        setState({ ...state, active: !state.active });
      }
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
        <span>{isAr ? 'الكود' : 'Code'}</span>
        <input
          required
          value={state.code}
          onChange={(e) =>
            setState({ ...state, code: e.target.value.toUpperCase() })
          }
          maxLength={40}
          className="w-full rounded-md border bg-background px-3 py-2 font-mono"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>{isAr ? 'النوع' : 'Type'}</span>
          <select
            value={state.type}
            onChange={(e) =>
              setState({
                ...state,
                type: e.target.value as 'PERCENT' | 'FIXED',
              })
            }
            className="w-full rounded-md border bg-background px-3 py-2"
          >
            <option value="PERCENT">
              {isAr ? 'نسبة مئوية %' : 'Percent %'}
            </option>
            <option value="FIXED">
              {isAr ? 'مبلغ ثابت (ج.م)' : 'Fixed EGP'}
            </option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>
            {state.type === 'PERCENT'
              ? isAr
                ? 'النسبة %'
                : 'Percent %'
              : isAr
                ? 'المبلغ (ج.م)'
                : 'Amount (EGP)'}
          </span>
          <input
            required
            type="number"
            min={0}
            step={state.type === 'PERCENT' ? 1 : 0.5}
            value={state.value}
            onChange={(e) =>
              setState({ ...state, value: Number(e.target.value) })
            }
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>{isAr ? 'الحد الأدنى للطلب (ج.م)' : 'Min order (EGP)'}</span>
          <input
            type="number"
            min={0}
            value={state.minOrderEgp ?? ''}
            onChange={(e) =>
              setState({
                ...state,
                minOrderEgp:
                  e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>{isAr ? 'الحد الأقصى للخصم (ج.م)' : 'Max discount (EGP)'}</span>
          <input
            type="number"
            min={0}
            value={state.maxDiscountEgp ?? ''}
            placeholder={isAr ? 'بلا سقف' : 'no cap'}
            onChange={(e) =>
              setState({
                ...state,
                maxDiscountEgp:
                  e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="w-full rounded-md border bg-background px-3 py-2"
          />
          <span className="block text-xs text-muted-foreground">
            {isAr
              ? 'مفيد للكودات النسبة المئوية لتفادي خصومات ضخمة على الطلبات الكبيرة.'
              : 'Useful for PERCENT codes — caps the discount EGP on large orders.'}
          </span>
        </label>
        <label className="space-y-1 text-sm">
          <span>{isAr ? 'حد الاستخدام' : 'Usage limit'}</span>
          <input
            type="number"
            min={1}
            value={state.usageLimit ?? ''}
            placeholder={isAr ? 'بلا حد' : 'unlimited'}
            onChange={(e) =>
              setState({
                ...state,
                usageLimit:
                  e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>{isAr ? 'صالح من' : 'Valid from'}</span>
          <input
            type="date"
            value={state.validFrom ? state.validFrom.slice(0, 10) : ''}
            onChange={(e) => setState({ ...state, validFrom: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>{isAr ? 'صالح حتى' : 'Valid to'}</span>
          <input
            type="date"
            value={state.validTo ? state.validTo.slice(0, 10) : ''}
            onChange={(e) => setState({ ...state, validTo: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.active}
          onChange={(e) => setState({ ...state, active: e.target.checked })}
        />
        <span>{isAr ? 'مفعّل' : 'Active'}</span>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {mode === 'create'
            ? isAr
              ? 'إنشاء'
              : 'Create'
            : isAr
              ? 'حفظ'
              : 'Save'}
        </button>
        {mode === 'edit' ? (
          <button
            type="button"
            onClick={onToggleActive}
            disabled={pending}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-60"
          >
            {state.active
              ? isAr
                ? 'تعطيل'
                : 'Deactivate'
              : isAr
                ? 'تفعيل'
                : 'Activate'}
          </button>
        ) : null}
      </div>
    </form>
  );
}
