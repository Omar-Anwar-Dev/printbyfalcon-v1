'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { NotificationChannel, OrderStatus } from '@prisma/client';
import { updateNotificationOptOutAction } from '@/app/actions/admin-settings';
import { Button } from '@/components/ui/button';

type Labels = {
  intro: string;
  whatsappHeader: string;
  emailHeader: string;
  statusLabels: Record<OrderStatus, string>;
  save: string;
  saved: string;
};

const STATUSES: OrderStatus[] = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'HANDED_TO_COURIER',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'DELAYED_OR_ISSUE',
];

export function NotificationOptOutForm({
  initial,
  labels,
}: {
  initial: { WHATSAPP: OrderStatus[]; EMAIL: OrderStatus[] };
  labels: Labels;
}) {
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState(new Set(initial.WHATSAPP));
  const [email, setEmail] = useState(new Set(initial.EMAIL));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const toggle = (
    channel: NotificationChannel,
    status: OrderStatus,
    next: boolean,
  ) => {
    const target = channel === 'WHATSAPP' ? whatsapp : email;
    const copy = new Set(target);
    if (next) copy.add(status);
    else copy.delete(status);
    if (channel === 'WHATSAPP') setWhatsapp(copy);
    else setEmail(copy);
    setSaved(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await updateNotificationOptOutAction({
        WHATSAPP: [...whatsapp],
        EMAIL: [...email],
      });
      if (!res.ok) {
        alert(res.errorKey);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <form method="post" onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">{labels.intro}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Channel
          header={labels.whatsappHeader}
          statuses={STATUSES}
          statusLabels={labels.statusLabels}
          selected={whatsapp}
          onToggle={(s, v) => toggle('WHATSAPP', s, v)}
        />
        <Channel
          header={labels.emailHeader}
          statuses={STATUSES}
          statusLabels={labels.statusLabels}
          selected={email}
          onToggle={(s, v) => toggle('EMAIL', s, v)}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {labels.save}
        </Button>
        {saved ? (
          <span className="text-xs text-muted-foreground">{labels.saved}</span>
        ) : null}
      </div>
    </form>
  );
}

function Channel({
  header,
  statuses,
  statusLabels,
  selected,
  onToggle,
}: {
  header: string;
  statuses: OrderStatus[];
  statusLabels: Record<OrderStatus, string>;
  selected: Set<OrderStatus>;
  onToggle: (s: OrderStatus, v: boolean) => void;
}) {
  return (
    <div className="rounded-md border bg-background p-4">
      <h3 className="mb-3 text-sm font-semibold">{header}</h3>
      <ul className="space-y-2">
        {statuses.map((s) => (
          <li key={s}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(s)}
                onChange={(e) => onToggle(s, e.target.checked)}
              />
              <span>{statusLabels[s]}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
