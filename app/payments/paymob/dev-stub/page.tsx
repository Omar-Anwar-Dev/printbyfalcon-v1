/**
 * Dev-mode Paymob stub — only reachable when PAYMOB_API_KEY is not set.
 * Lets developers click "Simulate success" / "Simulate failure" to exercise
 * the webhook-equivalent code path without real Paymob sandbox credentials.
 */
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { isPaymobConfigured } from '@/lib/payments/paymob';

async function devSuccess(formData: FormData) {
  'use server';
  if (isPaymobConfigured('card')) {
    throw new Error('Dev stub is disabled when Paymob is configured.');
  }
  const orderId = formData.get('order')?.toString();
  if (!orderId) throw new Error('Missing order id');
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  const fakeTxn = `dev-${Date.now()}`;
  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        paymobTransactionId: fakeTxn,
      },
    }),
    prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: `Dev stub: payment captured (${fakeTxn})`,
      },
    }),
  ]);
  redirect(`/order/confirmed/${order.id}`);
}

async function devFailure(formData: FormData) {
  'use server';
  if (isPaymobConfigured('card')) {
    throw new Error('Dev stub is disabled when Paymob is configured.');
  }
  const orderId = formData.get('order')?.toString();
  if (!orderId) throw new Error('Missing order id');
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  const fakeTxn = `dev-fail-${Date.now()}`;
  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'FAILED', paymobTransactionId: fakeTxn },
    }),
    prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: `Dev stub: payment failed (${fakeTxn})`,
      },
    }),
  ]);
  redirect(`/order/confirmed/${order.id}`);
}

export default async function PaymobDevStubPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; order?: string }>;
}) {
  if (isPaymobConfigured('card')) notFound();
  const sp = await searchParams;
  if (!sp.order) notFound();

  return (
    <div className="container max-w-md py-12">
      <h1 className="mb-2 text-2xl font-semibold">Paymob — Dev Stub</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Paymob API credentials are not configured on this environment. Simulate
        the outcome:
      </p>
      <div className="space-y-3">
        <form action={devSuccess}>
          <input type="hidden" name="order" value={sp.order} />
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:opacity-90"
          >
            Simulate successful payment
          </button>
        </form>
        <form action={devFailure}>
          <input type="hidden" name="order" value={sp.order} />
          <button
            type="submit"
            className="w-full rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:opacity-90"
          >
            Simulate payment failure
          </button>
        </form>
      </div>
    </div>
  );
}
