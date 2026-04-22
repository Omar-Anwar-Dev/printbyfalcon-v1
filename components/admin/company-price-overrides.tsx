'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  bulkImportCompanyPriceOverridesCsvAction,
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

      <CsvImportPanel
        companyId={companyId}
        isAr={isAr}
        onDone={() => router.refresh()}
      />
    </section>
  );
}

function CsvImportPanel({
  companyId,
  isAr,
  onDone,
}: {
  companyId: string;
  isAr: boolean;
  onDone: () => void;
}) {
  const [csv, setCsv] = useState('');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<null | {
    created: number;
    updated: number;
    errors: Array<{ row: number; sku: string; reason: string }>;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!csv.trim()) {
      setError(isAr ? 'الصق بيانات CSV أولاً' : 'Paste CSV data first');
      return;
    }
    start(async () => {
      const res = await bulkImportCompanyPriceOverridesCsvAction({
        companyId,
        csv,
      });
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      setResult(res.data);
      onDone();
    });
  }

  return (
    <details className="rounded-md border border-dashed bg-muted/10">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
        {isAr ? 'استيراد من CSV' : 'Bulk import from CSV'}
      </summary>
      <form onSubmit={onSubmit} className="space-y-3 p-3">
        <p className="text-xs text-muted-foreground">
          {isAr
            ? 'الشكل: sku,customPriceEgp — صف واحد لكل منتج. السطر الأول (header) اختياري. الأسطر التي تبدأ بـ # تُتجاهل.'
            : 'Format: sku,customPriceEgp — one product per row. Header row optional. Lines starting with # are skipped.'}
        </p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={8}
          className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
          placeholder="sku,customPriceEgp&#10;HP-CF259A,2400.00&#10;CN-GPR51,1850.50"
          dir="ltr"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={pending} variant="outline">
            {pending
              ? isAr
                ? 'جارٍ الاستيراد...'
                : 'Importing...'
              : isAr
                ? 'استيراد الكل'
                : 'Import all'}
          </Button>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {result ? (
          <div className="space-y-2 rounded-md border bg-background p-3 text-sm">
            <p>
              {isAr ? 'تم:' : 'Done:'} {result.created}{' '}
              {isAr ? 'جديد' : 'created'} · {result.updated}{' '}
              {isAr ? 'محدّث' : 'updated'}
            </p>
            {result.errors.length > 0 ? (
              <div className="rounded bg-destructive/10 p-2 text-xs">
                <p className="mb-1 font-medium text-destructive">
                  {isAr
                    ? `${result.errors.length} سطر فشل:`
                    : `${result.errors.length} row(s) failed:`}
                </p>
                <ul className="space-y-0.5">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i} className="font-mono text-destructive">
                      {isAr ? `سطر` : 'Row'} {err.row}:{' '}
                      {err.sku ? `${err.sku} — ` : ''}
                      {err.reason}
                    </li>
                  ))}
                  {result.errors.length > 10 ? (
                    <li className="text-muted-foreground">
                      ... +{result.errors.length - 10}
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </form>
    </details>
  );
}
