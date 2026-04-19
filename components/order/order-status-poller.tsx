'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  orderId: string;
  initialPaymentStatus: string;
  locale: 'ar' | 'en';
};

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 40; // 2 minutes

/**
 * Invisible poller — refreshes the confirmation page when the order's
 * payment status flips (PENDING → PAID / FAILED). Stops on terminal state.
 */
export function OrderStatusPoller({ orderId, initialPaymentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialPaymentStatus);

  useEffect(() => {
    if (status !== 'PENDING') return;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { paymentStatus: string };
        if (data.paymentStatus !== status) {
          setStatus(data.paymentStatus);
          router.refresh();
          clearInterval(timer);
        }
      } catch {
        // swallow — try again next tick
      }
      if (attempts >= POLL_MAX_ATTEMPTS) clearInterval(timer);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [orderId, status, router]);

  return null;
}
