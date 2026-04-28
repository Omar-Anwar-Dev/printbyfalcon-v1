'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCourierAction,
  updateCourierAction,
} from '@/app/actions/admin-couriers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CourierInput } from '@/lib/validation/couriers';

type Labels = {
  nameAr: string;
  nameEn: string;
  phone: string;
  position: string;
  active: string;
  save: string;
  cancel: string;
};

export function CourierForm({
  id,
  initial,
  cancelHref,
  labels,
}: {
  id?: string;
  initial?: CourierInput;
  cancelHref: string;
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<CourierInput>(
    initial ?? {
      nameAr: '',
      nameEn: '',
      phone: undefined,
      position: 0,
      active: true,
    },
  );
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const payload: CourierInput = {
        ...state,
        phone: state.phone?.trim() ? state.phone.trim() : undefined,
      };
      const res = id
        ? await updateCourierAction(id, payload)
        : await createCourierAction(payload);
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
            dir="rtl"
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
            dir="ltr"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">{labels.phone}</Label>
          <Input
            id="phone"
            value={state.phone ?? ''}
            onChange={(e) =>
              setState((s) => ({ ...s, phone: e.target.value || undefined }))
            }
            placeholder="+20…"
            dir="ltr"
          />
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
                position: Number(e.target.value || 0),
              }))
            }
          />
        </div>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.active}
          onChange={(e) =>
            setState((s) => ({ ...s, active: e.target.checked }))
          }
        />
        {labels.active}
      </label>
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
