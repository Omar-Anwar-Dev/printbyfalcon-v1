'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { amendInvoiceAction } from '@/app/actions/admin-invoices';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  version: number;
  isAmended: boolean;
  amendmentReason: string | null;
  generatedAt: string;
};

export function OrderInvoicePanel({
  current,
  history,
  locale,
}: {
  current: InvoiceSummary | null;
  history: InvoiceSummary[];
  locale: string;
}) {
  const isAr = locale === 'ar';
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!current) {
    return (
      <section className="mb-6 rounded-md border bg-background p-4 text-sm">
        <h2 className="text-base font-semibold">
          {isAr ? 'الفاتورة' : 'Invoice'}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? 'سيتم إنشاء الفاتورة تلقائياً عند تأكيد الطلب.'
            : 'Invoice is generated automatically on order confirmation.'}
        </p>
      </section>
    );
  }

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const reason = String(fd.get('reason') ?? '').trim();
    const redeliver = fd.get('redeliver') === 'on';
    if (reason.length < 3) {
      setError(
        isAr
          ? 'أدخل سبباً صالحاً (٣ أحرف على الأقل)'
          : 'Enter a reason (min 3 chars).',
      );
      return;
    }
    start(async () => {
      const res = await amendInvoiceAction({
        invoiceId: current.id,
        reason,
        redeliver,
      });
      if (!res.ok) {
        setError(
          isAr ? 'تعذر التعديل — حاول مرة أخرى.' : 'Amend failed — try again.',
        );
        return;
      }
      setError(null);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <section className="mb-6 rounded-md border bg-background p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            {isAr ? 'الفاتورة' : 'Invoice'}
          </h2>
          <p className="font-mono text-xs text-muted-foreground">
            {current.invoiceNumber}
            {current.version > 1
              ? isAr
                ? ` — نسخة ${current.version}`
                : ` — v${current.version}`
              : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={`/invoices/${current.id}.pdf`}
              target="_blank"
              rel="noopener"
            >
              {isAr ? 'فتح / طباعة' : 'Open / Print'}
            </a>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
          >
            {isAr ? 'تعديل' : 'Amend'}
          </Button>
        </div>
      </div>

      {history.length > 0 ? (
        <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          <div className="mb-1 font-medium">
            {isAr ? 'النسخ السابقة' : 'Previous versions'}
          </div>
          <ul className="space-y-1">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="font-mono">
                  {h.invoiceNumber}{' '}
                  {isAr ? `نسخة ${h.version}` : `v${h.version}`}
                </span>
                <a
                  href={`/invoices/${h.id}.pdf`}
                  target="_blank"
                  rel="noopener"
                  className="text-accent hover:underline"
                >
                  {isAr ? 'فتح' : 'Open'}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAr
                ? `تعديل الفاتورة — ${current.invoiceNumber}`
                : `Amend invoice — ${current.invoiceNumber}`}
            </DialogTitle>
            <DialogDescription>
              {isAr
                ? 'سيتم إنشاء نسخة جديدة برقم فاتورة جديد، والنسخة الحالية تُحفظ في السجل.'
                : 'A new version is created with a fresh number; the current version is preserved in history.'}
            </DialogDescription>
          </DialogHeader>
          <form method="post" onSubmit={submit} className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">
                {isAr
                  ? 'السبب (يظهر على الفاتورة)'
                  : 'Reason (prints on invoice)'}
              </span>
              <textarea
                name="reason"
                rows={3}
                required
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="redeliver" defaultChecked />
              {isAr
                ? 'إعادة إرسال للعميل عبر واتساب'
                : 'Re-send to customer via WhatsApp'}
            </label>
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <div className="mt-1 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {isAr ? 'تعديل الفاتورة' : 'Amend invoice'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
