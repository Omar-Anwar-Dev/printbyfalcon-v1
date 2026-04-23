'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setSkuLowStockThresholdAction } from '@/app/actions/admin-inventory';
import { Button } from '@/components/ui/button';

export function SkuThresholdForm({
  productId,
  currentValue,
  globalDefault,
  locale,
}: {
  productId: string;
  currentValue: number | null;
  globalDefault: number;
  locale: string;
}) {
  const isAr = locale === 'ar';
  const [pending, start] = useTransition();
  const router = useRouter();
  const [value, setValue] = useState<string>(
    currentValue === null ? '' : String(currentValue),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    const parsed = trimmed === '' ? null : Number.parseInt(trimmed, 10);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      setError(isAr ? 'قيمة غير صالحة' : 'Invalid value');
      return;
    }
    start(async () => {
      const res = await setSkuLowStockThresholdAction({
        productId,
        threshold: parsed,
      });
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
      className="rounded-md border bg-background p-4 text-sm"
    >
      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
        {isAr ? 'حد التنبيه (اختياري)' : 'Per-SKU threshold'}
      </div>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          isAr
            ? `متروك — يتبع (${globalDefault})`
            : `leave empty — uses global (${globalDefault})`
        }
        className="h-9 w-full rounded-md border bg-background px-3 tabular-nums"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {saved ? (isAr ? 'تم الحفظ' : 'Saved') : ''}
          {error ? <span className="text-error">{error}</span> : null}
        </span>
        <Button type="submit" size="sm" disabled={pending}>
          {isAr ? 'حفظ' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
