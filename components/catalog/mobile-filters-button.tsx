'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/lib/i18n/routing';

type BrandOpt = { id: string; nameAr: string; nameEn: string };
type CategoryOpt = {
  id: string;
  nameAr: string;
  nameEn: string;
  children: BrandOpt[];
};

type Selected = {
  brandIds: string[];
  categoryIds: string[];
  authenticity: 'GENUINE' | 'COMPATIBLE' | undefined;
  /// Sprint 14 — undefined = "Any" (default).
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
  activeFilterCount: number;
};

const LABELS = {
  ar: {
    open: 'الفلاتر',
    close: 'إغلاق',
    apply: 'تطبيق',
    clear: 'مسح',
    brand: 'الماركة',
    category: 'التصنيف',
    authenticity: 'الأصالة',
    genuine: 'أصلي',
    compatible: 'متوافق',
    condition: 'حالة المنتج',
    conditionNew: 'جديد',
    conditionUsed: 'مستعمل',
    any: 'الكل',
    price: 'السعر (ج.م)',
    min: 'من',
    max: 'إلى',
    inStock: 'المتاح فقط',
  },
  en: {
    open: 'Filters',
    close: 'Close',
    apply: 'Apply',
    clear: 'Clear',
    brand: 'Brand',
    category: 'Category',
    authenticity: 'Authenticity',
    genuine: 'Genuine',
    compatible: 'Compatible',
    condition: 'Condition',
    conditionNew: 'New',
    conditionUsed: 'Used',
    any: 'Any',
    price: 'Price (EGP)',
    min: 'Min',
    max: 'Max',
    inStock: 'In stock only',
  },
};

export function MobileFiltersButton(props: Props) {
  const {
    locale,
    baseQuery,
    sort,
    brands,
    categories,
    selected,
    activeFilterCount,
  } = props;
  const labels = LABELS[locale];
  const router = useRouter();
  const [open, setOpen] = useState(false);

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

  const q = baseQuery.q ?? '';
  const printer = baseQuery.printer ?? '';

  // Lock body scroll while modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function toggleInArray(arr: string[], id: string): string[] {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  }

  function apply() {
    const query: Record<string, string> = {};
    if (q) query.q = q;
    if (printer) query.printer = printer;
    if (sort) query.sort = sort;
    if (brandIds.length) query.brand = brandIds.join(',');
    if (categoryIds.length) query.category = categoryIds.join(',');
    if (authenticity) query.auth = authenticity;
    if (condition) query.condition = condition;
    if (priceMin.trim()) query.priceMin = priceMin.trim();
    if (priceMax.trim()) query.priceMax = priceMax.trim();
    if (inStockOnly) query.inStock = '1';
    setOpen(false);
    router.push({ pathname: '/search', query });
  }

  function clear() {
    setBrandIds([]);
    setCategoryIds([]);
    setAuthenticity(undefined);
    setCondition(undefined);
    setPriceMin('');
    setPriceMax('');
    setInStockOnly(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium md:hidden"
      >
        {labels.open}
        {activeFilterCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-background md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={labels.open}
        >
          <div className="flex items-center justify-between border-b p-3">
            <h2 className="text-base font-semibold">{labels.open}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
            >
              {labels.close}
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-auto p-4 text-sm">
            <fieldset>
              <legend className="mb-2 font-medium">{labels.brand}</legend>
              <ul className="space-y-1">
                {brands.map((b) => (
                  <li key={b.id}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={brandIds.includes(b.id)}
                        onChange={() =>
                          setBrandIds((p) => toggleInArray(p, b.id))
                        }
                      />
                      <span>{locale === 'ar' ? b.nameAr : b.nameEn}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-medium">{labels.category}</legend>
              <ul className="space-y-1">
                {categories.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={categoryIds.includes(c.id)}
                        onChange={() =>
                          setCategoryIds((p) => toggleInArray(p, c.id))
                        }
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
                                onChange={() =>
                                  setCategoryIds((p) =>
                                    toggleInArray(p, child.id),
                                  )
                                }
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
              <legend className="mb-2 font-medium">
                {labels.authenticity}
              </legend>
              <div className="flex flex-col gap-1">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="auth-mobile"
                    checked={!authenticity}
                    onChange={() => setAuthenticity(undefined)}
                  />
                  <span>{labels.any}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="auth-mobile"
                    checked={authenticity === 'GENUINE'}
                    onChange={() => setAuthenticity('GENUINE')}
                  />
                  <span>{labels.genuine}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="auth-mobile"
                    checked={authenticity === 'COMPATIBLE'}
                    onChange={() => setAuthenticity('COMPATIBLE')}
                  />
                  <span>{labels.compatible}</span>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-medium">{labels.condition}</legend>
              <div className="flex flex-col gap-1">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="condition-mobile"
                    checked={!condition}
                    onChange={() => setCondition(undefined)}
                  />
                  <span>{labels.any}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="condition-mobile"
                    checked={condition === 'NEW'}
                    onChange={() => setCondition('NEW')}
                  />
                  <span>{labels.conditionNew}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="condition-mobile"
                    checked={condition === 'USED'}
                    onChange={() => setCondition('USED')}
                  />
                  <span>{labels.conditionUsed}</span>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-medium">{labels.price}</legend>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={labels.min}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full rounded border bg-background px-2 py-1"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={labels.max}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full rounded border bg-background px-2 py-1"
                />
              </div>
            </fieldset>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              <span>{labels.inStock}</span>
            </label>
          </div>

          <div className="flex gap-2 border-t bg-background p-3">
            <button
              type="button"
              onClick={clear}
              className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              {labels.clear}
            </button>
            <button
              type="button"
              onClick={apply}
              className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {labels.apply}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
