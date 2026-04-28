'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createBrandAction,
  updateBrandAction,
} from '@/app/actions/admin-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { BrandInput } from '@/lib/validation/catalog';

type Labels = {
  nameAr: string;
  nameEn: string;
  slug: string;
  slugHelp: string;
  status: string;
  active: string;
  archived: string;
  save: string;
  cancel: string;
};

export function BrandForm({
  id,
  initial,
  labels,
  cancelHref,
}: {
  id?: string;
  initial?: BrandInput;
  labels: Labels;
  cancelHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<BrandInput>(
    initial ?? {
      nameAr: '',
      nameEn: '',
      slug: undefined,
      status: 'ACTIVE',
    },
  );
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const payload: BrandInput = {
        ...state,
        slug: state.slug?.trim() ? state.slug.trim() : undefined,
      };
      const res = id
        ? await updateBrandAction(id, payload)
        : await createBrandAction(payload);
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
        <p className="text-xs text-muted-foreground">{labels.slugHelp}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">{labels.status}</Label>
        <Select
          id="status"
          value={state.status}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              status: e.target.value as BrandInput['status'],
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
