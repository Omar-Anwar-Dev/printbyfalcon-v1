import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { formatEgp } from '@/lib/catalog/price';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'تفاصيل الطلب' : 'Order details',
    robots: { index: false, follow: false },
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const isAr = locale === 'ar';
  const user = await getOptionalUser();
  if (!user) redirect(`/${locale}/sign-in`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      statusEvents: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!order) notFound();
  if (order.userId !== user.id && user.type !== 'ADMIN') notFound();

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
    <div className="container max-w-3xl py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          {isAr ? 'تفاصيل الطلب' : 'Order details'}
        </h1>
        <p className="mt-1 font-mono text-sm">{order.orderNumber}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(order.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
        </p>
      </header>

      <section className="mb-6 grid gap-3 rounded-md border bg-background p-4 text-sm md:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">
            {isAr ? 'الحالة' : 'Status'}
          </dt>
          <dd className="font-medium">{order.status}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {isAr ? 'طريقة الدفع' : 'Payment method'}
          </dt>
          <dd className="font-medium">{order.paymentMethod}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {isAr ? 'حالة الدفع' : 'Payment status'}
          </dt>
          <dd className="font-medium">{order.paymentStatus}</dd>
        </div>
      </section>

      <section className="mb-6 rounded-md border bg-background p-4">
        <h2 className="mb-3 text-base font-semibold">
          {isAr ? 'المنتجات' : 'Items'}
        </h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>
                {isAr ? i.nameArSnapshot : i.nameEnSnapshot} × {i.qty}
                <span className="block font-mono text-xs text-muted-foreground">
                  {i.skuSnapshot}
                </span>
              </span>
              <span>
                {formatEgp(i.lineTotalEgp.toString(), isAr ? 'ar' : 'en')}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {isAr ? 'الإجمالي قبل الضريبة' : 'Subtotal'}
            </dt>
            <dd>
              {formatEgp(order.subtotalEgp.toString(), isAr ? 'ar' : 'en')}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {isAr ? 'الشحن' : 'Shipping'}
            </dt>
            <dd>
              {formatEgp(order.shippingEgp.toString(), isAr ? 'ar' : 'en')}
            </dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>{isAr ? 'الإجمالي' : 'Total'}</dt>
            <dd>{formatEgp(order.totalEgp.toString(), isAr ? 'ar' : 'en')}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-6 rounded-md border bg-background p-4 text-sm">
        <h2 className="mb-3 text-base font-semibold">
          {isAr ? 'عنوان الشحن' : 'Shipping address'}
        </h2>
        <p className="font-medium">{addr.recipientName}</p>
        <p className="text-muted-foreground">{addr.phone}</p>
        <p>
          {addr.street}
          {addr.building ? `, ${addr.building}` : ''}
          {addr.apartment ? `, ${addr.apartment}` : ''}
        </p>
        <p className="text-muted-foreground">
          {addr.city}
          {addr.area ? ` — ${addr.area}` : ''} — {addr.governorate}
        </p>
      </section>

      <section className="rounded-md border bg-background p-4">
        <h2 className="mb-3 text-base font-semibold">
          {isAr ? 'تاريخ الحالة' : 'Status timeline'}
        </h2>
        <ol className="space-y-2 text-sm">
          {order.statusEvents.map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className="text-xs text-muted-foreground">
                {new Date(e.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
              </span>
              <span>
                <span className="font-medium">{e.status}</span>
                {e.note ? (
                  <span className="block text-muted-foreground">{e.note}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
