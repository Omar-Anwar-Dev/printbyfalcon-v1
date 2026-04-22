'use client';

import { useState, useTransition } from 'react';
import { markCodOrderPaidAction } from '@/app/actions/admin-orders';

export function CodMarkPaidButton({
  orderId,
  locale,
}: {
  orderId: string;
  locale: string;
}) {
  const isAr = locale === 'ar';
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function confirm() {
    setErr(null);
    startTransition(async () => {
      const r = await markCodOrderPaidAction({ orderId, note });
      if (!r.ok) {
        setErr(
          isAr
            ? 'تعذر تسجيل الدفع — تحقق من حالة الطلب.'
            : `Mark paid failed: ${r.errorKey}`,
        );
        return;
      }
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-200"
      >
        {isAr ? 'تسجيل استلام الدفع نقدًا' : 'Mark COD as paid'}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-sm">
      <p className="font-medium">
        {isAr ? 'تأكيد استلام الدفع؟' : 'Mark this COD order as paid?'}
      </p>
      <label className="block space-y-1 text-xs">
        <span className="text-muted-foreground">
          {isAr
            ? 'ملاحظة (اختياري) — من استلم، مكان الاستلام، ...'
            : 'Note (optional) — who collected, where, etc.'}
        </span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          className="w-full rounded-md border bg-background px-2 py-1"
        />
      </label>
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {isAr ? 'تأكيد' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="rounded-md border px-3 py-1.5 text-xs font-medium"
        >
          {isAr ? 'إلغاء' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
