'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { recordReturnAction } from '@/app/actions/admin-returns';
import type { ReturnCheckResult } from '@/lib/returns/policy';

type Item = {
  id: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  returnable: boolean;
};

type Row = { orderItemId: string; qty: number; selected: boolean };

const DECISIONS = [
  { value: 'PENDING', ar: 'قيد المراجعة', en: 'Pending' },
  {
    value: 'APPROVED_CASH',
    ar: 'موافق — استرجاع نقدي',
    en: 'Approved — cash refund',
  },
  {
    value: 'APPROVED_CARD_MANUAL',
    ar: 'موافق — استرجاع يدوي على البطاقة',
    en: 'Approved — manual card refund',
  },
  { value: 'DENIED', ar: 'مرفوض', en: 'Denied' },
] as const;

export function RecordReturnForm({
  orderId,
  items,
  policyCheck,
  canOverride,
  isAr,
}: {
  orderId: string;
  items: Item[];
  policyCheck: ReturnCheckResult;
  canOverride: boolean;
  isAr: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    items.map((i) => ({ orderItemId: i.id, qty: i.qty, selected: false })),
  );
  const [reason, setReason] = useState('');
  const [refundDecision, setRefundDecision] = useState<
    'PENDING' | 'APPROVED_CASH' | 'APPROVED_CARD_MANUAL' | 'DENIED'
  >('PENDING');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [note, setNote] = useState('');
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const policyFailed = !policyCheck.ok;
  const selectedCount = rows.filter((r) => r.selected).length;

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.orderItemId === id ? { ...r, ...patch } : r)),
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) {
      setError(isAr ? 'اختر سطرًا واحدًا على الأقل' : 'Pick at least one line');
      return;
    }
    if (policyFailed && !override) {
      setError(
        isAr
          ? 'الطلب لا يستوفي سياسة الاسترجاع — فعّل "تجاوز السياسة" أو ألغِ الطلب'
          : 'Order does not meet return policy — toggle "Override policy" or cancel',
      );
      return;
    }
    if (policyFailed && override && !overrideReason.trim()) {
      setError(
        isAr ? 'يجب كتابة سبب التجاوز' : 'An override reason is required',
      );
      return;
    }
    startTransition(async () => {
      const res = await recordReturnAction({
        orderId,
        reason,
        refundDecision,
        refundAmountEgp: refundAmount ? Number(refundAmount) : undefined,
        note: note || undefined,
        override: policyFailed && override,
        overrideReason:
          policyFailed && override ? overrideReason.trim() : undefined,
        items: selected.map((r) => ({
          orderItemId: r.orderItemId,
          qty: r.qty,
        })),
      });
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      router.push(`/admin/orders/${orderId}`);
      router.refresh();
    });
  }

  return (
    <form method="post" className="space-y-6" onSubmit={onSubmit}>
      {policyFailed ? (
        <PolicyWarning
          check={policyCheck}
          isAr={isAr}
          canOverride={canOverride}
          override={override}
          onToggleOverride={setOverride}
          overrideReason={overrideReason}
          onOverrideReasonChange={setOverrideReason}
        />
      ) : null}

      <section className="rounded-md border bg-background">
        <header className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
          {isAr ? 'اختر الأصناف' : 'Pick items'}
        </header>
        <ul className="divide-y">
          {items.map((item) => {
            const row = rows.find((r) => r.orderItemId === item.id)!;
            return (
              <li
                key={item.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3"
              >
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={(e) =>
                    updateRow(item.id, { selected: e.target.checked })
                  }
                  className="h-4 w-4"
                  disabled={!item.returnable}
                  title={
                    !item.returnable
                      ? isAr
                        ? 'هذا المنتج غير قابل للاسترجاع'
                        : 'This product is not returnable'
                      : undefined
                  }
                />
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono" dir="ltr">
                      {item.sku}
                    </span>{' '}
                    · {isAr ? 'كمية الطلب' : 'Order qty'}: {item.qty} ·{' '}
                    {item.unitPrice.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                  </div>
                  {!item.returnable ? (
                    <div className="mt-1 text-xs text-destructive">
                      {isAr ? 'غير قابل للاسترجاع' : 'Not returnable'}
                    </div>
                  ) : null}
                </div>
                <Input
                  type="number"
                  min={1}
                  max={item.qty}
                  value={row.qty}
                  disabled={!row.selected}
                  onChange={(e) =>
                    updateRow(item.id, {
                      qty: Math.max(
                        1,
                        Math.min(item.qty, Number(e.target.value) || 1),
                      ),
                    })
                  }
                  className="w-24"
                />
              </li>
            );
          })}
        </ul>
        <footer className="border-t px-4 py-2 text-xs text-muted-foreground">
          {isAr
            ? `المختار: ${selectedCount} / ${items.length}`
            : `${selectedCount} of ${items.length} selected`}
        </footer>
      </section>

      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'سبب الاسترجاع' : 'Return reason'}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={3}
          maxLength={500}
          rows={3}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
          placeholder={
            isAr
              ? 'مثال: العميل استلم منتج تالف.'
              : 'E.g. customer received a damaged item.'
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {isAr ? 'قرار الاسترجاع' : 'Refund decision'}
          </label>
          <select
            value={refundDecision}
            onChange={(e) =>
              setRefundDecision(
                e.target.value as
                  | 'PENDING'
                  | 'APPROVED_CASH'
                  | 'APPROVED_CARD_MANUAL'
                  | 'DENIED',
              )
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {DECISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {isAr ? d.ar : d.en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {isAr
              ? 'مبلغ الاسترجاع (ج.م) — اختياري'
              : 'Refund amount (EGP) — optional'}
          </label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder={isAr ? 'بدون مبلغ' : 'Unspecified'}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'ملاحظة داخلية' : 'Internal note'}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={2}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
        />
      </div>

      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isAr
              ? 'جار الحفظ...'
              : 'Saving...'
            : isAr
              ? 'تسجيل الاسترجاع'
              : 'Record return'}
        </Button>
      </div>
    </form>
  );
}

function PolicyWarning({
  check,
  isAr,
  canOverride,
  override,
  onToggleOverride,
  overrideReason,
  onOverrideReasonChange,
}: {
  check: ReturnCheckResult;
  isAr: boolean;
  canOverride: boolean;
  override: boolean;
  onToggleOverride: (v: boolean) => void;
  overrideReason: string;
  onOverrideReasonChange: (v: string) => void;
}) {
  if (check.ok) return null;

  let msg = '';
  switch (check.reason) {
    case 'disabled':
      msg = isAr
        ? 'الاسترجاع مُعطّل حاليًا في إعدادات السياسة.'
        : 'Returns are currently disabled in policy settings.';
      break;
    case 'window_expired':
      msg = isAr
        ? `مضت ${check.daysSinceDelivery} يوم على التسليم — تجاوز نافذة الـ ${check.windowDays} يوم المسموحة.`
        : `${check.daysSinceDelivery} days since delivery — beyond the ${check.windowDays}-day window.`;
      break;
    case 'min_order':
      msg = isAr
        ? `قيمة الطلب (${check.orderTotalEgp.toFixed(2)} ج.م) أقل من الحد الأدنى (${check.minOrderEgp.toFixed(2)} ج.م).`
        : `Order total (${check.orderTotalEgp.toFixed(2)} EGP) below the ${check.minOrderEgp.toFixed(2)} EGP minimum.`;
      break;
    case 'product_not_returnable':
      msg = isAr
        ? `المنتج ${check.sku} مُعلّم كغير قابل للاسترجاع في قائمة المنتجات.`
        : `Product ${check.sku} is flagged non-returnable in the catalog.`;
      break;
    case 'not_delivered':
      msg = isAr
        ? 'هذا الطلب لم يُسلَّم بعد — لا يمكن استرجاعه قبل التسليم.'
        : 'This order has not been delivered yet — cannot return before delivery.';
      break;
  }

  return (
    <div className="rounded-md border border-warning/30 bg-warning-soft p-4">
      <p className="font-medium text-warning">
        {isAr ? 'تنبيه سياسة الاسترجاع:' : 'Return policy warning:'} {msg}
      </p>
      {canOverride ? (
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => onToggleOverride(e.target.checked)}
              className="h-4 w-4"
            />
            {isAr
              ? 'تجاوز السياسة (مع سبب إجباري)'
              : 'Override policy (reason required)'}
          </label>
          {override ? (
            <textarea
              required
              rows={2}
              value={overrideReason}
              onChange={(e) => onOverrideReasonChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
              placeholder={
                isAr
                  ? 'مثال: عميل مهم، استرجاع لمرة واحدة بموافقة الإدارة.'
                  : 'E.g. important customer, one-off with management approval.'
              }
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-xs text-warning">
          {isAr
            ? 'دورك لا يسمح بتجاوز السياسة. اطلب من المالك.'
            : 'Your role cannot override — ask an Owner.'}
        </p>
      )}
    </div>
  );
}
