'use client';

import { useState, useTransition } from 'react';
import {
  updateShippingZoneAction,
  updateFreeShipThresholdsAction,
  bulkReassignGovernoratesAction,
} from '@/app/actions/admin-settings';
import { GOVERNORATE_OPTIONS } from '@/lib/i18n/governorates';
import type { Governorate, ShippingZoneCode } from '@prisma/client';

type ZoneInput = {
  id: string;
  code: ShippingZoneCode;
  nameAr: string;
  nameEn: string;
  baseRateEgp: number;
  freeShippingThresholdB2cEgp: number | null;
  freeShippingThresholdB2bEgp: number | null;
  codEnabled: boolean;
};

type Props = {
  locale: 'ar' | 'en';
  zones: ZoneInput[];
  governorateMap: Record<string, string>; // governorate → zoneId
  thresholds: { b2cEgp: number; b2bEgp: number };
};

export function ShippingSettingsForm({
  locale,
  zones: initialZones,
  governorateMap: initialMap,
  thresholds: initialThresholds,
}: Props) {
  const isAr = locale === 'ar';
  const [zones, setZones] = useState<ZoneInput[]>(initialZones);
  const [globalThresholds, setGlobalThresholds] = useState(initialThresholds);
  const [governorateMap, setGovernorateMap] =
    useState<Record<string, string>>(initialMap);
  const [pending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bulk reassign state — user picks zone + ticks governorates.
  const [bulkZoneId, setBulkZoneId] = useState<string>(zones[0]?.id ?? '');
  const [bulkSelected, setBulkSelected] = useState<Set<Governorate>>(new Set());

  function updateZoneField<K extends keyof ZoneInput>(
    id: string,
    key: K,
    value: ZoneInput[K],
  ) {
    setZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, [key]: value } : z)),
    );
  }

  function saveZone(z: ZoneInput) {
    setErrorMsg(null);
    setSavedMsg(null);
    startTransition(async () => {
      const r = await updateShippingZoneAction({
        id: z.id,
        baseRateEgp: z.baseRateEgp,
        freeShippingThresholdB2cEgp: z.freeShippingThresholdB2cEgp,
        freeShippingThresholdB2bEgp: z.freeShippingThresholdB2bEgp,
        codEnabled: z.codEnabled,
      });
      if (!r.ok) {
        setErrorMsg(isAr ? 'فشل الحفظ' : 'Save failed');
        return;
      }
      setSavedMsg(isAr ? `تم حفظ منطقة ${z.nameAr}` : `Saved zone ${z.nameEn}`);
    });
  }

  function saveThresholds() {
    setErrorMsg(null);
    setSavedMsg(null);
    startTransition(async () => {
      const r = await updateFreeShipThresholdsAction(globalThresholds);
      if (!r.ok) {
        setErrorMsg(isAr ? 'فشل الحفظ' : 'Save failed');
        return;
      }
      setSavedMsg(isAr ? 'تم حفظ حدود الشحن المجاني' : 'Thresholds saved');
    });
  }

  function bulkReassign() {
    setErrorMsg(null);
    setSavedMsg(null);
    if (bulkSelected.size === 0 || !bulkZoneId) return;
    const list = Array.from(bulkSelected);
    startTransition(async () => {
      const r = await bulkReassignGovernoratesAction({
        zoneId: bulkZoneId,
        governorates: list,
      });
      if (!r.ok) {
        setErrorMsg(isAr ? 'فشل إعادة الربط' : 'Reassign failed');
        return;
      }
      setGovernorateMap((prev) => {
        const next = { ...prev };
        for (const g of list) next[g] = bulkZoneId;
        return next;
      });
      setBulkSelected(new Set());
      setSavedMsg(
        isAr
          ? `تم ربط ${list.length} محافظة بالمنطقة المختارة.`
          : `Reassigned ${list.length} governorate${list.length > 1 ? 's' : ''}.`,
      );
    });
  }

  function toggleGovernorate(g: Governorate) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  return (
    <div className="space-y-8">
      {savedMsg ? (
        <div className="rounded-md border border-success/40 bg-success-soft p-3 text-sm text-success dark:bg-success/20 dark:text-success">
          {savedMsg}
        </div>
      ) : null}
      {errorMsg ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMsg}
        </div>
      ) : null}

      {/* Global thresholds */}
      <section className="space-y-3 rounded-md border bg-background p-4">
        <h2 className="text-base font-semibold">
          {isAr ? 'حدود الشحن المجاني الافتراضية' : 'Free-shipping thresholds'}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? 'تُطبَّق عندما لا توجد قيمة مخصصة للمنطقة. يمكن تجاوزها لكل منطقة أدناه.'
            : 'Applied when a zone has no override. Zone-level overrides below take priority.'}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>{isAr ? 'العملاء الأفراد (B2C) — ج.م' : 'B2C (EGP)'}</span>
            <input
              type="number"
              min={0}
              value={globalThresholds.b2cEgp}
              onChange={(e) =>
                setGlobalThresholds({
                  ...globalThresholds,
                  b2cEgp: Number(e.target.value),
                })
              }
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>{isAr ? 'الشركات (B2B) — ج.م' : 'B2B (EGP)'}</span>
            <input
              type="number"
              min={0}
              value={globalThresholds.b2bEgp}
              onChange={(e) =>
                setGlobalThresholds({
                  ...globalThresholds,
                  b2bEgp: Number(e.target.value),
                })
              }
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={saveThresholds}
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {isAr ? 'حفظ الحدود' : 'Save thresholds'}
        </button>
      </section>

      {/* Per-zone table */}
      <section className="space-y-3 rounded-md border bg-background p-4">
        <h2 className="text-base font-semibold">
          {isAr ? 'المناطق الخمس' : 'The 5 zones'}
        </h2>
        <div className="space-y-3">
          {zones.map((z) => (
            <div key={z.id} className="rounded-md border p-3 text-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold">
                  {isAr ? z.nameAr : z.nameEn}
                </div>
                <span className="text-xs text-muted-foreground">{z.code}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {isAr ? 'سعر الشحن (ج.م)' : 'Rate (EGP)'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={z.baseRateEgp}
                    onChange={(e) =>
                      updateZoneField(
                        z.id,
                        'baseRateEgp',
                        Number(e.target.value),
                      )
                    }
                    className="w-full rounded-md border bg-background px-2 py-1"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {isAr ? 'حد B2C' : 'B2C free-ship'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={z.freeShippingThresholdB2cEgp ?? ''}
                    placeholder={isAr ? 'افتراضي' : 'default'}
                    onChange={(e) =>
                      updateZoneField(
                        z.id,
                        'freeShippingThresholdB2cEgp',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    className="w-full rounded-md border bg-background px-2 py-1"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {isAr ? 'حد B2B' : 'B2B free-ship'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={z.freeShippingThresholdB2bEgp ?? ''}
                    placeholder={isAr ? 'افتراضي' : 'default'}
                    onChange={(e) =>
                      updateZoneField(
                        z.id,
                        'freeShippingThresholdB2bEgp',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    className="w-full rounded-md border bg-background px-2 py-1"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={z.codEnabled}
                    onChange={(e) =>
                      updateZoneField(z.id, 'codEnabled', e.target.checked)
                    }
                  />
                  <span>
                    {isAr ? 'الدفع عند الاستلام مُفعَّل' : 'COD enabled'}
                  </span>
                </label>
              </div>
              <button
                type="button"
                onClick={() => saveZone(z)}
                disabled={pending}
                className="mt-3 rounded-md border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {isAr ? 'حفظ هذه المنطقة' : 'Save this zone'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Governorate assignment — bulk */}
      <section className="space-y-3 rounded-md border bg-background p-4">
        <h2 className="text-base font-semibold">
          {isAr ? 'ربط المحافظات بالمناطق' : 'Governorate assignment'}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? 'اختر عدة محافظات ثم اربطها بمنطقة شحن واحدة في خطوة واحدة.'
            : 'Tick several governorates and assign them to one zone in a single step.'}
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <select
            value={bulkZoneId}
            onChange={(e) => setBulkZoneId(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {isAr ? z.nameAr : z.nameEn}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={bulkReassign}
            disabled={pending || bulkSelected.size === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {isAr
              ? `ربط ${bulkSelected.size} محافظة`
              : `Assign ${bulkSelected.size}`}
          </button>
        </div>
        <div className="mt-2 grid gap-1 md:grid-cols-3">
          {GOVERNORATE_OPTIONS.map((g) => {
            const currentZoneId = governorateMap[g.value];
            const currentZoneName = (() => {
              const z = zones.find((x) => x.id === currentZoneId);
              if (!z) return isAr ? 'غير معيّنة' : 'Unmapped';
              return isAr ? z.nameAr : z.nameEn;
            })();
            return (
              <label
                key={g.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={bulkSelected.has(g.value)}
                  onChange={() => toggleGovernorate(g.value)}
                />
                <span className="flex-1">{isAr ? g.labelAr : g.labelEn}</span>
                <span className="text-xs text-muted-foreground">
                  {currentZoneName}
                </span>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
