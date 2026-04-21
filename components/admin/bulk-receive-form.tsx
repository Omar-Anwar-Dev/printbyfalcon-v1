'use client';

import { useState, useTransition } from 'react';
import { bulkReceiveAction } from '@/app/actions/admin-inventory-bulk';
import { Button } from '@/components/ui/button';

type RowResult = {
  line: number;
  sku: string;
  ok: boolean;
  message: string;
};

export function BulkReceiveForm({ locale }: { locale: string }) {
  const isAr = locale === 'ar';
  const [csv, setCsv] = useState('');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{
    succeeded: number;
    failed: number;
    rows: RowResult[];
  } | null>(null);

  const submit = () => {
    start(async () => {
      const res = await bulkReceiveAction({ csv });
      setResult({
        succeeded: res.succeeded,
        failed: res.failed,
        rows: res.rows,
      });
    });
  };

  return (
    <div className="grid gap-4">
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={10}
        placeholder="HP-CF259A,50,restock from supplier"
        className="w-full rounded-md border bg-background p-3 font-mono text-sm"
        dir="ltr"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={submit}
          disabled={pending || csv.trim().length === 0}
        >
          {isAr ? 'تنفيذ الاستلام' : 'Run bulk receive'}
        </Button>
      </div>
      {result ? (
        <div className="rounded-md border bg-background p-4">
          <div className="mb-3 text-sm font-medium">
            {isAr
              ? `نجح: ${result.succeeded} · فشل: ${result.failed}`
              : `Succeeded: ${result.succeeded} · Failed: ${result.failed}`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 text-start">#</th>
                  <th className="py-2 text-start">SKU</th>
                  <th className="py-2 text-start">
                    {isAr ? 'النتيجة' : 'Result'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.line} className="border-t">
                    <td className="py-2">{r.line}</td>
                    <td className="py-2 font-mono text-xs">{r.sku || '—'}</td>
                    <td
                      className={`py-2 ${r.ok ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {r.ok ? '✓ ' : '✗ '}
                      {r.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
