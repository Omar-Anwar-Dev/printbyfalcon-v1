'use client';

/**
 * Sprint 8 S8-D4 — B2B bulk-order table.
 *
 * Dynamic table of rows with SKU autocomplete, qty input, live price, line
 * total, and stock validation. Each row resolves against `/api/search/suggest`
 * for typeahead and `/api/b2b/bulk-order/lookup` for the authoritative B2B
 * price + availability once a product is locked in.
 *
 * Keyboard:
 *  - Tab: next field (browser default; inputs ordered naturally)
 *  - Enter on qty: append a new empty row (S8-D6-T3)
 *  - Row cap: 50 (capacity sanity per plan)
 */
import { useState, useRef, useCallback, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addBulkToCartAction } from '@/app/actions/cart';

type Suggestion = {
  id: string;
  slug: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  basePriceEgp: string;
};

type RowState = {
  key: string;
  query: string;
  productId: string | null;
  sku: string | null;
  nameAr: string | null;
  nameEn: string | null;
  finalPriceEgp: number | null;
  availableQty: number | null;
  qty: number;
  /** Pending UI states for autocomplete + lookup. */
  suggestionsOpen: boolean;
  suggestions: Suggestion[];
  loading: boolean;
  warning: string | null;
};

function emptyRow(): RowState {
  return {
    key: `row-${Math.random().toString(36).slice(2, 10)}`,
    query: '',
    productId: null,
    sku: null,
    nameAr: null,
    nameEn: null,
    finalPriceEgp: null,
    availableQty: null,
    qty: 1,
    suggestionsOpen: false,
    suggestions: [],
    loading: false,
    warning: null,
  };
}

const ROW_CAP = 50;

type Labels = {
  pageTitle: string;
  pageHelp: string;
  rowCap: string;
  columns: {
    sku: string;
    name: string;
    unit: string;
    qty: string;
    total: string;
    actions: string;
  };
  placeholderQuery: string;
  skuNotLocked: string;
  availableLabel: string;
  overRequestWarning: string;
  outOfStockWarning: string;
  addRow: string;
  duplicateLast: string;
  clearAll: string;
  addAllToCart: string;
  addingToCart: string;
  grandTotal: string;
  atLeastOne: string;
  remove: string;
  skippedHeader: string;
  skippedReasons: Record<string, string>;
  /** Template with `{count}` placeholder — functions can't cross the server→client boundary. */
  successToastTemplate: string;
  tooManyRows: string;
};

