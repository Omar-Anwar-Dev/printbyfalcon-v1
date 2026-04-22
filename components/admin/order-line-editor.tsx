'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateOrderLineQtyAction } from '@/app/actions/admin-orders';

export function OrderLineEditor({
  orderItemId,
  currentQty,
  isAr,
}: {
  orderItemId: string;
  currentQty: number;
  isAr: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [newQty, setNewQty] = useState(currentQty - 1);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(targetQty: number) {
    setError(null);
    startTransition(async () => {
      const res = await updateOrderLineQtyAction({
        orderItemId,
        newQty: targetQty,
        note: note || undefined,
      });
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-primary hover:underline"
      >
        {isAr ? 'تعديل' : 'Edit'}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded border bg-muted/30 p-2 text-xs">
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground">
          {isAr ? 'كمية جديدة:' : 'New qty:'}
        </label>
        <Input
          type="number"
          min={0}
          max={currentQty - 1}
          value={newQty}
          onChange={(e) => setNewQty(Math.max(0, Number(e.target.value) || 0))}
          className="h-8 w-20"
        />
        <span className="text-muted-foreground">
          / {currentQty} ({isAr ? 'الحالية' : 'current'})
        </span>
      </div>
      <Input
        placeholder={isAr ? 'سبب التعديل (اختياري)' : 'Reason (optional)'}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="h-8"
      />
      {error ? (
        <p className="text-destructive">
          {error === 'order.edit.paid_locked'
            ? isAr
              ? 'هذا الطلب مدفوع — استخدم مسار المرتجعات.'
              : 'This order is paid — use the Returns flow.'
            : error === 'order.edit.not_confirmed'
              ? isAr
                ? 'يمكن التعديل فقط على الطلبات المؤكّدة.'
                : 'Only editable on Confirmed orders.'
              : error === 'order.edit.qty_not_reducing'
                ? isAr
                  ? 'الكمية الجديدة يجب أن تكون أقل من الحالية.'
                  : 'New qty must be less than current.'
                : error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending || newQty >= currentQty}
          onClick={() => submit(newQty)}
        >
          {isPending
            ? isAr
              ? 'جار الحفظ...'
              : 'Saving...'
            : isAr
              ? 'حفظ'
              : 'Save'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            if (
              !confirm(
                isAr
                  ? 'حذف هذا السطر من الطلب؟ سيُعاد المخزون ويُعاد حساب الإجمالي.'
                  : 'Remove this line from the order? Stock will be restored and totals recomputed.',
              )
            )
              return;
            submit(0);
          }}
        >
          {isAr ? 'حذف السطر' : 'Remove line'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
        >
          {isAr ? 'إلغاء' : 'Cancel'}
        </Button>
      </div>
      <p className="text-muted-foreground">
        {isAr
          ? 'تذكير: أعد إصدار الفاتورة بعد التعديل من لوحة الفاتورة.'
          : 'Reminder: regenerate the invoice from the invoice panel after edits.'}
      </p>
    </div>
  );
}
