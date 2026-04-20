'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { recordReturnAction } from '@/app/actions/admin-returns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export type ReturnableItem = {
  id: string;
  label: string;
  maxQty: number;
};

type Labels = {
  trigger: string;
  title: string;
  body: string;
  reason: string;
  reasonPlaceholder: string;
  refundDecision: string;
  refundDecisionOptions: Record<
    'PENDING' | 'APPROVED_CASH' | 'APPROVED_CARD_MANUAL' | 'DENIED',
    string
  >;
  refundAmount: string;
  note: string;
  notePlaceholder: string;
  items: string;
  itemQty: string;
  confirm: string;
  cancel: string;
};

export function RecordReturnButton({
  orderId,
  items,
  labels,
}: {
  orderId: string;
  items: ReturnableItem[];
  labels: Labels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [refundDecision, setRefundDecision] = useState<
    'PENDING' | 'APPROVED_CASH' | 'APPROVED_CARD_MANUAL' | 'DENIED'
  >('PENDING');
  const [refundAmount, setRefundAmount] = useState('');
  const [note, setNote] = useState('');
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const selectedItems = useMemo(
    () =>
      items
        .map((i) => ({ id: i.id, qty: qtys[i.id] ?? 0 }))
        .filter((i) => i.qty > 0),
    [items, qtys],
  );

  const reset = () => {
    setOpen(false);
    setError(null);
    setReason('');
    setRefundDecision('PENDING');
    setRefundAmount('');
    setNote('');
    setQtys({});
  };

  const submit = () => {
    if (reason.trim().length < 3) {
      setError('return.reason_required');
      return;
    }
    if (selectedItems.length === 0) {
      setError('return.no_items');
      return;
    }
    setError(null);
    start(async () => {
      const res = await recordReturnAction({
        orderId,
        reason: reason.trim(),
        refundDecision,
        refundAmountEgp:
          refundAmount.trim() === '' ? undefined : Number(refundAmount),
        note: note.trim() || undefined,
        items: selectedItems.map((i) => ({
          orderItemId: i.id,
          qty: i.qty,
        })),
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{labels.title}</DialogTitle>
            <DialogDescription>{labels.body}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{labels.items}</Label>
              <ul className="space-y-2 rounded-md border p-2 text-sm">
                {items.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex-1 truncate">{i.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {labels.itemQty} {i.maxQty}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={i.maxQty}
                      value={qtys[i.id] ?? ''}
                      onChange={(e) =>
                        setQtys((s) => ({
                          ...s,
                          [i.id]: Number(e.target.value || 0),
                        }))
                      }
                      className="w-20"
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-1">
              <Label htmlFor="return-reason">{labels.reason}</Label>
              <Textarea
                id="return-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={labels.reasonPlaceholder}
                rows={2}
                required
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="return-decision">{labels.refundDecision}</Label>
                <Select
                  id="return-decision"
                  value={refundDecision}
                  onChange={(e) =>
                    setRefundDecision(e.target.value as typeof refundDecision)
                  }
                >
                  <option value="PENDING">
                    {labels.refundDecisionOptions.PENDING}
                  </option>
                  <option value="APPROVED_CASH">
                    {labels.refundDecisionOptions.APPROVED_CASH}
                  </option>
                  <option value="APPROVED_CARD_MANUAL">
                    {labels.refundDecisionOptions.APPROVED_CARD_MANUAL}
                  </option>
                  <option value="DENIED">
                    {labels.refundDecisionOptions.DENIED}
                  </option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="return-amount">{labels.refundAmount}</Label>
                <Input
                  id="return-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="return-note">{labels.note}</Label>
              <Textarea
                id="return-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={labels.notePlaceholder}
                rows={2}
              />
            </div>
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
