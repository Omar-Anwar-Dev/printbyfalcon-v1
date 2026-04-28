'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCategoryAction,
  updateCategoryAction,
} from '@/app/actions/admin-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { CategoryInput } from '@/lib/validation/catalog';

export type CategoryOption = {
  id: string;
  label: string; // pre-formatted "— — Subcategory" for depth
  disabled?: boolean; // true for self and descendants on edit
};

type Labels = {
  nameAr: string;
  nameEn: string;
  slug: string;
  parent: string;
  noParent: string;
  position: string;
  status: string;
  active: string;
  archived: string;
  save: string;
  cancel: string;
};

export function CategoryForm({
  id,
  initial,
  parentOptions,
  labels,
  cancelHref,
}: {
  id?: string;
  initial?: CategoryInput;
  parentOptions: CategoryOption[];
  labels: Labels;
  cancelHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<CategoryInput>(
    initial ?? {
      nameAr: '',
      nameEn: '',
      slug: undefined,
      parentId: null,
      position: 0,
      status: 'ACTIVE',
    },
  );
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const payload: CategoryInput = {
        ...state,
        slug: state.slug?.trim() ? state.slug.trim() : undefined,
        parentId: state.parentId || null,
      };
      const res = id
        ? await updateCategoryAction(id, payload)
        : await createCategoryAction(payload);
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      router.push(cancelHref);
      router.refresh();
    });
  };

  return (
    <form method="post" onSubmit={submit} className="max-w-2xl space-y-5">
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
          <Label htmlFor="parent">{labels.parent}</Label>
          <Select
            id="parent"
            value={state.parentId ?? ''}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                parentId: e.target.value || null,
              }))
            }
          >
            <option value="">{labels.noParent}</option>
            {parentOptions.map((opt) => (
              <option key={opt.id} value={opt.id} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">{labels.position}</Label>
          <Input
            id="position"
            type="number"
            min={0}
            value={state.position}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                position: Number.parseInt(e.target.value || '0', 10),
              }))
            }
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
              status: e.target.value as CategoryInput['status'],
            }))
          }
        >
          <option value="ACTIVE">{labels.active}</option>
          <option value="ARCHIVED">{labels.archived}</option>
        </Select>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
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
