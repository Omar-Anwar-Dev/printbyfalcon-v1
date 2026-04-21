'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  deleteCompanyPriceOverrideAction,
  upsertCompanyPriceOverrideAction,
} from '@/app/actions/admin-b2b';
import { Button } from '@/components/ui/button';

type Override = {
  id: string;
  sku: string;
  productNameAr: string;
  productNameEn: string;
  basePriceEgp: string;
  customPriceEgp: string;
};

type Props = {
  companyId: string;
  tierCode: 'A' | 'B' | 'C';
  overrides: Override[];
  locale: 'ar' | 'en';
};

export function CompanyPriceOverrides({
  companyId,
  tierCode,
  overrides,
  locale,
}: Props) {
  const isAr = locale === 'ar';
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set('companyId', companyId);
    start(async () => {
      const res = await upsertCompanyPriceOverrideAction(form);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  async function onDelete(id: string) {
    if (!confirm(isAr ? 'حذف هذا السعر المخصّص؟' : 'Delete this override?'))
      return;
    start(async () => {
      const form = new FormData();
      form.set('overrideId', id);
      const res = await deleteCompanyPriceOverrideAction(form);
      if (!res.ok) setError(res.errorKey);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-md border bg-background p-4">
      <div>
        <h2 className="text-base font-semibold">
          {isAr ? 'أسعار مخصّصة لكل منتج' : 'Per-product price overrides'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {tierCode === 'C'
            ? isAr
              ? 'المستوى ج يعتمد على هذه الأسعار بالكامل. أضف منتجًا واحدًا في كل مرة.'
              : 'Tier C depends on these overrides entirely. Add one product at a time.'
            : isAr
              ? 'اختياري للمستويات أ/ب — استخدمه لاستبدال خصم المستوى الافتراضي لمنتجات محدّدة.'
              : 'Optional for Tier A/B — use it to replace the default tier discount on specific SKUs.'}
        </p>
      </div>

      {overrides.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          {isAr ? 'لم تُضف أسعار مخصّصة بعد.' : 'No overrides yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase">
                <th className="px-3 py-2 text-start">SKU</th>
                <th className="px-3 py-2 text-start">
                  {isAr ? 'المنتج' : 'Product'}
                </th>
                <th className="px-3 py-2 text-end">
                  {isAr ? 'السعر الأساسي' : 'Base'}
                </th>
                <th className="px-3 py-2 text-end">
                  {isAr ? 'سعر خاص' : 'Custom'}
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{o.sku}</td>
                  <td className="px-3 py-2">
                    {isAr ? o.productNameAr : o.productNameEn}
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-muted-foreground line-through">
                    {o.basePriceEgp}
                  </td>
                  <td className="px-3 py-2 text-end font-mono font-semibold">
                    {o.customPriceEgp}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <button
                      type="button"
                      onClick={() => onDelete(o.id)}
                      disabled={pending}
                      className="text-xs text-destructive hover:underline"
                    >
                      {isAr ? 'حذف' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        onSubmit={onAdd}
        className="grid gap-3 rounded-md border border-dashed bg-muted/20 p-3 md:grid-cols-[1fr_160px_auto]"
      >
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">
            {isAr ? 'SKU' : 'SKU'}
          </span>
          <input
            type="text"
            name="sku"
            required
            dir="ltr"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="HP-CF259A"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">
            {isAr ? 'السعر المخصّص (ج.م)' : 'Custom price (EGP)'}
          </span>
          <input
            type="number"
            name="customPriceEgp"
            required
            min="0"
            step="0.01"
            dir="ltr"
            inputMode="decimal"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <Button type="submit" disabled={pending} className="self-end">
          {pending
            ? isAr
              ? 'جارٍ الحفظ...'
              : 'Saving...'
            : isAr
              ? 'إضافة / تحديث'
              : 'Add / update'}
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
