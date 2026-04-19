import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatEgp } from '@/lib/catalog/price';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale, id } = await params;
  const isAr = locale === 'ar';

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      statusEvents: { orderBy: { createdAt: 'asc' } },
      user: { select: { id: true, name: true, phone: true, email: true } },
    },
  });
  if (!order) notFound();

  const addr = order.addressSnapshot as {
    recipientName: string;
    phone: string;
    governorate: string;
    city: string;
    area: string | null;
    street: string;
    building: string | null;
    apartment: string | null;
    notes: string | null;
  };

  return (
    <div className="container max-w-4xl py-8">
      <header className="mb-6">
        <h1 className="font-mono text-2xl font-semibold">
          {order.orderNumber}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date(order.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-md border bg-background p-4 text-sm">
          <h2 className="mb-2 text-base font-semibold">Status</h2>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Order</dt>
              <dd className="font-medium">{order.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Payment method</dt>
              <dd>{order.paymentMethod}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Payment status</dt>
              <dd>{order.paymentStatus}</dd>
            </div>
            {order.paymobTransactionId ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Paymob txn</dt>
                <dd className="font-mono text-xs">
                  {order.paymobTransactionId}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-md border bg-background p-4 text-sm">
          <h2 className="mb-2 text-base font-semibold">Customer</h2>
          <p className="font-medium">{order.contactName}</p>
          <p className="text-muted-foreground">{order.contactPhone}</p>
          {order.contactEmail ? (
            <p className="text-muted-foreground">{order.contactEmail}</p>
          ) : null}
          {order.user ? (
            <p className="mt-2 text-xs text-muted-foreground">
              B2C user · {order.user.id}
            </p>
          ) : (
            <p className="mt-2 text-xs italic text-muted-foreground">
              Guest checkout
            </p>
          )}
        </section>

        <section className="rounded-md border bg-background p-4 text-sm md:col-span-2">
          <h2 className="mb-2 text-base font-semibold">Address</h2>
          <p>
            {addr.street}
            {addr.building ? `, ${addr.building}` : ''}
            {addr.apartment ? `, ${addr.apartment}` : ''}
          </p>
          <p className="text-muted-foreground">
            {addr.city}
            {addr.area ? ` — ${addr.area}` : ''} — {addr.governorate}
          </p>
          {addr.notes ? (
            <p className="mt-1 text-xs italic text-muted-foreground">
              {addr.notes}
            </p>
          ) : null}
        </section>

        <section className="rounded-md border bg-background p-4 text-sm md:col-span-2">
          <h2 className="mb-2 text-base font-semibold">Items</h2>
          <ul className="space-y-2">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>
                  {i.nameEnSnapshot} × {i.qty}
                  <span className="block font-mono text-xs text-muted-foreground">
                    {i.skuSnapshot}
                  </span>
                </span>
                <span>{formatEgp(i.lineTotalEgp.toString(), 'en')}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t pt-3">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatEgp(order.subtotalEgp.toString(), 'en')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{formatEgp(order.shippingEgp.toString(), 'en')}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatEgp(order.totalEgp.toString(), 'en')}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-md border bg-background p-4 text-sm md:col-span-2">
          <h2 className="mb-2 text-base font-semibold">Timeline</h2>
          <ol className="space-y-2">
            {order.statusEvents.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString('en-US')}
                </span>
                <span>
                  <span className="font-medium">{e.status}</span>
                  {e.note ? (
                    <span className="block text-muted-foreground">
                      {e.note}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
