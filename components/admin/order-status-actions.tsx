'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@prisma/client';
import { updateOrderStatusAction } from '@/app/actions/admin-orders';
import { ORDER_STATUS_TRANSITIONS } from '@/lib/order/status';
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

export type CourierOption = {
  id: string;
  label: string;
  phone: string | null;
};

type Labels = {
  sectionTitle: string;
  note: string;
  notePlaceholder: string;
  courier: string;
  courierPhone: string;
  courierPhoneHelp: string;
  waybill: string;
  expectedDelivery: string;
  confirm: string;
  cancel: string;
  noTransitions: string;
  actions: Record<OrderStatus, string>;
};

// NOTE: `defaultOrderStatusActionLabels` lives in `lib/admin/order-action-labels.ts`.
// Server Components import it from there to build the `labels.actions` map
// before rendering this component. A re-export from this 'use client' file
// would still tag the symbol as client-bound and break the server import.

type DialogTarget =
  | { kind: 'simple'; to: OrderStatus }
  | { kind: 'handoff'; to: 'HANDED_TO_COURIER' };

export function OrderStatusActions({
  orderId,
  currentStatus,
  couriers,
  zoneDefaultEtaDays,
  labels,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  couriers: CourierOption[];
  /// Default "expected delivery" offset from today (days). Falls back to +3.
  /// Sprint 9 wires real per-zone values; until then 3 days is the global default.
  zoneDefaultEtaDays?: number;
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simple-transition form state
  const [simpleNote, setSimpleNote] = useState('');

  // Handoff form state
  const [courierId, setCourierId] = useState(couriers[0]?.id ?? '');
  const [courierPhoneOverride, setCourierPhoneOverride] = useState('');
  const [waybill, setWaybill] = useState('');
  const [etaDate, setEtaDate] = useState(
    defaultEtaDateInput(zoneDefaultEtaDays ?? 3),
  );
  const [handoffNote, setHandoffNote] = useState('');

  const validTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];

  const resetAndClose = () => {
    setDialog(null);
    setError(null);
    setSimpleNote('');
    setCourierPhoneOverride('');
    setWaybill('');
    setHandoffNote('');
  };

  const submitSimple = () => {
    if (!dialog || dialog.kind !== 'simple') return;
    // Client-side mirror of the server's required-note rule for
    // DELAYED_OR_ISSUE so the user sees the problem without a round trip.
    if (dialog.to === 'DELAYED_OR_ISSUE' && !simpleNote.trim()) {
      setError('order.delayed.note_required');
      return;
    }
    setError(null);
    start(async () => {
      const res = await updateOrderStatusAction({
        orderId,
        newStatus: dialog.to,
        note: simpleNote.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      resetAndClose();
      router.refresh();
    });
  };

  const submitHandoff = () => {
    if (!dialog || dialog.kind !== 'handoff') return;
    if (!courierId) {
      setError('courier.required');
      return;
    }
    setError(null);
    start(async () => {
      const res = await updateOrderStatusAction({
        orderId,
        newStatus: 'HANDED_TO_COURIER',
        note: handoffNote.trim() || undefined,
        courierHandoff: {
          courierId,
          courierPhone: courierPhoneOverride.trim() || undefined,
          waybill: waybill.trim() || undefined,
          expectedDeliveryDate: etaDate
            ? new Date(etaDate + 'T00:00:00Z').toISOString()
            : undefined,
        },
      });
      if (!res.ok) {
        setError(res.errorKey);
        return;
      }
      resetAndClose();
      router.refresh();
    });
  };

  if (validTransitions.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        {labels.noTransitions}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {validTransitions.map((to) => (
          <Button
            key={to}
            type="button"
            size="sm"
            variant={
              to === 'CANCELLED' || to === 'DELAYED_OR_ISSUE'
                ? 'outline'
                : 'default'
            }
            onClick={() =>
              setDialog(
                to === 'HANDED_TO_COURIER'
                  ? { kind: 'handoff', to: 'HANDED_TO_COURIER' }
                  : { kind: 'simple', to },
              )
            }
            disabled={pending}
          >
            {labels.actions[to]}
          </Button>
        ))}
      </div>

      {/* Simple confirm dialog */}
      <Dialog
        open={dialog?.kind === 'simple'}
        onOpenChange={(open) => (open ? null : resetAndClose())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === 'simple' ? labels.actions[dialog.to] : ''}
            </DialogTitle>
            <DialogDescription>{labels.note}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={simpleNote}
              onChange={(e) => setSimpleNote(e.target.value)}
              placeholder={labels.notePlaceholder}
              rows={3}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetAndClose}
              disabled={pending}
            >
              {labels.cancel}
            </Button>
            <Button type="button" onClick={submitSimple} disabled={pending}>
              {labels.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Courier handoff dialog */}
      <Dialog
        open={dialog?.kind === 'handoff'}
        onOpenChange={(open) => (open ? null : resetAndClose())}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{labels.actions.HANDED_TO_COURIER}</DialogTitle>
            <DialogDescription>{labels.note}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="courier">{labels.courier}</Label>
              {couriers.length === 0 ? (
                <p className="text-sm text-destructive">
                  {labels.actions.HANDED_TO_COURIER}: no active couriers
                </p>
              ) : (
                <Select
                  id="courier"
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
                <Label htmlFor="courierPhone">{labels.courierPhone}</Label>
                <Input
                  id="courierPhone"
                  value={courierPhoneOverride}
                  onChange={(e) => setCourierPhoneOverride(e.target.value)}
                  placeholder={labels.courierPhoneHelp}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="waybill">{labels.waybill}</Label>
                <Input
                  id="waybill"
                  value={waybill}
                  onChange={(e) => setWaybill(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="eta">{labels.expectedDelivery}</Label>
              <Input
                id="eta"
                type="date"
                value={etaDate}
                onChange={(e) => setEtaDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="handoffNote">{labels.note}</Label>
              <Textarea
                id="handoffNote"
                value={handoffNote}
                onChange={(e) => setHandoffNote(e.target.value)}
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
              onClick={resetAndClose}
              disabled={pending}
            >
              {labels.cancel}
            </Button>
            <Button
              type="button"
              onClick={submitHandoff}
              disabled={pending || couriers.length === 0 || !courierId}
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
