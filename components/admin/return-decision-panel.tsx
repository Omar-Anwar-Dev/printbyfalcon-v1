'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateReturnDecisionAction } from '@/app/actions/admin-returns';
import type { RefundDecision } from '@prisma/client';

const DECISIONS: Array<{
  value: RefundDecision;
  ar: string;
  en: string;
}> = [
  { value: 'PENDING', ar: 'قيد المراجعة', en: 'Pending' },
  { value: 'APPROVED_CASH', ar: 'موافق — استرجاع نقدي', en: 'Approved — cash' },
  {
    value: 'APPROVED_CARD_MANUAL',
    ar: 'موافق — بطاقة (يدوي)',
    en: 'Approved — card (manual)',
  },
  { value: 'DENIED', ar: 'مرفوض', en: 'Denied' },
];

export function ReturnDecisionPanel({
  returnId,
  currentDecision,
  currentAmount,
  currentNote,
  stockReleasedAt,
  isAr,
}: {
  returnId: string;
  currentDecision: RefundDecision;
  currentAmount: number | null;
  currentNote: string | null;
  stockReleasedAt: Date | null;
  isAr: boolean;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<RefundDecision>(currentDecision);
  const [amount, setAmount] = useState(
    currentAmount === null ? '' : String(currentAmount),
  );
  const [note, setNote] = useState(currentNote ?? '');
  const [isPending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const willApprove =
    decision === 'APPROVED_CASH' || decision === 'APPROVED_CARD_MANUAL';

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFlash(null);
    startTransition(async () => {
      const res = await updateReturnDecisionAction({
        returnId,
        refundDecision: decision,
        refundAmountEgp: amount === '' ? null : Number(amount),
        note: note === '' ? null : note,
      });
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      setFlash(
        res.data.stockReleased
          ? isAr
            ? 'تم الحفظ — أُعيد المخزون ✓'
            : 'Saved — stock released ✓'
          : isAr
            ? 'تم الحفظ ✓'
            : 'Saved ✓',
      );
      router.refresh();
      setTimeout(() => setFlash(null), 3000);
    });
  }

  return (
    <form
      className="space-y-4 rounded-md border bg-background p-5"
      onSubmit={onSubmit}
    >
      <h2 className="text-lg font-semibold">
        {isAr ? 'قرار الاسترجاع' : 'Refund decision'}
      </h2>

      <div>
        <label className="mb-1 block text-sm font-medium">
          {isAr ? 'القرار' : 'Decision'}
        </label>
        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value as RefundDecision)}
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
          {isAr ? 'مبلغ الاسترجاع (ج.م)' : 'Refund amount (EGP)'}
        </label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={isAr ? 'اختياري' : 'Optional'}
        />
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

      <div className="rounded-md bg-muted/30 p-3 text-xs">
        <strong className="mb-1 block">
          {isAr ? 'إعادة المخزون' : 'Stock release'}
        </strong>
        {stockReleasedAt ? (
          <span className="text-green-700">
            {isAr ? 'تم إرجاع المخزون في ' : 'Stock was released on '}
            {new Date(stockReleasedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
          </span>
        ) : willApprove ? (
          <span className="text-amber-800">
            {isAr
              ? 'عند الحفظ بقرار "موافق"، ستُعاد الكميات إلى المخزون تلقائيًا (عملية واحدة فقط لكل استرجاع).'
              : 'Saving with an "Approved" decision releases quantities to inventory (once per return).'}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {isAr ? 'لم يُعَد المخزون بعد.' : 'Stock not yet released.'}
          </span>
        )}
      </div>

      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {flash ? <p className="text-sm text-green-700">{flash}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending
          ? isAr
            ? 'جار الحفظ...'
            : 'Saving...'
          : isAr
            ? 'حفظ القرار'
            : 'Save decision'}
      </Button>
    </form>
  );
}
