'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateReturnPolicyAction } from '@/app/actions/admin-return-policy';
import type { ReturnPolicy } from '@/lib/returns/policy';
import type { AdminRole } from '@prisma/client';

const ROLE_LABELS_AR: Record<AdminRole, string> = {
  OWNER: 'مالك',
  OPS: 'عمليات',
  SALES_REP: 'مبيعات',
};
const ROLE_LABELS_EN: Record<AdminRole, string> = {
  OWNER: 'Owner',
  OPS: 'Ops',
  SALES_REP: 'Sales Rep',
};

export function ReturnPolicyForm({
  policy,
  isAr,
}: {
  policy: ReturnPolicy;
  isAr: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [enabled, setEnabled] = useState(policy.enabled);
  const [windowDays, setWindowDays] = useState(String(policy.windowDays));
  const [minOrderEgp, setMinOrderEgp] = useState(
    policy.minOrderEgp === null ? '' : String(policy.minOrderEgp),
  );
  const [overrideRoles, setOverrideRoles] = useState<AdminRole[]>(
    policy.overrideRoles,
  );
  const labels = isAr ? ROLE_LABELS_AR : ROLE_LABELS_EN;
  const allRoles: AdminRole[] = ['OWNER', 'OPS', 'SALES_REP'];

  function toggleRole(r: AdminRole) {
    setOverrideRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (overrideRoles.length === 0) {
      setError('validation.invalid');
      return;
    }
    startTransition(async () => {
      const res = await updateReturnPolicyAction({
        enabled,
        windowDays: Number(windowDays),
        minOrderEgp: minOrderEgp === '' ? '' : Number(minOrderEgp),
        overrideRoles,
      });
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      setFlash(true);
      router.refresh();
      setTimeout(() => setFlash(false), 2000);
    });
  }

  return (
    <form
      className="space-y-6 rounded-md border bg-background p-5"
      onSubmit={onSubmit}
    >
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">
          {isAr ? 'تفعيل الاسترجاع' : 'Returns enabled'}
        </span>
      </label>
      <p className="-mt-4 text-xs text-muted-foreground">
        {isAr
          ? 'لو مُعطّل، لا يمكن تسجيل أي استرجاع جديد (إلا بتجاوز يدوي).'
          : 'When disabled, no new returns can be recorded (without manual override).'}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {isAr ? 'نافذة الاسترجاع (أيام)' : 'Return window (days)'}
          </label>
          <Input
            type="number"
            min={1}
            max={365}
            required
            value={windowDays}
            onChange={(e) => setWindowDays(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {isAr
              ? 'الحد الأقصى للأيام المسموح بها بعد تاريخ التسليم.'
              : 'Max days allowed after delivery date.'}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {isAr
              ? 'الحد الأدنى لقيمة الطلب (ج.م) — اختياري'
              : 'Min order (EGP) — optional'}
          </label>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder={isAr ? 'بدون حد' : 'No minimum'}
            value={minOrderEgp}
            onChange={(e) => setMinOrderEgp(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {isAr
              ? 'اتركها فارغة لو مافيش حد أدنى.'
              : 'Leave blank for no minimum.'}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">
          {isAr
            ? 'الصلاحيات المسموح لها بتجاوز السياسة'
            : 'Roles allowed to override the policy'}
        </p>
        <p className="mb-2 text-xs text-muted-foreground">
          {isAr
            ? 'لازم تختار دور واحد على الأقل. يجب كتابة سبب إجباري عند كل تجاوز.'
            : 'Pick at least one. Every override requires a written reason.'}
        </p>
        <div className="flex flex-wrap gap-3">
          {allRoles.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={overrideRoles.includes(r)}
                onChange={() => toggleRole(r)}
                className="h-4 w-4"
              />
              {labels[r]}
            </label>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error === 'validation.invalid'
            ? isAr
              ? 'بيانات غير صحيحة — راجع الحقول.'
              : 'Invalid input — check fields.'
            : error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isAr
              ? 'جار الحفظ...'
              : 'Saving...'
            : isAr
              ? 'حفظ السياسة'
              : 'Save policy'}
        </Button>
        {flash ? (
          <span className="text-sm text-green-700">
            {isAr ? 'تم الحفظ ✓' : 'Saved ✓'}
          </span>
        ) : null}
      </div>
    </form>
  );
}
