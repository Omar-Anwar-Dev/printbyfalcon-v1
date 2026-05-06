'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Archive, Trash2, RotateCcw } from 'lucide-react';
import {
  createShippingZoneAction,
  updateShippingZoneFullAction,
  deleteShippingZoneAction,
} from '@/app/actions/admin-governorates';

type Zone = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  baseRateEgp: number;
  freeShippingThresholdB2cEgp: number | null;
  freeShippingThresholdB2bEgp: number | null;
  codEnabled: boolean;
  estimatedDeliveryDaysMin: number;
  estimatedDeliveryDaysMax: number;
  active: boolean;
  governorateCount: number;
  isSeed: boolean;
};

type Props = {
  locale: 'ar' | 'en';
  zones: Zone[];
};

// Note: the seed-zone code list lives in `lib/shipping/seed-zone-codes.ts`
// (not here) so the server page can import it. Bundling a constant inside
// a `'use client'` module and re-importing it from the server breaks at
// build time — the minifier scrambles the reference.

function emptyDraft(): {
  nameAr: string;
  nameEn: string;
  baseRateEgp: number;
  freeShippingThresholdB2cEgp: number | null;
  freeShippingThresholdB2bEgp: number | null;
  codEnabled: boolean;
  estimatedDeliveryDaysMin: number;
  estimatedDeliveryDaysMax: number;
} {
  return {
    nameAr: '',
    nameEn: '',
    baseRateEgp: 60,
    freeShippingThresholdB2cEgp: null,
    freeShippingThresholdB2bEgp: null,
    codEnabled: true,
    estimatedDeliveryDaysMin: 2,
    estimatedDeliveryDaysMax: 5,
  };
}

