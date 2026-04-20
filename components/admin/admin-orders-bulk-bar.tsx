'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bulkHandOverToCourierAction } from '@/app/actions/admin-orders';
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

export type BulkBarCourier = {
  id: string;
  label: string;
  phone: string | null;
};

/**
 * Label shape — all VALUES must be serializable (strings only) because this
 * component is a Client Component receiving props from a Server Component.
 * Counts are injected via `{n}`, `{s}`, `{f}` placeholders; client does the
 * string replace. Function-valued labels would fail RSC serialization with
 * "Functions cannot be passed directly to Client Components."
 */
type Labels = {
  /** Uses `{n}` placeholder for selection count. e.g. "{n} selected". */
  selectedTemplate: string;
  noneSelected: string;
  bulkHandoff: string;
  dialogTitle: string;
  dialogBody: string;
  courier: string;
  noCouriers: string;
  courierPhone: string;
  courierPhoneHelp: string;
  waybill: string;
  expectedDelivery: string;
  note: string;
  notePlaceholder: string;
  confirm: string;
  cancel: string;
  /** `{n}` placeholder for succeeded count. */
  resultSuccessTemplate: string;
  /** `{s}` for succeeded, `{f}` for failed counts. */
  resultPartialTemplate: string;
  resultAllFailed: string;
};

function interp(
  template: string,
  vars: Record<string, string | number>,
): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function AdminOrdersBulkBar({
  couriers,
  labels,
  formId = 'admin-orders-bulk-form',
}: {
  couriers: BulkBarCourier[];
  labels: Labels;
  formId?: string;
}) {
  const router = useRouter();
  const [selectedCount, setSelectedCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [courierId, setCourierId] = useState(couriers[0]?.id ?? '');
  const [courierPhone, setCourierPhone] = useState('');
  const [waybill, setWaybill] = useState('');
  const [eta, setEta] = useState(defaultEtaDateInput(3));
  const [note, setNote] = useState('');

  useEffect(() => {
    function recount() {
      const checked = document.querySelectorAll<HTMLInputElement>(
        `input[form="${formId}"][name="orderIds"]:checked`,
      );
      setSelectedCount(checked.length);
    }
    document.addEventListener('change', recount);
    recount();
    return () => document.removeEventListener('change', recount);
  }, [formId]);

  const reset = () => {
    setOpen(false);
    setError(null);
    setCourierPhone('');
    setWaybill('');
    setNote('');
  };

  const submit = () => {
    const checked = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        `input[form="${formId}"][name="orderIds"]:checked`,
      ),
    );
    const orderIds = checked.map((el) => el.value).filter(Boolean);
    if (orderIds.length === 0) return;
    if (!courierId) {
      setError('courier.required');
      return;
    }
    setError(null);

    start(async () => {
      const res = await bulkHandOverToCourierAction({
        orderIds,
        courierHandoff: {
          courierId,
          courierPhone: courierPhone.trim() || undefined,
          waybill: waybill.trim() || undefined,
          expectedDeliveryDate: eta
            ? new Date(eta + 'T00:00:00Z').toISOString()
            : undefined,
        },
        note: note.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }

      const { succeeded, failed } = res.data;
      checked.forEach((el) => {
        if (succeeded.includes(el.value)) el.checked = false;
      });
      setSelectedCount(
        document.querySelectorAll<HTMLInputElement>(
          `input[form="${formId}"][name="orderIds"]:checked`,
        ).length,
      );

      if (failed.length === 0) {
        alert(interp(labels.resultSuccessTemplate, { n: succeeded.length }));
      } else if (succeeded.length === 0) {
        alert(labels.resultAllFailed);
      } else {
        alert(
          interp(labels.resultPartialTemplate, {
            s: succeeded.length,
            f: failed.length,
          }),
        );
      }

      reset();
      router.refresh();
    });
  };

  return (
    <>
      <div className="mb-3 flex items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <Button
          type="button"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={selectedCount === 0 || couriers.length === 0}
        >
          {labels.bulkHandoff}
        </Button>
        <span className="text-muted-foreground">
          {selectedCount > 0
            ? interp(labels.selectedTemplate, { n: selectedCount })
            : labels.noneSelected}
        </span>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : reset())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{labels.dialogTitle}</DialogTitle>
            <DialogDescription>{labels.dialogBody}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="bulk-courier">{labels.courier}</Label>
              {couriers.length === 0 ? (
                <p className="text-sm text-destructive">{labels.noCouriers}</p>
              ) : (
                <Select
                  id="bulk-courier"
                  value={courierId}
                  onChange={(e) => setCourierId(e.target.value)}
                  required
                >
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                      {c.phone ? ` · ${c.phone}` : ''}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="bulk-phone">{labels.courierPhone}</Label>
                <Input
                  id="bulk-phone"
                  value={courierPhone}
                  onChange={(e) => setCourierPhone(e.target.value)}
                  placeholder={labels.courierPhoneHelp}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bulk-waybill">{labels.waybill}</Label>
                <Input
                  id="bulk-waybill"
                  value={waybill}
                  onChange={(e) => setWaybill(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bulk-eta">{labels.expectedDelivery}</Label>
              <Input
                id="bulk-eta"
                type="date"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bulk-note">{labels.note}</Label>
              <Textarea
                id="bulk-note"
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
            <Button
              type="button"
              onClick={submit}
              disabled={
                pending ||
                couriers.length === 0 ||
                !courierId ||
                selectedCount === 0
              }
            >
              {labels.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function defaultEtaDateInput(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
