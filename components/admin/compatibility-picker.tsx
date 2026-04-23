'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setProductCompatibilityAction } from '@/app/actions/admin-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type CompatibilityOption = {
  id: string;
  brandLabel: string;
  modelName: string;
};

type Labels = {
  title: string;
  search: string;
  save: string;
  saved: string;
  empty: string;
};

export function CompatibilityPicker({
  productId,
  options,
  initialSelectedIds,
  labels,
}: {
  productId: string;
  options: CompatibilityOption[];
  initialSelectedIds: string[];
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedIds),
  );
  const [query, setQuery] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.modelName.toLowerCase().includes(q) ||
        o.brandLabel.toLowerCase().includes(q),
    );
  }, [options, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = () => {
    start(async () => {
      const res = await setProductCompatibilityAction(
        productId,
        Array.from(selected),
      );
      if (!res.ok) {
        alert(res.errorKey);
        return;
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      router.refresh();
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{labels.title}</h2>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <>
          <Input
            placeholder={labels.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto rounded-md border bg-background">
            <ul className="divide-y text-sm">
              {visible.map((o) => (
                <li key={o.id} className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    id={`compat-${o.id}`}
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor={`compat-${o.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <span className="text-muted-foreground">
                      {o.brandLabel}
                    </span>{' '}
                    {o.modelName}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={save} disabled={pending}>
              {labels.save}
            </Button>
            {savedFlash ? (
              <span className="text-sm text-success">{labels.saved}</span>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
