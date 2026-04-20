'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { requestOrderCancellationAction } from '@/app/actions/orders';
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
  trigger: string;
  title: string;
  body: string;
  reason: string;
  reasonPlaceholder: string;
  confirm: string;
  cancel: string;
  error: string;
};

export function CancelOrderButton({
  orderId,
  labels,
}: {
  orderId: string;
  labels: Labels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reset = () => {
    setOpen(false);
    setError(null);
    setReason('');
  };

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await requestOrderCancellationAction({
        orderId,
        reason: reason.trim() || undefined,
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {labels.trigger}
      </Button>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : reset())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.title}</DialogTitle>
            <DialogDescription>{labels.body}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">{labels.reason}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={labels.reasonPlaceholder}
              rows={3}
            />
            {error ? (
              <p className="text-sm text-destructive">
                {labels.error}: {error}
              </p>
            ) : null}
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
