'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  receiveStockAction,
  adjustInventoryAction,
} from '@/app/actions/admin-inventory';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link } from '@/lib/i18n/routing';

type Mode = 'receive' | 'adjust' | null;

const ADJUST_REASONS = [
  'damaged',
  'theft',
  'count_correction',
  'returned',
  'other',
] as const;

function labels(locale: string) {
  const isAr = locale === 'ar';
  return {
    receive: isAr ? 'استلام' : 'Receive',
    adjust: isAr ? 'تعديل' : 'Adjust',
    history: isAr ? 'السجل' : 'History',
    cancel: isAr ? 'إلغاء' : 'Cancel',
    save: isAr ? 'حفظ' : 'Save',
    qty: isAr ? 'الكمية' : 'Quantity',
    delta: isAr ? 'التغيير (موجب أو سالب)' : 'Delta (+/-)',
    reason: isAr ? 'السبب' : 'Reason',
    note: isAr ? 'ملاحظة' : 'Note',
    receiveTitle: (name: string) =>
      isAr ? `استلام مخزون — ${name}` : `Receive stock — ${name}`,
    receiveDesc: (q: number) =>
      isAr
        ? `الرصيد الحالي: ${q}. سيتم إضافة الكمية المدخلة.`
        : `Current: ${q}. The entered quantity will be added.`,
    adjustTitle: (name: string) =>
      isAr ? `تعديل مخزون — ${name}` : `Adjust stock — ${name}`,
    adjustDesc: (q: number) =>
      isAr
        ? `الرصيد الحالي: ${q}. أدخل التغيير مع السبب.`
        : `Current: ${q}. Enter a signed delta and reason.`,
    genericError: isAr
      ? 'تعذر حفظ التغيير. حاول مرة أخرى.'
      : 'Could not save the change. Try again.',
    negativeError: isAr
      ? 'الرصيد سيصبح سالباً — راجع القيمة.'
      : 'Inventory would go negative — check the value.',
    reasonLabels: {
      damaged: isAr ? 'تالف' : 'Damaged',
      theft: isAr ? 'سرقة' : 'Theft',
      count_correction: isAr ? 'تصحيح جرد' : 'Count correction',
      returned: isAr ? 'مرتجع بدون أمر بيع' : 'Returned (no order)',
      other: isAr ? 'أخرى' : 'Other',
    } as Record<(typeof ADJUST_REASONS)[number], string>,
  };
}

export function InventoryRowActions({
  productId,
  currentQty,
  productLabel,
  locale,
}: {
  productId: string;
  currentQty: number;
  productLabel: string;
  locale: string;
}) {
  const L = labels(locale);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState<string | null>(null);

  const onReceive = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const qty = Number(fd.get('qty'));
    const reason = String(fd.get('reason') ?? '').trim();
    if (!Number.isFinite(qty) || qty <= 0) {
      setError(L.genericError);
      return;
    }
    start(async () => {
      const res = await receiveStockAction({
        productId,
        qty,
        reason: reason || undefined,
      });
      if (!res.ok) {
        setError(L.genericError);
        return;
      }
      setError(null);
      setMode(null);
      router.refresh();
    });
  };

  const onAdjust = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const qtyDelta = Number(fd.get('qtyDelta'));
    const reasonKey = String(fd.get('reasonKey') ?? 'other');
    const note = String(fd.get('note') ?? '').trim();
    const composed = note ? `${reasonKey}: ${note}` : reasonKey;
    if (!Number.isFinite(qtyDelta) || qtyDelta === 0) {
      setError(L.genericError);
      return;
    }
    start(async () => {
      const res = await adjustInventoryAction({
        productId,
        qtyDelta,
        reason: composed,
      });
      if (!res.ok) {
        setError(
          res.errorKey === 'inventory.would_go_negative'
            ? L.negativeError
            : L.genericError,
        );
        return;
      }
      setError(null);
      setMode(null);
      router.refresh();
    });
  };

  return (
    <div className="inline-flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setError(null);
          setMode('receive');
        }}
      >
        {L.receive}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setError(null);
          setMode('adjust');
        }}
      >
        {L.adjust}
      </Button>
      <Button asChild type="button" size="sm" variant="ghost">
        <Link href={`/admin/inventory/${productId}`}>{L.history}</Link>
      </Button>

      <Dialog
        open={mode === 'receive'}
        onOpenChange={(v) => !v && setMode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L.receiveTitle(productLabel)}</DialogTitle>
            <DialogDescription>{L.receiveDesc(currentQty)}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onReceive(e.currentTarget);
            }}
            className="grid gap-3"
          >
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{L.qty}</span>
              <input
                name="qty"
                type="number"
                min={1}
                step={1}
                required
                className="h-9 rounded-md border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{L.note}</span>
              <input
                name="reason"
                type="text"
                maxLength={500}
                className="h-9 rounded-md border bg-background px-3"
              />
            </label>
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMode(null)}
                disabled={pending}
              >
                {L.cancel}
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {L.save}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mode === 'adjust'}
        onOpenChange={(v) => !v && setMode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L.adjustTitle(productLabel)}</DialogTitle>
            <DialogDescription>{L.adjustDesc(currentQty)}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAdjust(e.currentTarget);
            }}
            className="grid gap-3"
          >
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{L.delta}</span>
              <input
                name="qtyDelta"
                type="number"
                step={1}
                required
                className="h-9 rounded-md border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{L.reason}</span>
              <select
                name="reasonKey"
                className="h-9 rounded-md border bg-background px-3"
                defaultValue="count_correction"
              >
                {ADJUST_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {L.reasonLabels[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{L.note}</span>
              <input
                name="note"
                type="text"
                maxLength={500}
                className="h-9 rounded-md border bg-background px-3"
              />
            </label>
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMode(null)}
                disabled={pending}
              >
                {L.cancel}
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {L.save}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
