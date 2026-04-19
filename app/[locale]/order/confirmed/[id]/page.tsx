import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { formatEgp } from '@/lib/catalog/price';
import { OrderStatusPoller } from '@/components/order/order-status-poller';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'تم تأكيد طلبك' : 'Order confirmed',
    robots: { index: false, follow: false },
  };
}

export default async function OrderConfirmedPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const isAr = locale === 'ar';

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!order) notFound();

  // Light authz: logged-in B2C user can view their own orders; guests can view
  // any order they hold the ID for (the URL itself is the capability). For a
  // production hardening pass we'd add a signed-token query param — parked.
  const user = await getOptionalUser();
  if (order.userId && user?.id !== order.userId && user?.type !== 'ADMIN') {
    notFound();
  }

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

  const paymentPending = order.paymentStatus === 'PENDING';
  const paymentFailed = order.paymentStatus === 'FAILED';

  return (
    <div className="container max-w-3xl py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          {paymentFailed
            ? isAr
              ? 'فشلت عملية الدفع'
              : 'Payment failed'
            : isAr
              ? 'تم تأكيد طلبك 🎉'
              : 'Your order is confirmed 🎉'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr ? 'رقم الطلب' : 'Order number'}:{' '}
          <span className="font-mono font-semibold">{order.orderNumber}</span>
        </p>
      </header>

      <OrderStatusPoller
        orderId={order.id}
        initialPaymentStatus={order.paymentStatus}
        locale={isAr ? 'ar' : 'en'}
      />

      {paymentPending && order.paymentMethod === 'PAYMOB_CARD' ? (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
          {isAr
            ? 'لسه بنستنى تأكيد الدفع من Paymob. ممكن ياخد لحظات.'
            : 'Waiting for Paymob to confirm the payment — usually a few seconds.'}
        </div>
      ) : null}

      {paymentFailed ? (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm">
          {isAr
            ? 'لم يتم تحصيل الدفع. ممكن تتواصل معنا على واتساب للمساعدة.'
            : 'Payment was not captured. Contact us on WhatsApp for help.'}
        </div>
      ) : null}

      {order.paymentMethod === 'COD' ? (
        <div className="mb-6 rounded-md border bg-muted/30 p-4 text-sm">
          {isAr
            ? 'طريقة الدفع: الدفع عند الاستلام. مندوبنا هيتواصل معك لتأكيد الطلب وتحديد موعد التسليم.'
            : 'Payment method: Cash on delivery. Our team will call to confirm and schedule delivery.'}
        </div>
      ) : null}

      <section className="mb-6 rounded-md border bg-background p-4">
        <h2 className="mb-3 text-base font-semibold">
          {isAr ? 'المنتجات' : 'Items'}
        </h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>
                <span className="font-medium">
                  {isAr ? i.nameArSnapshot : i.nameEnSnapshot}
                </span>
                <span className="text-muted-foreground"> × {i.qty}</span>
                <span className="block font-mono text-xs text-muted-foreground">
                  {i.skuSnapshot}
                </span>
              </span>
              <span className="shrink-0">
                {formatEgp(i.lineTotalEgp.toString(), isAr ? 'ar' : 'en')}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t pt-3 text-sm">
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

      <section className="mb-6 rounded-md border bg-background p-4">
        <h2 className="mb-3 text-base font-semibold">
          {isAr ? 'عنوان الشحن' : 'Shipping address'}
        </h2>
        <p className="text-sm">
          <span className="font-medium">{addr.recipientName}</span>
          <span className="block text-muted-foreground">{addr.phone}</span>
          <span className="block">
            {addr.street}
            {addr.building ? `, ${addr.building}` : ''}
            {addr.apartment ? `, ${addr.apartment}` : ''}
          </span>
          <span className="block">
            {addr.city}
            {addr.area ? ` — ${addr.area}` : ''} — {addr.governorate}
          </span>
          {addr.notes ? (
            <span className="mt-1 block text-xs italic text-muted-foreground">
              {addr.notes}
            </span>
          ) : null}
        </p>
      </section>

      {!order.userId ? (
        <section className="mb-6 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="mb-2 font-medium">
            {isAr
              ? 'سجل حسابك عشان تتابع طلبك أسرع المرة الجاية'
              : 'Save your order — create an account for faster next-time checkout'}
          </p>
          <p className="mb-3 text-muted-foreground">
            {isAr
              ? `هنستخدم نفس رقم الموبايل: ${order.contactPhone}`
              : `We'll use the same phone number: ${order.contactPhone}`}
          </p>
          <Link
            href={`/sign-in?phone=${encodeURIComponent(order.contactPhone)}`}
            className="inline-block rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
          >
            {isAr ? 'أنشئ حسابي' : 'Create my account'}
          </Link>
        </section>
      ) : null}

      <div className="flex gap-3">
        <Link
          href="/products"
          className="rounded-md border bg-background px-4 py-2 text-sm hover:bg-muted"
        >
          {isAr ? 'تسوق المزيد' : 'Continue shopping'}
        </Link>
        {order.userId ? (
          <Link
            href={`/account/orders/${order.id}`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {isAr ? 'عرض في حسابي' : 'View in my account'}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
