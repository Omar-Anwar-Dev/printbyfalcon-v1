'use client';

import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import type { Governorate } from '@prisma/client';
import { updateGovernorateConfigAction } from '@/app/actions/admin-governorates';

type Row = {
  code: Governorate;
  nameAr: string;
  nameEn: string;
  deliverable: boolean;
  zoneId: string | null;
  position: number;
};

type ZoneOption = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
};

type Props = {
  locale: 'ar' | 'en';
  rows: Row[];
  zones: ZoneOption[];
};

export function GovernoratesTable({ locale, rows: initial, zones }: Props) {
  const isAr = locale === 'ar';
  const [rows, setRows] = useState<Row[]>(initial);
  const [savedCode, setSavedCode] = useState<Governorate | null>(null);
  const [errorCode, setErrorCode] = useState<{
    code: Governorate;
    msg: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingCode, setEditingCode] = useState<Governorate | null>(null);

  function update(code: Governorate, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.code === code ? { ...r, ...patch } : r)),
    );
  }

  function save(row: Row) {
    setSavedCode(null);
    setErrorCode(null);
    startTransition(async () => {
      const r = await updateGovernorateConfigAction({
        code: row.code,
        nameAr: row.nameAr,
        nameEn: row.nameEn,
        deliverable: row.deliverable,
        zoneId: row.zoneId,
        position: row.position,
      });
      if (!r.ok) {
        setErrorCode({
          code: row.code,
          msg: errorMessage(r.errorKey, isAr),
        });
        return;
      }
      setSavedCode(row.code);
      setEditingCode(null);
      setTimeout(() => setSavedCode(null), 2500);
    });
  }

  // Quick-toggle deliverable without entering edit mode.
  function toggleDeliverable(row: Row) {
    setSavedCode(null);
    setErrorCode(null);
    const updated = { ...row, deliverable: !row.deliverable };
    update(row.code, { deliverable: updated.deliverable });
    startTransition(async () => {
      const r = await updateGovernorateConfigAction({
        code: updated.code,
        nameAr: updated.nameAr,
        nameEn: updated.nameEn,
        deliverable: updated.deliverable,
        zoneId: updated.zoneId,
        position: updated.position,
      });
      if (!r.ok) {
        // revert
        update(row.code, { deliverable: row.deliverable });
        setErrorCode({ code: row.code, msg: errorMessage(r.errorKey, isAr) });
        return;
      }
      setSavedCode(updated.code);
      setTimeout(() => setSavedCode(null), 2000);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-paper">
        <div className="grid grid-cols-12 gap-2 border-b border-border bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <div className="col-span-3">{isAr ? 'الاسم' : 'Name'}</div>
          <div className="col-span-3">{isAr ? 'المنطقة' : 'Zone'}</div>
          <div className="col-span-2 text-center">
            {isAr ? 'الترتيب' : 'Position'}
          </div>
          <div className="col-span-2 text-center">
            {isAr ? 'الحالة' : 'Delivery'}
          </div>
          <div className="col-span-2 text-end">
            {isAr ? 'إجراء' : 'Actions'}
          </div>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((row) => {
            const isEditing = editingCode === row.code;
            const zoneLabel = (() => {
              if (!row.zoneId) return isAr ? '— غير محدّد —' : '— Unassigned —';
              const z = zones.find((zz) => zz.id === row.zoneId);
              if (!z) return row.zoneId;
              return isAr ? z.nameAr : z.nameEn;
            })();
            return (
              <li
                key={row.code}
                className={`grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm ${
                  !row.deliverable ? 'bg-muted/30 opacity-70' : ''
                }`}
              >
                {/* Name */}
                <div className="col-span-3 min-w-0">
                  {isEditing ? (
                    <div className="space-y-1">
                      <input
                        className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                        value={row.nameAr}
                        onChange={(e) =>
                          update(row.code, { nameAr: e.target.value })
                        }
                        placeholder="عربي"
                      />
                      <input
                        className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                        value={row.nameEn}
                        onChange={(e) =>
                          update(row.code, { nameEn: e.target.value })
                        }
                        placeholder="English"
                      />
                    </div>
                  ) : (
                    <div className="truncate">
                      <div className="truncate font-medium text-foreground">
                        {isAr ? row.nameAr : row.nameEn}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {isAr ? row.nameEn : row.nameAr}
                      </div>
                    </div>
                  )}
                </div>

                {/* Zone */}
                <div className="col-span-3 min-w-0">
                  {isEditing ? (
                    <select
                      className="block w-full rounded border border-border bg-background px-2 py-1 text-sm"
                      value={row.zoneId ?? ''}
                      onChange={(e) =>
                        update(row.code, {
                          zoneId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">
                        {isAr ? '— غير محدّد —' : '— Unassigned —'}
                      </option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {isAr ? z.nameAr : z.nameEn}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="truncate text-foreground">{zoneLabel}</div>
                  )}
                </div>

                {/* Position */}
                <div className="col-span-2 text-center">
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm"
                      value={row.position}
                      min={0}
                      max={999}
                      onChange={(e) =>
                        update(row.code, {
                          position: Number(e.target.value || 0),
                        })
                      }
                    />
                  ) : (
                    <span className="text-muted-foreground">
                      {row.position}
                    </span>
                  )}
                </div>

                {/* Deliverable */}
                <div className="col-span-2 flex items-center justify-center">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggleDeliverable(row)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      row.deliverable
                        ? 'bg-success/15 text-success hover:bg-success/20'
                        : 'bg-error/10 text-error hover:bg-error/15'
                    }`}
                  >
                    {row.deliverable ? (
                      <>
                        <Check className="h-3 w-3" />
                        {isAr ? 'يُوصَّل' : 'Delivers'}
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3" />
                        {isAr ? 'موقوف' : 'Disabled'}
                      </>
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => save(row)}
                        className="rounded bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
                      >
                        {isAr ? 'حفظ' : 'Save'}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          // revert from initial
                          const orig = initial.find((r) => r.code === row.code);
                          if (orig) update(row.code, orig);
                          setEditingCode(null);
                        }}
                        className="rounded border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-paper-hover"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingCode(row.code)}
                      className="rounded border border-border bg-background px-3 py-1 text-xs text-foreground transition-colors hover:bg-paper-hover"
                    >
                      {isAr ? 'تعديل' : 'Edit'}
                    </button>
                  )}
                </div>

                {/* per-row status messages */}
                {savedCode === row.code && (
                  <div className="col-span-12 text-xs text-success">
                    {isAr ? 'تم الحفظ ✓' : 'Saved ✓'}
                  </div>
                )}
                {errorCode?.code === row.code && (
                  <div className="col-span-12 text-xs text-error">
                    {errorCode.msg}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        {isAr
          ? 'ملاحظة: لا يمكن إضافة محافظة جديدة من هنا — مصر فيها 27 محافظة محدّدة قانونياً، وكلهم مسجّلة بالفعل. لو الحكومة أعلنت محافظة جديدة، يضيفها المطوّر بسطر واحد في الـ schema.'
          : "Note: New governorates can't be added from here — Egypt has 27 fixed governorates and they're all already listed. If the government announces a new one, a developer adds it via a one-line schema change."}
      </p>
    </div>
  );
}

function errorMessage(key: string, isAr: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    'validation.failed': {
      ar: 'البيانات غير صحيحة',
      en: 'Invalid input',
    },
    'governorate.not_found': {
      ar: 'المحافظة غير موجودة',
      en: 'Governorate not found',
    },
    'shipping.zone_not_found': {
      ar: 'منطقة الشحن غير موجودة',
      en: 'Shipping zone not found',
    },
    'shipping.zone_archived': {
      ar: 'منطقة الشحن المختارة مؤرشفة',
      en: 'Selected zone is archived',
    },
    'settings.update_failed': {
      ar: 'فشل الحفظ، حاول مرة أخرى',
      en: 'Save failed, please retry',
    },
  };
  const entry = map[key];
  if (!entry) return isAr ? 'حدث خطأ غير متوقع' : 'Unexpected error';
  return isAr ? entry.ar : entry.en;
}
