'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearBrandLogoAction,
  updateStoreInfoAction,
  uploadBrandLogoAction,
} from '@/app/actions/admin-store-info';
import type { StoreInfo } from '@/lib/settings/store-info';
import { Button } from '@/components/ui/button';

// Can't import `brandAssetUrl` from `lib/storage/paths` here — that module
// pulls `node:path` via `storageRoot()` and webpack refuses to bundle Node
// built-ins into the client. Inline the URL shape (same prefix as Nginx).
const brandAssetUrl = (filename: string) => `/storage/brand/${filename}`;

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
  const [logoPending, startLogo] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoMsg, setLogoMsg] = useState<string | null>(null);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = () => {
    const input = fileRef.current;
    if (!input?.files?.[0]) return;
    const fd = new FormData();
    fd.append('file', input.files[0]);
    setLogoMsg(null);
    startLogo(async () => {
      const res = await uploadBrandLogoAction(fd);
      if (!res.ok) {
        setLogoMsg(
          isAr ? 'فشل رفع الشعار' : `Logo upload failed: ${res.errorKey}`,
        );
        return;
      }
      setForm((prev) => ({ ...prev, logoFilename: res.data!.filename }));
      setLogoMsg(isAr ? 'تم رفع الشعار' : 'Logo uploaded');
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    });
  };

  const handleLogoClear = () => {
    startLogo(async () => {
      await clearBrandLogoAction();
      setForm((prev) => ({ ...prev, logoFilename: '' }));
      setLogoMsg(isAr ? 'تم إزالة الشعار' : 'Logo cleared');
      router.refresh();
    });
  };

  const fields: Array<{
    key: keyof StoreInfo;
    labelAr: string;
    labelEn: string;
    multiline?: boolean;
    dirLtr?: boolean;
    required?: boolean;
  }> = [
    {
      key: 'nameAr',
      labelAr: 'الاسم التجاري (عربي)',
      labelEn: 'Trade name (AR)',
      required: true,
    },
    {
      key: 'nameEn',
      labelAr: 'الاسم التجاري (إنجليزي)',
      labelEn: 'Trade name (EN)',
      required: true,
      dirLtr: true,
    },
    {
      key: 'commercialRegistryNumber',
      labelAr: 'رقم السجل التجاري',
      labelEn: 'Commercial Registry #',
      required: true,
      dirLtr: true,
    },
    {
      key: 'taxCardNumber',
      labelAr: 'رقم البطاقة الضريبية',
      labelEn: 'Tax Card #',
      required: true,
      dirLtr: true,
    },
    {
      key: 'addressAr',
      labelAr: 'العنوان (عربي)',
      labelEn: 'Address (AR)',
      required: true,
      multiline: true,
    },
    {
      key: 'addressEn',
      labelAr: 'العنوان (إنجليزي)',
      labelEn: 'Address (EN)',
      required: true,
      multiline: true,
      dirLtr: true,
    },
    {
      key: 'phone',
      labelAr: 'الهاتف',
      labelEn: 'Phone',
      required: true,
      dirLtr: true,
    },
    {
      key: 'email',
      labelAr: 'البريد الإلكتروني',
      labelEn: 'Email',
      required: true,
      dirLtr: true,
    },
    {
      key: 'website',
      labelAr: 'الموقع',
      labelEn: 'Website',
      required: true,
      dirLtr: true,
    },
    {
      key: 'supportWhatsapp',
      labelAr: 'واتساب خدمة العملاء',
      labelEn: 'Support WhatsApp',
      required: false,
      dirLtr: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Logo block */}
      <section className="rounded-md border bg-background p-4">
        <h2 className="mb-3 text-base font-semibold">
          {isAr ? 'شعار المتجر' : 'Store logo'}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {form.logoFilename ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandAssetUrl(form.logoFilename)}
              alt={isAr ? 'شعار' : 'Logo'}
              className="h-20 w-auto rounded-md border bg-muted/30 p-1"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-md border text-xs text-muted-foreground">
              {isAr ? 'لا يوجد' : 'none'}
            </div>
          )}
          <div className="space-y-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
              ref={fileRef}
              className="block text-sm"
              onChange={handleLogoUpload}
            />
            <div className="flex gap-2">
              {form.logoFilename ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogoClear}
                  disabled={logoPending}
                >
                  {isAr ? 'إزالة' : 'Clear'}
                </Button>
              ) : null}
            </div>
            {logoMsg ? (
              <p className="text-xs text-muted-foreground">{logoMsg}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {isAr
                ? 'PNG / JPG / WebP / SVG. يُعاد ترميزه إلى WebP ≤ 400px.'
                : 'PNG / JPG / WebP / SVG. Re-encoded to WebP ≤ 400px.'}
            </p>
          </div>
        </div>
      </section>

      {/* Main form */}
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-md border bg-background p-6"
      >
        {fields.map((f) => (
          <label key={f.key} className="grid gap-1 text-sm">
            <span className="font-medium">
              {isAr ? f.labelAr : f.labelEn}
              {!f.required ? (
                <span className="ms-1 text-xs text-muted-foreground">
                  {isAr ? '(اختياري)' : '(optional)'}
                </span>
              ) : null}
            </span>
            {f.multiline ? (
              <textarea
                value={form[f.key] as string}
                onChange={setField(f.key)}
                rows={2}
                dir={f.dirLtr ? 'ltr' : undefined}
                className="rounded-md border bg-background px-3 py-2"
                required={f.required}
              />
            ) : (
              <input
                type="text"
                value={form[f.key] as string}
                onChange={setField(f.key)}
                dir={f.dirLtr ? 'ltr' : undefined}
                className="h-9 rounded-md border bg-background px-3"
                required={f.required}
              />
            )}
          </label>
        ))}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {saved ? (isAr ? 'تم الحفظ' : 'Saved') : ''}
            {error ? <span className="text-error">{error}</span> : null}
          </span>
          <Button type="submit" disabled={pending}>
            {isAr ? 'حفظ' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}
