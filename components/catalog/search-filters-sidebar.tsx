'use client';

import { useMemo, useState } from 'react';
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
    apply: 'تطبيق',
    clear: 'مسح الفلاتر',
    brand: 'الماركة',
    category: 'التصنيف',
    authenticity: 'الأصالة',
    genuine: 'أصلي',
    compatible: 'متوافق',
    price: 'السعر (ج.م)',
    min: 'من',
    max: 'إلى',
    inStock: 'المتاح فقط',
    any: 'الكل',
  },
  en: {
    filters: 'Filters',
    apply: 'Apply',
    clear: 'Clear filters',
    brand: 'Brand',
    category: 'Category',
    authenticity: 'Authenticity',
    genuine: 'Genuine',
    compatible: 'Compatible',
    price: 'Price (EGP)',
    min: 'Min',
    max: 'Max',
    inStock: 'In stock only',
    any: 'Any',
  },
};

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
  const [priceMin, setPriceMin] = useState<string>(
    selected.priceMin != null ? String(selected.priceMin) : '',
  );
  const [priceMax, setPriceMax] = useState<string>(
    selected.priceMax != null ? String(selected.priceMax) : '',
  );
  const [inStockOnly, setInStockOnly] = useState<boolean>(selected.inStockOnly);

  const q = baseQuery.q ?? '';

  const hasAnyFilter = useMemo(
    () =>
      brandIds.length > 0 ||
      categoryIds.length > 0 ||
      !!authenticity ||
      priceMin.trim() !== '' ||
      priceMax.trim() !== '' ||
      inStockOnly,
    [brandIds, categoryIds, authenticity, priceMin, priceMax, inStockOnly],
  );

  function toggleInArray(arr: string[], id: string): string[] {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  }

  function apply() {
    const query: Record<string, string> = {};
    if (q) query.q = q;
    if (sort) query.sort = sort;
    if (brandIds.length) query.brand = brandIds.join(',');
    if (categoryIds.length) query.category = categoryIds.join(',');
    if (authenticity) query.auth = authenticity;
    if (priceMin.trim()) query.priceMin = priceMin.trim();
    if (priceMax.trim()) query.priceMax = priceMax.trim();
    if (inStockOnly) query.inStock = '1';
    router.push({ pathname: '/search', query });
  }

  function clear() {
    setBrandIds([]);
    setCategoryIds([]);
    setAuthenticity(undefined);
    setPriceMin('');
    setPriceMax('');
    setInStockOnly(false);
    const query: Record<string, string> = {};
    if (q) query.q = q;
    if (sort) query.sort = sort;
    router.push({ pathname: '/search', query });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="space-y-6 rounded-md border bg-background p-4 text-sm"
      aria-label={labels.filters}
    >
      <h2 className="text-base font-semibold">{labels.filters}</h2>

      <fieldset>
        <legend className="mb-2 font-medium">{labels.brand}</legend>
        <ul className="max-h-40 space-y-1 overflow-auto">
          {brands.map((b) => (
            <li key={b.id}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={brandIds.includes(b.id)}
                  onChange={() => setBrandIds((p) => toggleInArray(p, b.id))}
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
                  onChange={() => setCategoryIds((p) => toggleInArray(p, c.id))}
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
                            setCategoryIds((p) => toggleInArray(p, child.id))
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
                onChange={() => setAuthenticity(opt.v)}
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

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
        >
          {labels.apply}
        </button>
        {hasAnyFilter ? (
          <button
            type="button"
            onClick={clear}
            className="rounded-md border bg-background px-3 py-1.5 hover:bg-muted"
          >
            {labels.clear}
          </button>
        ) : null}
      </div>
    </form>
  );
}
