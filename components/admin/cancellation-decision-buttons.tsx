'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { processCancellationAction } from '@/app/actions/admin-orders';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Labels = {
  approve: string;
  deny: string;
  approveTitle: string;
  denyTitle: string;
  body: string;
  note: string;
  notePlaceholder: string;
  confirm: string;
  cancel: string;
};

export function CancellationDecisionButtons({
  orderId,
  labels,
}: {
  orderId: string;
  labels: Labels;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<'APPROVED' | 'DENIED' | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reset = () => {
    setDialog(null);
    setError(null);
    setNote('');
  };

  const submit = () => {
    if (!dialog) return;
    setError(null);
    start(async () => {
      const res = await processCancellationAction({
        orderId,
        decision: dialog,
        note: note.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      reset();
      router.refresh();
    });
  };

  return (
    <>
      <div className="inline-flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => setDialog('APPROVED')}
          disabled={pending}
        >
          {labels.approve}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setDialog('DENIED')}
          disabled={pending}
        >
          {labels.deny}
        </Button>
      </div>
      <Dialog open={dialog !== null} onOpenChange={(o) => (o ? null : reset())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === 'APPROVED' ? labels.approveTitle : labels.denyTitle}
            </DialogTitle>
            <DialogDescription>{labels.body}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decision-note">{labels.note}</Label>
            <Textarea
              id="decision-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={labels.notePlaceholder}
              rows={3}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              disabled={pending}
            >
              {labels.cancel}
            </Button>
            <Button type="button" onClick={submit} disabled={pending}>
              {labels.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
