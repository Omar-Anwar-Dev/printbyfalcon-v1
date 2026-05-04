'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/lib/i18n/routing';

type BrandOpt = { id: string; nameAr: string; nameEn: string };
type CategoryOpt = {
  id: string;
  nameAr: string;
  nameEn: string;
  children: BrandOpt[]; // same shape (id/nameAr/nameEn) — reused
};

type Selected = {
  brandIds: string[];
  categoryIds: string[];
  authenticity: 'GENUINE' | 'COMPATIBLE' | undefined;
  /// Sprint 14 — undefined = "Any" (default), NEW or USED otherwise.
  condition: 'NEW' | 'USED' | undefined;
  priceMin: number | undefined;
  priceMax: number | undefined;
  inStockOnly: boolean;
};

type Props = {
  locale: 'ar' | 'en';
  baseQuery: Record<string, string>;
  sort: string;
  brands: BrandOpt[];
  categories: CategoryOpt[];
  selected: Selected;
};

const LABELS = {
  ar: {
    filters: 'الفلاتر',
    clear: 'مسح الفلاتر',
    brand: 'الماركة',
    category: 'التصنيف',
    authenticity: 'الأصالة',
    genuine: 'أصلي',
    compatible: 'متوافق',
    condition: 'حالة المنتج',
    conditionNew: 'جديد',
    conditionUsed: 'مستعمل',
    price: 'السعر (ج.م)',
    min: 'من',
    max: 'إلى',
    inStock: 'المتاح فقط',
    any: 'الكل',
  },
  en: {
    filters: 'Filters',
    clear: 'Clear filters',
    brand: 'Brand',
    category: 'Category',
    authenticity: 'Authenticity',
    genuine: 'Genuine',
    compatible: 'Compatible',
    condition: 'Condition',
    conditionNew: 'New',
    conditionUsed: 'Used',
    price: 'Price (EGP)',
    min: 'Min',
    max: 'Max',
    inStock: 'In stock only',
    any: 'Any',
  },
};

/**
 * Desktop filters sidebar. Every control applies instantly — no "Apply" button:
 *  - Checkboxes / radios / in-stock toggle: push the URL on `onChange`.
 *  - Price min / max: push on `onBlur` OR Enter key (not per-keystroke).
 * The "Clear" button resets everything and pushes at the same time.
 *
 * Local state mirrors the URL-resolved `selected` prop and re-syncs whenever
 * the parent re-renders with a different `selected` (e.g., after a sort-tab
 * click or the user hits Back in the browser).
 */
