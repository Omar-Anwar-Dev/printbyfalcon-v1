'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProductAction,
  updateProductAction,
} from '@/app/actions/admin-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ProductInput } from '@/lib/validation/catalog';

type BrandOption = { id: string; label: string };
type CategoryOption = { id: string; label: string; disabled?: boolean };

type Labels = {
  sku: string;
  brand: string;
  category: string;
  authenticity: string;
  genuine: string;
  compatible: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  specs: string;
  specsHelp: string;
  addSpec: string;
  basePrice: string;
  vatExempt: string;
  returnable: string;
  status: string;
  active: string;
  archived: string;
  save: string;
  cancel: string;
};

type SpecRow = { key: string; value: string };

function specsObjectToRows(specs: Record<string, string>): SpecRow[] {
  return Object.entries(specs).map(([key, value]) => ({ key, value }));
}
function rowsToSpecsObject(rows: SpecRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const k = r.key.trim();
    const v = r.value.trim();
    if (k && v) out[k] = v;
  }
  return out;
}

export function ProductForm({
  id,
  initial,
  brands,
  categories,
  labels,
  cancelHref,
}: {
  id?: string;
  initial?: ProductInput;
  brands: BrandOption[];
  categories: CategoryOption[];
  labels: Labels;
  cancelHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [state, setState] = useState<ProductInput>(
    initial ?? {
      sku: '',
      brandId: brands[0]?.id ?? '',
      categoryId:
        categories.find((c) => !c.disabled)?.id ?? categories[0]?.id ?? '',
      slug: undefined,
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      specs: {},
      basePriceEgp: 0,
      vatExempt: false,
      returnable: true,
      authenticity: 'GENUINE',
      status: 'ACTIVE',
    },
  );
  const [specRows, setSpecRows] = useState<SpecRow[]>(() =>
    specsObjectToRows(initial?.specs ?? {}),
  );
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => brands.length > 0 && categories.some((c) => !c.disabled),
    [brands.length, categories],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const payload: ProductInput = {
        ...state,
        specs: rowsToSpecsObject(specRows),
        slug: state.slug?.trim() ? state.slug.trim() : undefined,
      };
      const res = id
        ? await updateProductAction(id, payload)
        : await createProductAction(payload);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      if (!id && 'data' in res && res.data) {
        router.push(`${cancelHref}/${res.data.id}`);
      } else {
        router.push(cancelHref);
      }
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="sku">{labels.sku}</Label>
          <Input
            id="sku"
            value={state.sku}
            onChange={(e) => setState((s) => ({ ...s, sku: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">{labels.brand}</Label>
          <Select
            id="brand"
            value={state.brandId}
            onChange={(e) =>
              setState((s) => ({ ...s, brandId: e.target.value }))
            }
            required
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">{labels.category}</Label>
          <Select
            id="category"
            value={state.categoryId}
            onChange={(e) =>
              setState((s) => ({ ...s, categoryId: e.target.value }))
            }
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id} disabled={c.disabled}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nameAr">{labels.nameAr}</Label>
          <Input
            id="nameAr"
            value={state.nameAr}
            onChange={(e) =>
              setState((s) => ({ ...s, nameAr: e.target.value }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nameEn">{labels.nameEn}</Label>
          <Input
            id="nameEn"
            value={state.nameEn}
            onChange={(e) =>
              setState((s) => ({ ...s, nameEn: e.target.value }))
            }
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="descAr">{labels.descriptionAr}</Label>
          <Textarea
            id="descAr"
            rows={5}
            value={state.descriptionAr}
            onChange={(e) =>
              setState((s) => ({ ...s, descriptionAr: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="descEn">{labels.descriptionEn}</Label>
          <Textarea
            id="descEn"
            rows={5}
            value={state.descriptionEn}
            onChange={(e) =>
              setState((s) => ({ ...s, descriptionEn: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">{labels.basePrice}</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min={0}
            value={state.basePriceEgp}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                basePriceEgp: Number.parseFloat(e.target.value || '0'),
              }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="authenticity">{labels.authenticity}</Label>
          <Select
            id="authenticity"
            value={state.authenticity}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                authenticity: e.target.value as ProductInput['authenticity'],
              }))
            }
          >
            <option value="GENUINE">{labels.genuine}</option>
            <option value="COMPATIBLE">{labels.compatible}</option>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <input
            id="vat"
            type="checkbox"
            checked={state.vatExempt}
            onChange={(e) =>
              setState((s) => ({ ...s, vatExempt: e.target.checked }))
            }
            className="h-4 w-4"
          />
          <Label htmlFor="vat">{labels.vatExempt}</Label>
        </div>
        <div className="flex items-end gap-2">
          <input
            id="returnable"
            type="checkbox"
            checked={state.returnable}
            onChange={(e) =>
              setState((s) => ({ ...s, returnable: e.target.checked }))
            }
            className="h-4 w-4"
          />
          <Label htmlFor="returnable">{labels.returnable}</Label>
        </div>
      </div>

      <fieldset className="rounded-md border p-4">
        <legend className="px-2 text-sm font-medium">{labels.specs}</legend>
        <p className="mb-3 text-xs text-muted-foreground">{labels.specsHelp}</p>
        <div className="space-y-2">
          {specRows.map((row, idx) => (
            <div key={idx} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Input
                placeholder="key"
                value={row.key}
                onChange={(e) =>
                  setSpecRows((rs) =>
                    rs.map((r, i) =>
                      i === idx ? { ...r, key: e.target.value } : r,
                    ),
                  )
                }
              />
              <Input
                placeholder="value"
                value={row.value}
                onChange={(e) =>
                  setSpecRows((rs) =>
                    rs.map((r, i) =>
                      i === idx ? { ...r, value: e.target.value } : r,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSpecRows((rs) => rs.filter((_, i) => i !== idx))
                }
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSpecRows((rs) => [...rs, { key: '', value: '' }])}
          >
            + {labels.addSpec}
          </Button>
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="status">{labels.status}</Label>
        <Select
          id="status"
          value={state.status}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              status: e.target.value as ProductInput['status'],
            }))
          }
        >
          <option value="ACTIVE">{labels.active}</option>
          <option value="ARCHIVED">{labels.archived}</option>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !canSubmit}>
          {labels.save}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(cancelHref)}
        >
          {labels.cancel}
        </Button>
      </div>
    </form>
  );
}
