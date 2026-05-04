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
import {
  ProductJsonPaste,
  type PasteLabels,
  type ProductPasteApplied,
} from '@/components/admin/product-json-paste';
import type { ResolveItem } from '@/lib/catalog/admin-options';
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
  /// Sprint 14
  condition: string;
  conditionNew: string;
  conditionUsed: string;
  warranty: string;
  warrantyHelp: string;
  conditionNote: string;
  conditionNoteHelp: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  specs: string;
  specsHelp: string;
  /// Sprint 14
  specsAr: string;
  specsEn: string;
  specsLegacy: string;
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
  brandsResolve,
  categoriesResolve,
  labels,
  pasteLabels,
  cancelHref,
}: {
  id?: string;
  initial?: ProductInput;
  brands: BrandOption[];
  categories: CategoryOption[];
  brandsResolve: ResolveItem[];
  categoriesResolve: ResolveItem[];
  labels: Labels;
  pasteLabels: PasteLabels;
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
      specsAr: {},
      specsEn: {},
      basePriceEgp: 0,
      vatExempt: false,
      returnable: true,
      authenticity: 'GENUINE',
      condition: 'NEW',
      warranty: '',
      conditionNote: '',
      status: 'ACTIVE',
    },
  );
  const [specRows, setSpecRows] = useState<SpecRow[]>(() =>
    specsObjectToRows(initial?.specs ?? {}),
  );
  const [specArRows, setSpecArRows] = useState<SpecRow[]>(() =>
    specsObjectToRows(initial?.specsAr ?? {}),
  );
  const [specEnRows, setSpecEnRows] = useState<SpecRow[]>(() =>
    specsObjectToRows(initial?.specsEn ?? {}),
  );
  /// Sprint 14 — Specs editor active tab. Default = AR (matches owner's primary
  /// market) but the form is symmetric — switch tabs to edit the other locale.
  const [specsTab, setSpecsTab] = useState<'ar' | 'en' | 'legacy'>('ar');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => brands.length > 0 && categories.some((c) => !c.disabled),
    [brands.length, categories],
  );

  /**
   * Sprint 16 — apply a JSON-paste patch onto form state. Spread guards keep
   * fields the user already filled if the paste blob omits them, so partial
   * pastes (e.g. just specs) merge cleanly into the existing form state.
   */
  const applyPaste = (p: ProductPasteApplied) => {
    setState((s) => ({
      ...s,
      ...(p.sku !== undefined ? { sku: p.sku } : {}),
      ...(p.brandId ? { brandId: p.brandId } : {}),
      ...(p.categoryId ? { categoryId: p.categoryId } : {}),
      ...(p.slug !== undefined ? { slug: p.slug } : {}),
      ...(p.nameAr !== undefined ? { nameAr: p.nameAr } : {}),
      ...(p.nameEn !== undefined ? { nameEn: p.nameEn } : {}),
      ...(p.descriptionAr !== undefined
        ? { descriptionAr: p.descriptionAr }
        : {}),
      ...(p.descriptionEn !== undefined
        ? { descriptionEn: p.descriptionEn }
        : {}),
      ...(p.basePriceEgp !== undefined ? { basePriceEgp: p.basePriceEgp } : {}),
      ...(p.vatExempt !== undefined ? { vatExempt: p.vatExempt } : {}),
      ...(p.returnable !== undefined ? { returnable: p.returnable } : {}),
      ...(p.authenticity ? { authenticity: p.authenticity } : {}),
      ...(p.condition ? { condition: p.condition } : {}),
      ...(p.warranty !== undefined ? { warranty: p.warranty } : {}),
      ...(p.conditionNote !== undefined
        ? { conditionNote: p.conditionNote }
        : {}),
      ...(p.status ? { status: p.status } : {}),
    }));
    if (p.specs) setSpecRows(specsObjectToRows(p.specs));
    if (p.specsAr) setSpecArRows(specsObjectToRows(p.specsAr));
    if (p.specsEn) setSpecEnRows(specsObjectToRows(p.specsEn));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const payload: ProductInput = {
        ...state,
        specs: rowsToSpecsObject(specRows),
        specsAr: rowsToSpecsObject(specArRows),
        specsEn: rowsToSpecsObject(specEnRows),
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
    <form method="post" onSubmit={submit} className="max-w-4xl space-y-6">
      {/* Sprint 16 — quick-fill panel sits above the form. Collapsed by default
          so users who don't know about JSON paste see the regular form unchanged. */}
      <ProductJsonPaste
        brandsResolve={brandsResolve}
        categoriesResolve={categoriesResolve}
        onApply={applyPaste}
        labels={pasteLabels}
      />
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
        <div className="space-y-2">
          <Label htmlFor="condition">{labels.condition}</Label>
          <Select
            id="condition"
            value={state.condition}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                condition: e.target.value as ProductInput['condition'],
              }))
            }
          >
            <option value="NEW">{labels.conditionNew}</option>
            <option value="USED">{labels.conditionUsed}</option>
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

      {/* Sprint 14 — warranty (always visible) + conditionNote (only for USED). */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="warranty">{labels.warranty}</Label>
          <Input
            id="warranty"
            value={state.warranty ?? ''}
            onChange={(e) =>
              setState((s) => ({ ...s, warranty: e.target.value }))
            }
            placeholder={labels.warrantyHelp}
            maxLength={160}
          />
          <p className="text-xs text-muted-foreground">{labels.warrantyHelp}</p>
        </div>
        {state.condition === 'USED' ? (
          <div className="space-y-2">
            <Label htmlFor="conditionNote">{labels.conditionNote}</Label>
            <Input
              id="conditionNote"
              value={state.conditionNote ?? ''}
              onChange={(e) =>
                setState((s) => ({ ...s, conditionNote: e.target.value }))
              }
              placeholder={labels.conditionNoteHelp}
              maxLength={280}
            />
            <p className="text-xs text-muted-foreground">
              {labels.conditionNoteHelp}
            </p>
          </div>
        ) : null}
      </div>

      {/* Sprint 14 — bilingual specs editor with tabs. Legacy `specs` kept
          accessible under a third tab for backward compatibility (existing
          rows that haven't been migrated). The storefront prefers
          specsAr/specsEn and falls back to legacy when locale-specific is empty. */}
      <fieldset className="rounded-md border p-4">
        <legend className="px-2 text-sm font-medium">{labels.specs}</legend>
        <p className="mb-3 text-xs text-muted-foreground">{labels.specsHelp}</p>
        <div className="mb-4 inline-flex rounded-md border bg-paper p-1 text-sm">
          {(
            [
              { v: 'ar' as const, label: labels.specsAr },
              { v: 'en' as const, label: labels.specsEn },
              { v: 'legacy' as const, label: labels.specsLegacy },
            ] as const
          ).map((tab) => (
            <button
              key={tab.v}
              type="button"
              onClick={() => setSpecsTab(tab.v)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                specsTab === tab.v
                  ? 'bg-foreground text-canvas'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <SpecsEditor
          rows={
            specsTab === 'ar'
              ? specArRows
              : specsTab === 'en'
                ? specEnRows
                : specRows
          }
          setRows={
            specsTab === 'ar'
              ? setSpecArRows
              : specsTab === 'en'
                ? setSpecEnRows
                : setSpecRows
          }
          addLabel={labels.addSpec}
        />
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

/**
 * Sprint 14 — extracted key/value editor so the bilingual spec tabs share
 * one renderer. Each tab swaps in a different `rows` / `setRows` pair.
 */
function SpecsEditor({
  rows,
  setRows,
  addLabel,
}: {
  rows: SpecRow[];
  setRows: React.Dispatch<React.SetStateAction<SpecRow[]>>;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div key={idx} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input
            placeholder="key"
            value={row.key}
            onChange={(e) =>
              setRows((rs) =>
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
              setRows((rs) =>
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
            onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))}
          >
            ×
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRows((rs) => [...rs, { key: '', value: '' }])}
      >
        + {addLabel}
      </Button>
    </div>
  );
}
