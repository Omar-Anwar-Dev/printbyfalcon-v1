import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Package,
  MapPin,
} from 'lucide-react';
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
    <main className="container-page max-w-3xl py-10 md:py-14">
      <header className="mb-8">
        <div className="flex items-start gap-4">
          <span
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              paymentFailed
                ? 'bg-error-soft text-error'
                : 'bg-success-soft text-success'
            }`}
          >
            {paymentFailed ? (
              <XCircle className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            ) : (
              <CheckCircle2
                className="h-6 w-6"
                strokeWidth={1.75}
                aria-hidden
              />
            )}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {paymentFailed
                ? isAr
                  ? 'فشلت عملية الدفع'
                  : 'Payment failed'
                : isAr
                  ? 'تم تأكيد طلبك'
                  : 'Your order is confirmed'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isAr ? 'رقم الطلب' : 'Order number'}:{' '}
              <span className="num font-mono font-semibold text-foreground">
                {order.orderNumber}
              </span>
            </p>
          </div>
        </div>
      </header>

      <OrderStatusPoller
        orderId={order.id}
        initialPaymentStatus={order.paymentStatus}
        locale={isAr ? 'ar' : 'en'}
      />

      {paymentPending && order.paymentMethod === 'PAYMOB_CARD' ? (
        <div className="mb-6 rounded-md border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
          {isAr
            ? 'لسه بنستنى تأكيد الدفع من Paymob. ممكن ياخد لحظات.'
            : 'Waiting for Paymob to confirm the payment — usually a few seconds.'}
        </div>
      ) : null}

      {paymentFailed ? (
        <div className="mb-6 rounded-md border border-error/30 bg-error-soft p-4 text-sm text-error">
          {isAr
            ? 'لم يتم تحصيل الدفع. ممكن تتواصل معنا على واتساب للمساعدة.'
            : 'Payment was not captured. Contact us on WhatsApp for help.'}
        </div>
      ) : null}

      {order.paymentMethod === 'COD' ? (
        <div className="mb-6 rounded-md border border-border bg-paper p-4 text-sm text-muted-foreground">
          {isAr
            ? 'طريقة الدفع: الدفع عند الاستلام. مندوبنا هيتواصل معك لتأكيد الطلب وتحديد موعد التسليم.'
            : 'Payment method: Cash on delivery. Our team will call to confirm and schedule delivery.'}
        </div>
      ) : null}

      <section className="mb-6 rounded-xl border border-border bg-paper p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Package className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {isAr ? 'المنتجات' : 'Items'}
        </h2>
        <ul className="space-y-3 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground">
                  {isAr ? i.nameArSnapshot : i.nameEnSnapshot}
                </span>
                <span className="num mt-0.5 block font-mono text-[11px] text-muted-foreground">
                  {i.skuSnapshot} · ×{i.qty}
                </span>
              </span>
              <span className="num shrink-0 whitespace-nowrap font-semibold text-foreground">
                {formatEgp(i.lineTotalEgp.toString(), isAr ? 'ar' : 'en')}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {isAr ? 'الإجمالي قبل الضريبة' : 'Subtotal'}
            </dt>
            <dd className="num font-medium text-foreground">
              {formatEgp(order.subtotalEgp.toString(), isAr ? 'ar' : 'en')}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {isAr ? 'الشحن' : 'Shipping'}
            </dt>
            <dd className="num text-foreground">
              {formatEgp(order.shippingEgp.toString(), isAr ? 'ar' : 'en')}
            </dd>
          </div>
          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
            <dt className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
              {isAr ? 'الإجمالي' : 'Total'}
            </dt>
            <dd className="num text-xl font-bold text-foreground">
              {formatEgp(order.totalEgp.toString(), isAr ? 'ar' : 'en')}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mb-6 rounded-xl border border-border bg-paper p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {isAr ? 'عنوان الشحن' : 'Shipping address'}
        </h2>
        <div className="text-sm leading-relaxed">
          <p className="font-semibold text-foreground">{addr.recipientName}</p>
          <p className="num text-muted-foreground">{addr.phone}</p>
          <p className="mt-1 text-foreground">
            {addr.street}
            {addr.building ? `, ${addr.building}` : ''}
            {addr.apartment ? `, ${addr.apartment}` : ''}
          </p>
          <p className="text-foreground">
            {addr.city}
            {addr.area ? ` — ${addr.area}` : ''} — {addr.governorate}
          </p>
          {addr.notes ? (
            <p className="mt-2 rounded border-s-2 border-border ps-3 text-xs italic text-muted-foreground">
              {addr.notes}
            </p>
          ) : null}
        </div>
      </section>

      {!order.userId ? (
        <section className="mb-6 overflow-hidden rounded-xl bg-ink p-5 text-canvas">
          <p className="text-sm font-semibold text-canvas">
            {isAr
              ? 'سجّل حسابك — المرة الجاية تكون أسرع'
              : 'Save your order — faster checkout next time'}
          </p>
          <p className="mt-1 text-xs text-canvas/70">
            {isAr
              ? `هنستخدم نفس رقم الموبايل: ${order.contactPhone}`
              : `We'll use the same phone number: ${order.contactPhone}`}
          </p>
          <Link
            href={`/sign-in?phone=${encodeURIComponent(order.contactPhone)}`}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-strong"
          >
            {isAr ? 'أنشئ حسابي' : 'Create my account'}
            <ArrowRight
              className="h-4 w-4 rtl:rotate-180"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/products"
          className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover"
        >
          {isAr ? 'تسوّق المزيد' : 'Continue shopping'}
        </Link>
        {order.userId ? (
          <Link
            href={`/account/orders/${order.id}`}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-strong"
          >
            {isAr ? 'عرض في حسابي' : 'View in my account'}
            <ArrowRight
              className="h-4 w-4 rtl:rotate-180"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        ) : null}
      </div>
    </main>
  );
}