export function ZonesManager({ locale, zones: initial }: Props) {
  const isAr = locale === 'ar';
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>(initial);
  const [pending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{
    kind: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newDraft, setNewDraft] = useState(emptyDraft);

  function flash(kind: 'ok' | 'err', text: string) {
    setStatusMsg({ kind, text });
    setTimeout(() => setStatusMsg(null), 3500);
  }

  function patchZone(id: string, patch: Partial<Zone>) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }

  function saveZone(z: Zone) {
    startTransition(async () => {
      const r = await updateShippingZoneFullAction({
        id: z.id,
        nameAr: z.nameAr,
        nameEn: z.nameEn,
        baseRateEgp: z.baseRateEgp,
        freeShippingThresholdB2cEgp: z.freeShippingThresholdB2cEgp,
        freeShippingThresholdB2bEgp: z.freeShippingThresholdB2bEgp,
        codEnabled: z.codEnabled,
        estimatedDeliveryDaysMin: z.estimatedDeliveryDaysMin,
        estimatedDeliveryDaysMax: z.estimatedDeliveryDaysMax,
        active: z.active,
      });
      if (!r.ok) {
        flash('err', errMsg(r.errorKey, isAr));
        return;
      }
      flash('ok', isAr ? `تم حفظ ${z.nameAr}` : `Saved ${z.nameEn}`);
      router.refresh();
    });
  }

  function toggleActive(z: Zone) {
    if (z.active && z.governorateCount > 0) {
      flash(
        'err',
        isAr
          ? 'هذي المنطقة فيها محافظات. أعد توزيع المحافظات أولاً ثم أرشف.'
          : 'This zone has governorates. Reassign them first, then archive.',
      );
      return;
    }
    saveZone({ ...z, active: !z.active });
  }

  function deleteZone(z: Zone) {
    if (z.isSeed) {
      flash(
        'err',
        isAr
          ? 'لا يمكن حذف المناطق الأساسية الخمسة. استخدم الأرشفة بدلاً.'
          : 'Cannot delete the 5 seed zones — archive instead.',
      );
      return;
    }
    if (z.governorateCount > 0) {
      flash(
        'err',
        isAr
          ? 'هذي المنطقة فيها محافظات. أعد توزيع المحافظات أولاً.'
          : 'This zone has governorates. Reassign them first.',
      );
      return;
    }
    if (
      !confirm(
        isAr
          ? `سيتم حذف المنطقة "${z.nameAr}" نهائياً. تأكيد؟`
          : `Permanently delete zone "${z.nameEn}"?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await deleteShippingZoneAction({ id: z.id });
      if (!r.ok) {
        flash('err', errMsg(r.errorKey, isAr));
        return;
      }
      flash('ok', isAr ? 'تم الحذف' : 'Deleted');
      setZones((prev) => prev.filter((zz) => zz.id !== z.id));
    });
  }

  function createZone() {
    if (!newDraft.nameAr.trim() || !newDraft.nameEn.trim()) {
      flash(
        'err',
        isAr ? 'الأسماء (عربي + إنجليزي) مطلوبة' : 'Both names are required',
      );
      return;
    }
    if (newDraft.estimatedDeliveryDaysMin > newDraft.estimatedDeliveryDaysMax) {
      flash(
        'err',
        isAr
          ? 'الحد الأدنى لأيام التوصيل أكبر من الحد الأقصى'
          : 'Min delivery days greater than max',
      );
      return;
    }
    startTransition(async () => {
      const r = await createShippingZoneAction(newDraft);
      if (!r.ok) {
        flash('err', errMsg(r.errorKey, isAr));
        return;
      }
      flash('ok', isAr ? 'تم إنشاء المنطقة' : 'Zone created');
      setShowNew(false);
      setNewDraft(emptyDraft());
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {statusMsg && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            statusMsg.kind === 'ok'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-error/30 bg-error/10 text-error'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <ul className="space-y-3">
        {zones.map((z) => (
          <li
            key={z.id}
            className={`rounded-xl border ${
              z.active
                ? 'border-border bg-paper'
                : 'border-border/40 bg-muted/20'
            } p-4`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {isAr ? z.nameAr : z.nameEn}
                  </h3>
                  {!z.active && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {isAr ? 'مؤرشف' : 'Archived'}
                    </span>
                  )}
                  {z.isSeed && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent-strong">
                      {isAr ? 'أساسي' : 'Seed'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {z.code}
                  {' · '}
                  {z.governorateCount} {isAr ? 'محافظة' : 'governorate(s)'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggleActive(z)}
                  className="inline-flex items-center gap-1 rounded border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-paper-hover"
                >
                  {z.active ? (
                    <>
                      <Archive className="h-3 w-3" />
                      {isAr ? 'أرشفة' : 'Archive'}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3" />
                      {isAr ? 'استرجاع' : 'Restore'}
                    </>
                  )}
                </button>
                {!z.isSeed && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => deleteZone(z)}
                    className="inline-flex items-center gap-1 rounded border border-error/30 bg-background px-3 py-1 text-xs text-error hover:bg-error/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    {isAr ? 'حذف' : 'Delete'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label={isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}>
                <input
                  type="text"
                  className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  value={z.nameAr}
                  onChange={(e) => patchZone(z.id, { nameAr: e.target.value })}
                />
              </Field>
              <Field label={isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}>
                <input
                  type="text"
                  className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  value={z.nameEn}
                  onChange={(e) => patchZone(z.id, { nameEn: e.target.value })}
                />
              </Field>
              <Field label={isAr ? 'سعر الشحن (ج.م)' : 'Shipping rate (EGP)'}>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  value={z.baseRateEgp}
                  onChange={(e) =>
                    patchZone(z.id, {
                      baseRateEgp: Number(e.target.value || 0),
                    })
                  }
                />
              </Field>
              <Field label={isAr ? 'الدفع عند الاستلام' : 'COD'}>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={z.codEnabled}
                    onChange={(e) =>
                      patchZone(z.id, { codEnabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  {isAr
                    ? z.codEnabled
                      ? 'مفعّل'
                      : 'موقوف'
                    : z.codEnabled
                      ? 'Enabled'
                      : 'Disabled'}
                </label>
              </Field>
              <Field
                label={
                  isAr
                    ? 'أيام التوصيل المتوقعة (أدنى)'
                    : 'Estimated delivery (min days)'
                }
              >
                <input
                  type="number"
                  min={0}
                  max={60}
                  className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  value={z.estimatedDeliveryDaysMin}
                  onChange={(e) =>
                    patchZone(z.id, {
                      estimatedDeliveryDaysMin: Number(e.target.value || 0),
                    })
                  }
                />
              </Field>
              <Field
                label={
                  isAr
                    ? 'أيام التوصيل المتوقعة (أقصى)'
                    : 'Estimated delivery (max days)'
                }
              >
                <input
                  type="number"
                  min={0}
                  max={60}
                  className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  value={z.estimatedDeliveryDaysMax}
                  onChange={(e) =>
                    patchZone(z.id, {
                      estimatedDeliveryDaysMax: Number(e.target.value || 0),
                    })
                  }
                />
              </Field>
              <Field
                label={
                  isAr
                    ? 'حد الشحن المجاني — B2C (ج.م)'
                    : 'Free shipping — B2C (EGP)'
                }
              >
                <input
                  type="number"
                  min={0}
                  className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  value={z.freeShippingThresholdB2cEgp ?? ''}
                  placeholder={isAr ? 'افتراضي عام' : 'Use global default'}
                  onChange={(e) =>
                    patchZone(z.id, {
                      freeShippingThresholdB2cEgp:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field
                label={
                  isAr
                    ? 'حد الشحن المجاني — B2B (ج.م)'
                    : 'Free shipping — B2B (EGP)'
                }
              >
                <input
                  type="number"
                  min={0}
                  className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  value={z.freeShippingThresholdB2bEgp ?? ''}
                  placeholder={isAr ? 'افتراضي عام' : 'Use global default'}
                  onChange={(e) =>
                    patchZone(z.id, {
                      freeShippingThresholdB2bEgp:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={pending}
                onClick={() => saveZone(z)}
                className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {isAr ? 'حفظ التغييرات' : 'Save changes'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!showNew ? (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-paper px-4 py-3 text-sm text-foreground hover:border-accent/40 hover:bg-paper-hover"
        >
          <Plus className="h-4 w-4" />
          {isAr ? 'إنشاء منطقة جديدة' : 'Create new zone'}
        </button>
      ) : (
        <div className="rounded-xl border border-border bg-paper p-4">
          <h3 className="mb-3 font-semibold text-foreground">
            {isAr ? 'منطقة جديدة' : 'New zone'}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}>
              <input
                type="text"
                className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={newDraft.nameAr}
                onChange={(e) =>
                  setNewDraft({ ...newDraft, nameAr: e.target.value })
                }
              />
            </Field>
            <Field label={isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}>
              <input
                type="text"
                className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={newDraft.nameEn}
                onChange={(e) =>
                  setNewDraft({ ...newDraft, nameEn: e.target.value })
                }
              />
            </Field>
            <Field label={isAr ? 'سعر الشحن (ج.م)' : 'Shipping rate (EGP)'}>
              <input
                type="number"
                min={0}
                step={0.5}
                className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={newDraft.baseRateEgp}
                onChange={(e) =>
                  setNewDraft({
                    ...newDraft,
                    baseRateEgp: Number(e.target.value || 0),
                  })
                }
              />
            </Field>
            <Field label={isAr ? 'الدفع عند الاستلام' : 'COD'}>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newDraft.codEnabled}
                  onChange={(e) =>
                    setNewDraft({ ...newDraft, codEnabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                {isAr ? 'مفعّل' : 'Enabled'}
              </label>
            </Field>
            <Field label={isAr ? 'أيام التوصيل (أدنى)' : 'Delivery days (min)'}>
              <input
                type="number"
                min={0}
                max={60}
                className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={newDraft.estimatedDeliveryDaysMin}
                onChange={(e) =>
                  setNewDraft({
                    ...newDraft,
                    estimatedDeliveryDaysMin: Number(e.target.value || 0),
                  })
                }
              />
            </Field>
            <Field label={isAr ? 'أيام التوصيل (أقصى)' : 'Delivery days (max)'}>
              <input
                type="number"
                min={0}
                max={60}
                className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={newDraft.estimatedDeliveryDaysMax}
                onChange={(e) =>
                  setNewDraft({
                    ...newDraft,
                    estimatedDeliveryDaysMax: Number(e.target.value || 0),
                  })
                }
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              disabled={pending}
              className="rounded border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-paper-hover"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={createZone}
              disabled={pending}
              className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
            >
              {isAr ? 'إنشاء' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function errMsg(key: string, isAr: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    'validation.failed': { ar: 'البيانات غير صحيحة', en: 'Invalid input' },
    'shipping.zone_not_found': {
      ar: 'المنطقة غير موجودة',
      en: 'Zone not found',
    },
    'shipping.zone_has_governorates': {
      ar: 'المنطقة فيها محافظات نشطة',
      en: 'Zone has active governorates',
    },
    'shipping.zone_seed_protected': {
      ar: 'لا يمكن حذف منطقة أساسية. أرشفها بدلاً.',
      en: 'Cannot delete a seed zone — archive it instead.',
    },
    'shipping.delivery_days_invalid': {
      ar: 'أيام التوصيل غير منطقية (الحد الأدنى أكبر من الأقصى)',
      en: 'Delivery days invalid (min > max)',
    },
    'settings.update_failed': {
      ar: 'فشل العملية، حاول مرة أخرى',
      en: 'Operation failed, please retry',
    },
  };
  const entry = map[key];
  if (!entry) return isAr ? 'حدث خطأ غير متوقع' : 'Unexpected error';
  return isAr ? entry.ar : entry.en;
}
