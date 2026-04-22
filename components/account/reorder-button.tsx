'use client';

/**
 * Sprint 8 S8-D5-T1 + T2 — one-click reorder launcher.
 *
 * Opens a pre-confirmation modal via `/api/orders/[id]/reorder-preview` so
 * the user sees which lines are out-of-stock or archived BEFORE we add
 * anything to the cart. On confirm, calls `reorderAction` with the user's
 * final checkbox choices.
 */
import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reorderAction } from '@/app/actions/orders';

type Line = {
  orderItemId: string;
  productId: string | null;
  sku: string;
  nameAr: string;
  nameEn: string;
  originalQty: number;
  availableQty: number;
  finalPriceEgp: string | null;
  status: 'available' | 'partial' | 'out_of_stock' | 'archived';
};

type Preview = {
  orderId: string;
  orderNumber: string;
  lines: Line[];
};

type Labels = {
  reorderCta: string;
  loading: string;
  /** Template with `{orderNumber}` placeholder. */
  modalTitleTemplate: string;
  body: string;
  statusLabels: {
    available: string;
    partial: string;
    out_of_stock: string;
    archived: string;
  };
  includeColumn: string;
  productColumn: string;
  statusColumn: string;
  qtyColumn: string;
  priceColumn: string;
  addCta: string;
  adding: string;
  cancel: string;
  /** Template with `{count}` placeholder. */
  successLineTemplate: string;
  nothingToAdd: string;
  errorGeneric: string;
  archivedHeader: string;
};

export function ReorderButton({
  orderId,
  locale,
  labels,
  compact,
}: {
  orderId: string;
  locale: 'ar' | 'en';
  labels: Labels;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || preview) return;
    setLoading(true);
    fetch(`/api/orders/${orderId}/reorder-preview`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Preview) => {
        setPreview(data);
        // Pre-tick everything that isn't OOS/archived.
        const next = new Set<string>();
        for (const line of data.lines) {
          if (
            line.productId &&
            (line.status === 'available' || line.status === 'partial')
          ) {
            next.add(line.productId);
          }
        }
        setChecked(next);
      })
      .catch(() => setError(labels.errorGeneric))
      .finally(() => setLoading(false));
  }, [open, orderId, preview, labels.errorGeneric]);

  function close() {
    setOpen(false);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  function toggle(productId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function onConfirm() {
    if (!preview) return;
    setError(null);
    const skipProductIds: string[] = [];
    for (const line of preview.lines) {
      if (line.productId && !checked.has(line.productId)) {
        skipProductIds.push(line.productId);
      }
    }
    start(async () => {
      const res = await reorderAction({ orderId, skipProductIds });
      if (!res.ok) {
        setError(labels.errorGeneric);
        return;
      }
      if (res.data.added.length === 0) {
        setResult(labels.nothingToAdd);
        return;
      }
      setResult(
        labels.successLineTemplate.replace(
          '{count}',
          String(res.data.added.length),
        ),
      );
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? 'rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted'
            : 'rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90'
        }
      >
        {labels.reorderCta}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 md:items-center"
          onClick={close}
        >
          <div
            className="w-full max-w-2xl rounded-md bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {loading ? (
              <p className="text-center text-sm text-muted-foreground">
                {labels.loading}
              </p>
            ) : preview ? (
              <>
                <header className="mb-4">
                  <h2 className="text-lg font-semibold">
                    {labels.modalTitleTemplate.replace(
                      '{orderNumber}',
                      preview.orderNumber,
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {labels.body}
                  </p>
                </header>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase">
                      <tr>
                        <th className="w-12 px-3 py-2 text-start">
                          {labels.includeColumn}
                        </th>
                        <th className="px-3 py-2 text-start">
                          {labels.productColumn}
                        </th>
                        <th className="px-3 py-2 text-start">
                          {labels.statusColumn}
                        </th>
                        <th className="w-16 px-3 py-2 text-end">
                          {labels.qtyColumn}
                        </th>
                        <th className="w-20 px-3 py-2 text-end">
                          {labels.priceColumn}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.lines.map((line) => {
                        const canPick =
                          line.productId !== null &&
                          line.status !== 'archived' &&
                          line.status !== 'out_of_stock';
                        const isChecked =
                          line.productId !== null &&
                          checked.has(line.productId);
                        return (
                          <tr key={line.orderItemId} className="border-t">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!canPick}
                                onChange={() =>
                                  line.productId && toggle(line.productId)
                                }
                                aria-label={
                                  locale === 'ar' ? line.nameAr : line.nameEn
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <span className="block text-xs text-muted-foreground">
                                {line.sku}
                              </span>
                              <span className="block">
                                {locale === 'ar' ? line.nameAr : line.nameEn}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={
                                  line.status === 'available'
                                    ? 'text-green-700'
                                    : line.status === 'partial'
                                      ? 'text-amber-700'
                                      : 'text-destructive'
                                }
                              >
                                {labels.statusLabels[line.status]}
                                {line.status === 'partial'
                                  ? ` (${line.availableQty})`
                                  : ''}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-end tabular-nums">
                              {line.originalQty}
                            </td>
                            <td className="px-3 py-2 text-end tabular-nums">
                              {line.finalPriceEgp ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {error ? (
                  <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
                {result ? (
                  <div className="mt-3 rounded-md border border-green-500/40 bg-green-50 px-3 py-2 text-sm text-green-900">
                    {result}
                  </div>
                ) : null}

                <footer className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
                  >
                    {labels.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={pending || checked.size === 0}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {pending
                      ? labels.adding
                      : `${labels.addCta} (${checked.size})`}
                  </button>
                </footer>
              </>
            ) : error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
