import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Paymob browser-return handler.
 *
 * Paymob's "Transaction response callback" points the browser here after
 * payment attempt; we read `merchant_order_id` from the query string (our
 * internal Order.id) and redirect the user into our own order-confirmation
 * page in their locale. The true source of payment-status truth is the
 * server-side webhook at /api/webhooks/paymob — this handler is purely UX.
 *
 * Paymob sandbox redirect URL includes (per docs):
 *   ?id=<txn_id>&success=<bool>&pending=<bool>&merchant_order_id=<our_id>&...
 */
export default async function PaymobReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ merchant_order_id?: string; order?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const merchantOrderId = sp.merchant_order_id ?? sp.order ?? '';
  if (!merchantOrderId) notFound();

  const order = await prisma.order.findUnique({
    where: { id: merchantOrderId },
    select: { id: true },
  });
  if (!order) notFound();

  redirect(`/${locale}/order/confirmed/${order.id}`);
}
