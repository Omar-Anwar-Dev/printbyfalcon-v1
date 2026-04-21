'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateStoreInfoAction } from '@/app/actions/admin-store-info';
import type { StoreInfo } from '@/lib/settings/store-info';
import { Button } from '@/components/ui/button';

export function StoreInfoForm({
  initial,
  locale,
}: {
  initial: StoreInfo;
  locale: string;
}) {
  const isAr = locale === 'ar';
  const [form, setForm] = useState<StoreInfo>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const setField =
    <K extends keyof StoreInfo>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await updateStoreInfoAction(form);
      if (!res.ok) {
        setError(
          isAr ? 'تعذر الحفظ — تحقق من الحقول.' : 'Save failed — check fields.',
        );
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1500);
    });
  };

  const fields: Array<{
    key: keyof StoreInfo;
    labelAr: string;
    labelEn: string;
    multiline?: boolean;
    dirLtr?: boolean;
  }> = [
    {
      key: 'nameAr',
      labelAr: 'الاسم التجاري (عربي)',
      labelEn: 'Trade name (AR)',
    },
    {
      key: 'nameEn',
      labelAr: 'الاسم التجاري (إنجليزي)',
      labelEn: 'Trade name (EN)',
      dirLtr: true,
    },
    {
      key: 'commercialRegistryNumber',
      labelAr: 'رقم السجل التجاري',
      labelEn: 'Commercial Registry #',
      dirLtr: true,
    },
    {
      key: 'taxCardNumber',
      labelAr: 'رقم البطاقة الضريبية',
      labelEn: 'Tax Card #',
      dirLtr: true,
    },
    {
      key: 'addressAr',
      labelAr: 'العنوان (عربي)',
      labelEn: 'Address (AR)',
      multiline: true,
    },
    {
      key: 'addressEn',
      labelAr: 'العنوان (إنجليزي)',
      labelEn: 'Address (EN)',
      multiline: true,
      dirLtr: true,
    },
    { key: 'phone', labelAr: 'الهاتف', labelEn: 'Phone', dirLtr: true },
    {
      key: 'email',
      labelAr: 'البريد الإلكتروني',
      labelEn: 'Email',
      dirLtr: true,
    },
    { key: 'website', labelAr: 'الموقع', labelEn: 'Website', dirLtr: true },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-md border bg-background p-6"
    >
      {fields.map((f) => (
        <label key={f.key} className="grid gap-1 text-sm">
          <span className="font-medium">{isAr ? f.labelAr : f.labelEn}</span>
          {f.multiline ? (
            <textarea
              value={form[f.key]}
              onChange={setField(f.key)}
              rows={2}
              dir={f.dirLtr ? 'ltr' : undefined}
              className="rounded-md border bg-background px-3 py-2"
              required
            />
          ) : (
            <input
              type="text"
              value={form[f.key]}
              onChange={setField(f.key)}
              dir={f.dirLtr ? 'ltr' : undefined}
              className="h-9 rounded-md border bg-background px-3"
              required
            />
          )}
        </label>
      ))}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {saved ? (isAr ? 'تم الحفظ' : 'Saved') : ''}
          {error ? <span className="text-red-600">{error}</span> : null}
        </span>
        <Button type="submit" disabled={pending}>
          {isAr ? 'حفظ' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