export function BulkOrderTable({
  locale,
  labels,
}: {
  locale: 'ar' | 'en';
  labels: Labels;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<RowState[]>([emptyRow(), emptyRow()]);
  const [pending, start] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<
    Array<{ sku: string; reason: string }>
  >([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const abortRefs = useRef<Map<string, AbortController>>(new Map());

  const updateRow = useCallback((key: string, patch: Partial<RowState>) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }, []);

  // Debounced suggest fetch per row.
  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    for (const r of rows) {
      if (r.productId) continue; // already locked in
      const q = r.query.trim();
      if (q.length < 2) {
        if (r.suggestions.length > 0) updateRow(r.key, { suggestions: [] });
        continue;
      }
      const t = setTimeout(() => {
        const prevAbort = abortRefs.current.get(r.key);
        prevAbort?.abort();
        const ac = new AbortController();
        abortRefs.current.set(r.key, ac);
        fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { suggestions: Suggestion[] } | null) => {
            if (data)
              updateRow(r.key, {
                suggestions: data.suggestions,
                suggestionsOpen: true,
              });
          })
          .catch(() => {});
      }, 180);
      timers.push(t);
    }
    return () => {
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map((r) => `${r.key}:${r.query}:${r.productId ?? ''}`).join('|')]);

  async function lockInProduct(rowKey: string, suggestion: Suggestion) {
    updateRow(rowKey, {
      query: suggestion.sku,
      productId: suggestion.id,
      sku: suggestion.sku,
      nameAr: suggestion.nameAr,
      nameEn: suggestion.nameEn,
      suggestionsOpen: false,
      suggestions: [],
      loading: true,
      warning: null,
    });

    try {
      const res = await fetch(
        `/api/b2b/bulk-order/lookup?productId=${encodeURIComponent(suggestion.id)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error('lookup_failed');
      const data = await res.json();
      updateRow(rowKey, {
        finalPriceEgp: Number(data.finalPriceEgp),
        availableQty: data.availableQty,
        loading: false,
      });
    } catch {
      updateRow(rowKey, {
        loading: false,
        finalPriceEgp: Number(suggestion.basePriceEgp),
        availableQty: null,
      });
    }
  }

  function clearRow(rowKey: string) {
    updateRow(rowKey, {
      query: '',
      productId: null,
      sku: null,
      nameAr: null,
      nameEn: null,
      finalPriceEgp: null,
      availableQty: null,
      suggestionsOpen: false,
      suggestions: [],
      warning: null,
    });
  }

  function addRow() {
    if (rows.length >= ROW_CAP) {
      setGlobalError(labels.tooManyRows);
      return;
    }
    setRows((prev) => [...prev, emptyRow()]);
  }

  function duplicateLast() {
    if (rows.length >= ROW_CAP) {
      setGlobalError(labels.tooManyRows);
      return;
    }
    const last = rows[rows.length - 1];
    if (!last?.productId) {
      addRow();
      return;
    }
    setRows((prev) => [
      ...prev,
      { ...last, key: `row-${Math.random().toString(36).slice(2, 10)}` },
    ]);
  }

  function removeRow(rowKey: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== rowKey);
      return next.length === 0 ? [emptyRow()] : next;
    });
  }

  function clearAll() {
    setRows([emptyRow(), emptyRow()]);
    setGlobalError(null);
    setSuccessCount(null);
    setSkipped([]);
  }

  const grandTotal = rows.reduce((acc, r) => {
    if (!r.productId || !r.finalPriceEgp) return acc;
    return acc + r.finalPriceEgp * r.qty;
  }, 0);

  const readyRows = rows.filter((r) => r.productId && r.qty > 0);

  function onSubmit() {
    setGlobalError(null);
    setSkipped([]);
    setSuccessCount(null);
    if (readyRows.length === 0) {
      setGlobalError(labels.atLeastOne);
      return;
    }
    const payload = readyRows.map((r) => ({
      productId: r.productId!,
      qty: r.qty,
    }));
    start(async () => {
      const res = await addBulkToCartAction({ rows: payload });
      if (!res.ok) {
        setGlobalError(res.errorKey);
        return;
      }
      setSuccessCount(res.data.added.length);
      // Map skipped productIds back to SKU for display.
      const idToSku = new Map(rows.map((r) => [r.productId, r.sku] as const));
      setSkipped(
        res.data.skipped.map((s) => ({
          sku: idToSku.get(s.productId) ?? s.productId,
          reason: s.reason,
        })),
      );
      if (res.data.added.length > 0) {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">{labels.pageTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{labels.pageHelp}</p>
        <p className="mt-1 text-xs text-muted-foreground">{labels.rowCap}</p>
      </header>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addRow}
            className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            + {labels.addRow}
          </button>
          <button
            type="button"
            onClick={duplicateLast}
            className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            {labels.duplicateLast}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            {labels.clearAll}
          </button>
        </div>
        <div className="text-sm text-muted-foreground">
          {labels.grandTotal}:{' '}
          <span className="font-semibold text-foreground">
            {grandTotal.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            {locale === 'ar' ? 'ج.م' : 'EGP'}
          </span>
        </div>
      </div>

      {/* `overflow-x-auto` lets narrow viewports scroll the table sideways
          instead of clipping columns; the autocomplete dropdown inside
          each row uses `position: absolute` so it can extend past the
          wrapper's bottom — vertical clipping on the last row's dropdown
          is the accepted trade-off. */}
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-start">{labels.columns.sku}</th>
              <th className="px-3 py-2 text-start">{labels.columns.name}</th>
              <th className="w-24 px-3 py-2 text-end">{labels.columns.unit}</th>
              <th className="w-20 px-3 py-2 text-end">{labels.columns.qty}</th>
              <th className="w-28 px-3 py-2 text-end">
                {labels.columns.total}
              </th>
              <th className="w-12 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const overRequest =
                r.availableQty !== null && r.qty > r.availableQty;
              const outOfStock =
                r.productId !== null &&
                r.availableQty !== null &&
                r.availableQty <= 0;
              const warning = outOfStock
                ? labels.outOfStockWarning
                : overRequest
                  ? labels.overRequestWarning.replace(
                      '{available}',
                      String(r.availableQty ?? 0),
                    )
                  : null;
              const lineTotal =
                r.productId && r.finalPriceEgp ? r.finalPriceEgp * r.qty : 0;

              return (
                <tr key={r.key} className="border-t align-top">
                  <td className="relative px-3 py-2">
                    <input
                      value={r.query}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (r.productId) {
                          // User is editing a locked-in row — clear and
                          // restart the lookup.
                          clearRow(r.key);
                        }
                        updateRow(r.key, {
                          query: v,
                          suggestionsOpen: v.length >= 2,
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && r.productId) {
                          e.preventDefault();
                          addRow();
                        }
                      }}
                      placeholder={labels.placeholderQuery}
                      className="w-full rounded-md border bg-background px-2 py-1.5"
                    />
                    {r.suggestionsOpen && r.suggestions.length > 0 ? (
                      <ul className="absolute z-20 mt-1 w-80 max-w-[90vw] rounded-md border bg-popover shadow-lg">
                        {r.suggestions.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => lockInProduct(r.key, s)}
                              className="block w-full px-3 py-2 text-start text-sm hover:bg-muted"
                            >
                              <span className="block font-mono text-xs text-muted-foreground">
                                {s.sku}
                              </span>
                              <span className="block truncate">
                                {locale === 'ar' ? s.nameAr : s.nameEn}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {r.productId ? (
                      <>
                        <span className="block">
                          {locale === 'ar' ? r.nameAr : r.nameEn}
                        </span>
                        {r.loading ? (
                          <span className="text-xs text-muted-foreground">
                            …
                          </span>
                        ) : r.availableQty !== null ? (
                          <span className="text-xs text-muted-foreground">
                            {labels.availableLabel}: {r.availableQty}
                          </span>
                        ) : null}
                        {warning ? (
                          <span className="mt-0.5 block text-xs font-medium text-warning">
                            {warning}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="italic text-muted-foreground">
                        {labels.skuNotLocked}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {r.productId && r.finalPriceEgp !== null
                      ? r.finalPriceEgp.toLocaleString(
                          locale === 'ar' ? 'ar-EG' : 'en-US',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={r.qty}
                      onChange={(e) => {
                        const next = Math.max(
                          1,
                          Math.min(99, Number(e.target.value) || 1),
                        );
                        updateRow(r.key, { qty: next });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addRow();
                        }
                      }}
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-end tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {lineTotal > 0
                      ? lineTotal.toLocaleString(
                          locale === 'ar' ? 'ar-EG' : 'en-US',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <button
                      type="button"
                      onClick={() => removeRow(r.key)}
                      aria-label={labels.remove}
                      className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {globalError ? (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {globalError}
        </div>
      ) : null}

      {skipped.length > 0 ? (
        <div className="mt-3 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
          <p className="font-medium">{labels.skippedHeader}</p>
          <ul className="mt-1 space-y-0.5">
            {skipped.map((s, i) => (
              <li key={i} className="text-xs">
                <span className="font-mono">{s.sku}</span>:{' '}
                {labels.skippedReasons[s.reason] ?? s.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {successCount !== null && successCount > 0 ? (
        <div className="mt-3 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          {labels.successToastTemplate.replace('{count}', String(successCount))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending || readyRows.length === 0}
          className="rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending
            ? labels.addingToCart
            : `${labels.addAllToCart} (${readyRows.length})`}
        </button>
      </div>
    </div>
  );
}
