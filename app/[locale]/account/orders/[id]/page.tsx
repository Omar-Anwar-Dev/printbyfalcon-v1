import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { Link } from '@/lib/i18n/routing';
import { formatEgp } from '@/lib/catalog/price';
import {
  ORDER_STATUS_LABELS,
  type OrderStatusKey,
} from '@/lib/whatsapp-templates';
import { CancelOrderButton } from '@/components/account/cancel-order-button';
import { ReorderButton } from '@/components/account/reorder-button';

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
      courier: { select: { nameAr: true, nameEn: true, phone: true } },
    },
  });
  if (!order) notFound();
  // Ownership check — B2C sees own orders; B2B sees any order belonging to
  // their company (shared-login model, ADR-007); ADMIN sees everything.
  const company =
    user.type === 'B2B'
      ? await prisma.company.findUnique({
          where: { primaryUserId: user.id },
          select: { id: true },
        })
      : null;
  const ownsOrder =
    user.type === 'ADMIN' ||
    order.userId === user.id ||
    (company != null && order.companyId === company.id);
  if (!ownsOrder) notFound();

  const currentInvoice = await prisma.invoice.findFirst({
    where: { orderId: order.id, isAmended: false },
    orderBy: { version: 'desc' },
    select: { id: true, invoiceNumber: true, version: true },
  });

  const statusLocale: 'ar' | 'en' = isAr ? 'ar' : 'en';
  const statusLabel = (s: OrderStatusKey) =>
    ORDER_STATUS_LABELS[s][statusLocale];
  const courierName = order.courier
    ? isAr
      ? order.courier.nameAr
      : order.courier.nameEn
    : null;
  const courierPhone =
    order.courierPhoneSnapshot ?? order.courier?.phone ?? null;

  const canRequestCancel =
    (order.status === 'PENDING_CONFIRMATION' || order.status === 'CONFIRMED') &&
    !order.cancellationRequestedAt;
  const cancelRequestedPending =
    order.cancellationRequestedAt && !order.cancellationResolvedAt;
  const cancelRequestDenied =
    order.cancellationResolution === 'DENIED' &&
    order.cancellationResolvedAt !== null;

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

  const reorderLabels = {
    reorderCta: isAr ? 'أعِد الطلب' : 'Reorder',
    loading: isAr ? 'جارٍ التحميل...' : 'Loading…',
    modalTitleTemplate: isAr
      ? `إعادة طلب {orderNumber}`
      : `Reorder {orderNumber}`,
    body: isAr
      ? 'راجع الأصناف — هنضيف المتاح منها للسلة بالأسعار الحالية.'
      : "Review the lines — available items will be added at today's prices.",
    statusLabels: {
      available: isAr ? 'متوفر' : 'Available',
      partial: isAr ? 'كمية محدودة' : 'Limited stock',
      out_of_stock: isAr ? 'نفد' : 'Out of stock',
      archived: isAr ? 'مؤرشف / غير متوفر' : 'Archived / unavailable',
    },
    includeColumn: isAr ? 'ضم' : 'Add',
    productColumn: isAr ? 'المنتج' : 'Product',
    statusColumn: isAr ? 'الحالة' : 'Status',
    qtyColumn: isAr ? 'الكمية' : 'Qty',
    priceColumn: isAr ? 'السعر' : 'Price',
    addCta: isAr ? 'أضف للسلة' : 'Add to cart',
    adding: isAr ? 'جارٍ الإضافة...' : 'Adding…',
    cancel: isAr ? 'إلغاء' : 'Cancel',
    successLineTemplate: isAr
      ? `تمت إضافة {count} صنف — فتح السلة الآن.`
      : `{count} items added — open your cart.`,
    nothingToAdd: isAr
      ? 'مفيش أصناف متاحة للإضافة.'
      : 'No items available to add.',
    errorGeneric: isAr
      ? 'حصل خطأ أثناء تحميل الطلب.'
      : 'Something went wrong loading this order.',
    archivedHeader: isAr ? 'أصناف مؤرشفة' : 'Archived items',
  };

  // B2B users land here from /b2b/orders → without a portal-tabs nav
  // above (the /account/* layout drops it for B2B), they need a way
  // back. B2C users get the account tabs nav above; no breadcrumb needed.
  const showB2BBack = user.type === 'B2B';

  return (
    <main className="container-page max-w-3xl py-10 md:py-14">
      {showB2BBack ? (
        <nav
          aria-label={isAr ? 'فتات التنقّل' : 'Breadcrumb'}
          className="mb-4 text-xs"
        >
          <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
            <li>
              <Link
                href="/b2b/orders"
                className="transition-colors hover:text-accent-strong"
              >
                {isAr ? 'طلبات الشركة' : 'Company orders'}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground">
              {isAr ? 'تفاصيل الطلب' : 'Order details'}
            </li>
          </ol>
        </nav>
      ) : null}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
            {isAr ? 'تفاصيل الطلب' : 'Order details'}
          </p>
          <h1 className="num mt-2 font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {order.orderNumber}
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
          </p>
        </div>
        <ReorderButton
          orderId={order.id}
          locale={isAr ? 'ar' : 'en'}
          labels={reorderLabels}
        />
      </header>

      <section className="mb-6 grid gap-3 rounded-md border bg-background p-4 text-sm md:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">
            {isAr ? 'الحالة' : 'Status'}
          </dt>
          <dd className="font-medium">
            {statusLabel(order.status as OrderStatusKey)}
          </dd>
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
        {order.placedByName ? (
          <div>
            <dt className="text-xs text-muted-foreground">
              {isAr ? 'وضعه' : 'Placed by'}
            </dt>
            <dd className="font-medium">{order.placedByName}</dd>
          </div>
        ) : null}
        {order.poReference ? (
          <div>
            <dt className="text-xs text-muted-foreground">
              {isAr ? 'رقم أمر الشراء' : 'PO reference'}
            </dt>
            <dd className="font-mono text-sm">{order.poReference}</dd>
          </div>
        ) : null}
        {order.paymentMethodNote ? (
          <div className="md:col-span-3">
            <dt className="text-xs text-muted-foreground">
              {isAr ? 'ملاحظة الدفع' : 'Payment note'}
            </dt>
            <dd className="font-medium">{order.paymentMethodNote}</dd>
          </div>
        ) : null}
      </section>

      {courierName || order.waybill || order.expectedDeliveryDate ? (
        <section className="mb-6 rounded-md border bg-background p-4 text-sm">
          <h2 className="mb-3 text-base font-semibold">
            {isAr ? 'الشحن' : 'Shipping'}
          </h2>
          <dl className="grid gap-3 md:grid-cols-3">
            {courierName ? (
              <div>
                <dt className="text-xs text-muted-foreground">
                  {isAr ? 'شركة الشحن' : 'Courier'}
                </dt>
                <dd className="font-medium">{courierName}</dd>
                {courierPhone ? (
                  <dd>
                    <a
                      href={`tel:${courierPhone}`}
                      className="text-accent-strong hover:underline"
                      dir="ltr"
                    >
                      {courierPhone}
                    </a>
                  </dd>
                ) : null}
              </div>
            ) : null}
            {order.waybill ? (
              <div>
                <dt className="text-xs text-muted-foreground">
                  {isAr ? 'رقم البوليصة' : 'Waybill'}
                </dt>
                <dd className="font-mono">{order.waybill}</dd>
              </div>
            ) : null}
            {order.expectedDeliveryDate ? (
              <div>
                <dt className="text-xs text-muted-foreground">
                  {isAr ? 'التسليم المتوقع' : 'Expected delivery'}
                </dt>
                <dd>
                  {new Date(order.expectedDeliveryDate).toLocaleDateString(
                    isAr ? 'ar-EG' : 'en-US',
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {order.customerNotes ? (
        <section className="mb-6 rounded-md border border-accent-strong/30 bg-accent-soft/40 p-4 text-sm">
          <h2 className="mb-1 text-sm font-semibold text-accent-strong">
            {isAr ? 'ملاحظة من المتجر' : 'A note from the shop'}
          </h2>
          <p className="whitespace-pre-line text-foreground">
            {order.customerNotes}
          </p>
        </section>
      ) : null}

      {cancelRequestedPending ? (
        <section className="mb-6 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm">
          <p className="font-medium">
            {isAr
              ? 'تم استلام طلب الإلغاء — سنتواصل معك قريباً.'
              : 'Cancellation request received — we will be in touch soon.'}
          </p>
          {order.cancellationReason ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {isAr ? 'السبب: ' : 'Reason: '}
              {order.cancellationReason}
            </p>
          ) : null}
        </section>
      ) : null}

      {cancelRequestDenied ? (
        <section className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">
            {isAr ? 'تم رفض طلب الإلغاء.' : 'Cancellation request was denied.'}
          </p>
          {order.cancellationResolutionNote ? (
            <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
              {order.cancellationResolutionNote}
            </p>
          ) : null}
        </section>
      ) : null}

      {canRequestCancel ? (
        <section className="mb-6 flex items-center justify-between rounded-md border bg-background p-4 text-sm">
          <p className="text-muted-foreground">
            {isAr
              ? 'لم نسلّم الطلب للشحن بعد — يمكنك طلب إلغائه.'
              : "We haven't handed your order to the courier yet — you can request cancellation."}
          </p>
          <CancelOrderButton
            orderId={order.id}
            labels={{
              trigger: isAr ? 'طلب إلغاء' : 'Request cancellation',
              title: isAr ? 'طلب إلغاء الطلب' : 'Request order cancellation',
              body: isAr
                ? 'سنراجع طلبك ونؤكد الإلغاء عبر الواتساب خلال ساعات العمل.'
                : "We'll review your request and confirm via WhatsApp during business hours.",
              reason: isAr ? 'سبب الإلغاء (اختياري)' : 'Reason (optional)',
              reasonPlaceholder: isAr
                ? 'مثال: لم تعد لدي حاجة للمنتج'
                : 'e.g. no longer need the item',
              confirm: isAr ? 'إرسال الطلب' : 'Submit request',
              cancel: isAr ? 'إلغاء' : 'Cancel',
              error: isAr ? 'خطأ' : 'Error',
            }}
          />
        </section>
      ) : null}

      {currentInvoice ? (
        <section className="mb-6 flex items-center justify-between rounded-md border bg-background p-4 text-sm">
          <div>
            <h2 className="text-base font-semibold">
              {isAr ? 'الفاتورة' : 'Invoice'}
            </h2>
            <p className="font-mono text-xs text-muted-foreground">
              {currentInvoice.invoiceNumber}
              {currentInvoice.version > 1
                ? isAr
                  ? ` — نسخة ${currentInvoice.version}`
                  : ` — v${currentInvoice.version}`
                : ''}
            </p>
          </div>
          <a
            href={`/invoices/${currentInvoice.id}.pdf`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            {isAr ? 'تنزيل PDF' : 'Download PDF'}
          </a>
        </section>
      ) : null}

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
        <h2 className="mb-4 text-base font-semibold">
          {isAr ? 'تاريخ الحالة' : 'Status timeline'}
        </h2>
        <ol className="relative space-y-6 ps-6 text-sm">
          <span
            className="absolute bottom-1 start-2 top-1 w-px bg-border"
            aria-hidden
          />
          {order.statusEvents.map((e, idx) => {
            const isCurrent = idx === order.statusEvents.length - 1;
            return (
              <li key={e.id} className="relative">
                <span
                  className={`absolute start-[-1.0625rem] top-1 h-3 w-3 rounded-full border-2 border-background ${
                    isCurrent ? 'bg-accent-strong' : 'bg-muted-foreground/60'
                  }`}
                  aria-hidden
                />
                <div className="flex flex-col">
                  <span
                    className={`font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {statusLabel(e.status as OrderStatusKey)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString(
                      isAr ? 'ar-EG' : 'en-US',
                    )}
                  </span>
                  {e.note ? (
                    <span className="mt-1 text-muted-foreground">{e.note}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
