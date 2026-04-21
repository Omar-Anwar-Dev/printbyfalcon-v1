'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setGlobalLowStockThresholdAction } from '@/app/actions/admin-inventory';
import { Button } from '@/components/ui/button';

export function GlobalThresholdForm({
  initial,
  locale,
}: {
  initial: number;
  locale: string;
}) {
  const isAr = locale === 'ar';
  const [pending, start] = useTransition();
  const router = useRouter();
  const [value, setValue] = useState(String(initial));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError(isAr ? 'قيمة غير صالحة' : 'Invalid value');
      return;
    }
    start(async () => {
      const res = await setGlobalLowStockThresholdAction({ threshold: parsed });
      if (!res.ok) {
        setError(isAr ? 'تعذر الحفظ' : 'Save failed');
        return;
      }
      setError(null);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1500);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border bg-background p-6"
    >
      <label className="grid gap-2 text-sm">
        <span className="font-medium">
          {isAr ? 'الحد الافتراضي' : 'Global threshold'}
        </span>
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 w-40 rounded-md border bg-background px-3 tabular-nums"
          required
        />
      </label>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {saved ? (isAr ? 'تم الحفظ' : 'Saved') : ''}
          {error ? <span className="text-red-600">{error}</span> : null}
        </span>
        <Button type="submit" disabled={pending}>
          {isAr ? 'حفظ' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
