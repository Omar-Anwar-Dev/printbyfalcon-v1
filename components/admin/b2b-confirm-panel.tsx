'use client';

/**
 * Sprint 8 S8-D2-T2 / S8-D7-T3 — the B2B Confirm panel shown at the top of
 * /admin/orders/[id] when the order is B2B + PENDING_CONFIRMATION. Captures
 * the free-text `paymentMethodNote` (PO#, bank transfer ref, "Net-15 on
 * account", etc.) that becomes part of the invoice + order detail record.
 *
 * Keep it intentionally loud — the CTA is the whole point of the queue.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { confirmB2BOrderAction } from '@/app/actions/admin-orders';

type Labels = {
  title: string;
  body: string;
  paymentMethodNoteLabel: string;
  paymentMethodNoteHelp: string;
  noteLabel: string;
  notePlaceholder: string;
  confirmCta: string;
  confirming: string;
  successToast: string;
  errorGeneric: string;
  errorMap: Record<string, string>;
};

export function B2BConfirmPanel({
  orderId,
  labels,
}: {
  orderId: string;
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paymentMethodNote, setPaymentMethodNote] = useState('');
  const [note, setNote] = useState('');

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!paymentMethodNote.trim()) {
      setError(
        labels.errorMap['paymentMethodNote.required'] ?? labels.errorGeneric,
      );
      return;
    }
    start(async () => {
      const res = await confirmB2BOrderAction({
        orderId,
        paymentMethodNote: paymentMethodNote.trim(),
        note: note.trim() || undefined,
      });
      if (!res.ok) {
        setError(labels.errorMap[res.errorKey] ?? labels.errorGeneric);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border-2 border-accent/60 bg-accent/5 p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{labels.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{labels.body}</p>
        </div>
      </div>

      <div className="grid gap-3">
        <label className="space-y-1 text-sm">
          <span>
            {labels.paymentMethodNoteLabel}
            <span className="text-destructive"> *</span>
          </span>
          <input
            value={paymentMethodNote}
            onChange={(e) => setPaymentMethodNote(e.target.value)}
            maxLength={200}
            required
            className="w-full rounded-md border bg-background px-3 py-2"
          />
          <span className="block text-xs text-muted-foreground">
            {labels.paymentMethodNoteHelp}
          </span>
        </label>

        <label className="space-y-1 text-sm">
          <span>{labels.noteLabel}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={labels.notePlaceholder}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {pending ? labels.confirming : labels.confirmCta}
          </button>
        </div>
      </div>
    </form>
  );
}
