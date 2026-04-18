'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createPrinterModelAction,
  updatePrinterModelAction,
} from '@/app/actions/admin-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { PrinterModelInput } from '@/lib/validation/catalog';

type Labels = {
  brand: string;
  modelName: string;
  slug: string;
  status: string;
  active: string;
  archived: string;
  save: string;
  cancel: string;
};

export function PrinterModelForm({
  id,
  initial,
  brands,
  labels,
  cancelHref,
}: {
  id?: string;
  initial?: PrinterModelInput;
  brands: Array<{ id: string; label: string }>;
  labels: Labels;
  cancelHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<PrinterModelInput>(
    initial ?? {
      brandId: brands[0]?.id ?? '',
      modelName: '',
      slug: undefined,
      status: 'ACTIVE',
    },
  );
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const payload: PrinterModelInput = {
        ...state,
        slug: state.slug?.trim() ? state.slug.trim() : undefined,
      };
      const res = id
        ? await updatePrinterModelAction(id, payload)
        : await createPrinterModelAction(payload);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      router.push(cancelHref);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
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
          <Label htmlFor="modelName">{labels.modelName}</Label>
          <Input
            id="modelName"
            value={state.modelName}
            onChange={(e) =>
              setState((s) => ({ ...s, modelName: e.target.value }))
            }
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">{labels.slug}</Label>
        <Input
          id="slug"
          value={state.slug ?? ''}
          onChange={(e) =>
            setState((s) => ({ ...s, slug: e.target.value || undefined }))
          }
          placeholder="auto"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">{labels.status}</Label>
        <Select
          id="status"
          value={state.status}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              status: e.target.value as PrinterModelInput['status'],
            }))
          }
        >
          <option value="ACTIVE">{labels.active}</option>
          <option value="ARCHIVED">{labels.archived}</option>
        </Select>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || brands.length === 0}>
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
