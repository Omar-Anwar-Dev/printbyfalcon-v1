'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderNotesAction } from '@/app/actions/admin-orders';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Labels = {
  sectionTitle: string;
  internal: string;
  internalHelp: string;
  customer: string;
  customerHelp: string;
  save: string;
  saved: string;
  empty: string;
};

export function OrderNotesEditor({
  orderId,
  initialInternal,
  initialCustomer,
  labels,
}: {
  orderId: string;
  initialInternal: string | null;
  initialCustomer: string | null;
  labels: Labels;
}) {
  const router = useRouter();
  const [internal, setInternal] = useState(initialInternal ?? '');
  const [customer, setCustomer] = useState(initialCustomer ?? '');
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty =
    (internal ?? '') !== (initialInternal ?? '') ||
    (customer ?? '') !== (initialCustomer ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('idle');
    start(async () => {
      const res = await updateOrderNotesAction({
        orderId,
        internalNotes: internal,
        customerNotes: customer,
      });
      if (!res.ok) {
        setError(res.errorKey);
        setStatus('error');
        return;
      }
      setStatus('saved');
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="internalNotes">{labels.internal}</Label>
        <p className="text-xs text-muted-foreground">{labels.internalHelp}</p>
        <Textarea
          id="internalNotes"
          value={internal}
          onChange={(e) => setInternal(e.target.value)}
          placeholder={labels.empty}
          rows={3}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="customerNotes">{labels.customer}</Label>
        <p className="text-xs text-muted-foreground">{labels.customerHelp}</p>
        <Textarea
          id="customerNotes"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder={labels.empty}
          rows={3}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          {labels.save}
        </Button>
        {status === 'saved' ? (
          <span className="text-xs text-muted-foreground">{labels.saved}</span>
        ) : null}
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : null}
      </div>
    </form>
  );
}