export function SearchFiltersSidebar(props: Props) {
  const { locale, baseQuery, sort, brands, categories, selected } = props;
  const labels = LABELS[locale];
  const router = useRouter();

  const [brandIds, setBrandIds] = useState<string[]>(selected.brandIds);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    selected.categoryIds,
  );
  const [authenticity, setAuthenticity] = useState<Selected['authenticity']>(
    selected.authenticity,
  );
  const [condition, setCondition] = useState<Selected['condition']>(
    selected.condition,
  );
  const [priceMin, setPriceMin] = useState<string>(
    selected.priceMin != null ? String(selected.priceMin) : '',
  );
  const [priceMax, setPriceMax] = useState<string>(
    selected.priceMax != null ? String(selected.priceMax) : '',
  );
  const [inStockOnly, setInStockOnly] = useState<boolean>(selected.inStockOnly);

  // Re-sync from URL-derived `selected` on parent re-render (sort click, back
  // button). We compare by JSON to avoid an infinite re-sync when our own
  // router.push round-trips through the parent.
  const selectedKey = JSON.stringify({
    b: selected.brandIds,
    c: selected.categoryIds,
    a: selected.authenticity ?? '',
    cond: selected.condition ?? '',
    pMin: selected.priceMin ?? '',
    pMax: selected.priceMax ?? '',
    s: selected.inStockOnly,
  });
  const lastAppliedKey = useRef(selectedKey);
  useEffect(() => {
    if (selectedKey === lastAppliedKey.current) return;
    lastAppliedKey.current = selectedKey;
    setBrandIds(selected.brandIds);
    setCategoryIds(selected.categoryIds);
    setAuthenticity(selected.authenticity);
    setCondition(selected.condition);
    setPriceMin(selected.priceMin != null ? String(selected.priceMin) : '');
    setPriceMax(selected.priceMax != null ? String(selected.priceMax) : '');
    setInStockOnly(selected.inStockOnly);
  }, [selectedKey, selected]);

  const q = baseQuery.q ?? '';
  const printer = baseQuery.printer ?? '';

  const hasAnyFilter = useMemo(
    () =>
      brandIds.length > 0 ||
      categoryIds.length > 0 ||
      !!authenticity ||
      !!condition ||
      priceMin.trim() !== '' ||
      priceMax.trim() !== '' ||
      inStockOnly,
    [
      brandIds,
      categoryIds,
      authenticity,
      condition,
      priceMin,
      priceMax,
      inStockOnly,
    ],
  );

  function toggleInArray(arr: string[], id: string): string[] {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  }

  /**
   * Build a query object from the current state, with explicit overrides for
   * freshly-changed values (React batches state updates, so reading from
   * state right after `setState` returns stale data).
   */
  function buildQuery(
    overrides: Partial<Selected> = {},
  ): Record<string, string> {
    const nextBrandIds = overrides.brandIds ?? brandIds;
    const nextCategoryIds = overrides.categoryIds ?? categoryIds;
    const nextAuthenticity =
      'authenticity' in overrides ? overrides.authenticity : authenticity;
    const nextCondition =
      'condition' in overrides ? overrides.condition : condition;
    const nextPriceMin =
      'priceMin' in overrides
        ? overrides.priceMin != null
          ? String(overrides.priceMin)
          : ''
        : priceMin;
    const nextPriceMax =
      'priceMax' in overrides
        ? overrides.priceMax != null
          ? String(overrides.priceMax)
          : ''
        : priceMax;
    const nextInStockOnly =
      overrides.inStockOnly != null ? overrides.inStockOnly : inStockOnly;

    const query: Record<string, string> = {};
    if (q) query.q = q;
    if (printer) query.printer = printer;
    if (sort) query.sort = sort;
    if (nextBrandIds.length) query.brand = nextBrandIds.join(',');
    if (nextCategoryIds.length) query.category = nextCategoryIds.join(',');
    if (nextAuthenticity) query.auth = nextAuthenticity;
    if (nextCondition) query.condition = nextCondition;
    if (nextPriceMin.trim()) query.priceMin = nextPriceMin.trim();
    if (nextPriceMax.trim()) query.priceMax = nextPriceMax.trim();
    if (nextInStockOnly) query.inStock = '1';
    return query;
  }

  function applyInstant(overrides: Partial<Selected> = {}) {
    router.push({ pathname: '/search', query: buildQuery(overrides) });
  }

  function handleBrandToggle(id: string) {
    const next = toggleInArray(brandIds, id);
    setBrandIds(next);
    applyInstant({ brandIds: next });
  }

  function handleCategoryToggle(id: string) {
    const next = toggleInArray(categoryIds, id);
    setCategoryIds(next);
    applyInstant({ categoryIds: next });
  }

  function handleAuthChange(next: Selected['authenticity']) {
    setAuthenticity(next);
    applyInstant({ authenticity: next });
  }

  function handleConditionChange(next: Selected['condition']) {
    setCondition(next);
    applyInstant({ condition: next });
  }

  function handleInStockChange(next: boolean) {
    setInStockOnly(next);
    applyInstant({ inStockOnly: next });
  }

  function handlePriceCommit() {
    // Only push if the committed value differs from what's in the URL —
    // prevents stray re-navigations when the user tabs away without editing.
    const currentMin =
      selected.priceMin != null ? String(selected.priceMin) : '';
    const currentMax =
      selected.priceMax != null ? String(selected.priceMax) : '';
    if (priceMin === currentMin && priceMax === currentMax) return;
    applyInstant();
  }

  function clear() {
    setBrandIds([]);
    setCategoryIds([]);
    setAuthenticity(undefined);
    setCondition(undefined);
    setPriceMin('');
    setPriceMax('');
    setInStockOnly(false);
    const query: Record<string, string> = {};
    if (q) query.q = q;
    if (printer) query.printer = printer;
    if (sort) query.sort = sort;
    router.push({ pathname: '/search', query });
  }

  return (
    <section
      className="space-y-6 rounded-md border bg-background p-4 text-sm"
      aria-label={labels.filters}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{labels.filters}</h2>
        {hasAnyFilter ? (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {labels.clear}
          </button>
        ) : null}
      </div>

      <fieldset>
        <legend className="mb-2 font-medium">{labels.brand}</legend>
        <ul className="max-h-40 space-y-1 overflow-auto">
          {brands.map((b) => (
            <li key={b.id}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={brandIds.includes(b.id)}
                  onChange={() => handleBrandToggle(b.id)}
                />
                <span>{locale === 'ar' ? b.nameAr : b.nameEn}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-medium">{labels.category}</legend>
        <ul className="max-h-48 space-y-1 overflow-auto">
          {categories.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(c.id)}
                  onChange={() => handleCategoryToggle(c.id)}
                />
                <span className="font-medium">
                  {locale === 'ar' ? c.nameAr : c.nameEn}
                </span>
              </label>
              {c.children.length > 0 ? (
                <ul className="ms-5 mt-1 space-y-1">
                  {c.children.map((child) => (
                    <li key={child.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={categoryIds.includes(child.id)}
                          onChange={() => handleCategoryToggle(child.id)}
                        />
                        <span>
                          {locale === 'ar' ? child.nameAr : child.nameEn}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-medium">{labels.authenticity}</legend>
        <div className="flex flex-col gap-1">
          {(
            [
              { v: undefined, label: labels.any },
              { v: 'GENUINE' as const, label: labels.genuine },
              { v: 'COMPATIBLE' as const, label: labels.compatible },
            ] as const
          ).map((opt, i) => (
            <label key={i} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="authenticity"
                checked={authenticity === opt.v}
                onChange={() => handleAuthChange(opt.v)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-medium">{labels.condition}</legend>
        <div className="flex flex-col gap-1">
          {(
            [
              { v: undefined, label: labels.any },
              { v: 'NEW' as const, label: labels.conditionNew },
              { v: 'USED' as const, label: labels.conditionUsed },
            ] as const
          ).map((opt, i) => (
            <label key={i} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="condition"
                checked={condition === opt.v}
                onChange={() => handleConditionChange(opt.v)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-medium">{labels.price}</legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder={labels.min}
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            onBlur={handlePriceCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full rounded border bg-background px-2 py-1"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder={labels.max}
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            onBlur={handlePriceCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full rounded border bg-background px-2 py-1"
          />
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => handleInStockChange(e.target.checked)}
        />
        <span>{labels.inStock}</span>
      </label>
    </section>
  );
}
