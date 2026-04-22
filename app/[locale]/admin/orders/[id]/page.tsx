import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatEgp } from '@/lib/catalog/price';
import {
  OrderStatusActions,
  type CourierOption,
} from '@/components/admin/order-status-actions';
import { defaultOrderStatusActionLabels } from '@/lib/admin/order-action-labels';
import { OrderNotesEditor } from '@/components/admin/order-notes-editor';
import {
  RecordReturnButton,
  type ReturnableItem,
} from '@/components/admin/record-return-button';
import {
  ORDER_STATUS_LABELS,
  type OrderStatusKey,
} from '@/lib/whatsapp-templates';
import { OrderInvoicePanel } from '@/components/admin/order-invoice-panel';
import { B2BConfirmPanel } from '@/components/admin/b2b-confirm-panel';
import { CodMarkPaidButton } from '@/components/admin/cod-mark-paid-button';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  // Widened for Sprint 8: SALES_REP needs access to B2B Pending-Confirmation
  // orders. Per-action authz is still enforced server-side (courier handoff
  // stays OWNER+OPS; B2B confirm is OWNER+SALES_REP).
  await requireAdmin(['OWNER', 'OPS', 'SALES_REP']);
  const { locale, id } = await params;
  const isAr = locale === 'ar';
  const statusLocale: 'ar' | 'en' = isAr ? 'ar' : 'en';
  const statusLabel = (s: OrderStatusKey) =>
    ORDER_STATUS_LABELS[s][statusLocale];

  const [order, couriers] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        statusEvents: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, name: true, phone: true, email: true } },
        courier: { select: { nameAr: true, nameEn: true, phone: true } },
        returns: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
      },
    }),
    prisma.courier.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { nameEn: 'asc' }],
      select: { id: true, nameAr: true, nameEn: true, phone: true },
    }),
  ]);
  if (!order) notFound();

  const invoices = await prisma.invoice.findMany({
    where: { orderId: order.id },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      invoiceNumber: true,
      version: true,
      isAmended: true,
      amendmentReason: true,
      generatedAt: true,
    },
  });
  const currentInvoice = invoices.find((i) => !i.isAmended) ?? null;
  const priorInvoices = invoices.filter(
    (i) => !currentInvoice || i.id !== currentInvoice.id,
  );

  const returnableItems: ReturnableItem[] = order.items.map((i) => ({
    id: i.id,
    label: `${isAr ? i.nameArSnapshot : i.nameEnSnapshot} (${i.skuSnapshot})`,
    maxQty: i.qty,
  }));

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

  const courierOptions: CourierOption[] = couriers.map((c) => ({
    id: c.id,
    label: isAr ? c.nameAr : c.nameEn,
    phone: c.phone,
  }));
  const courierName = order.courier
    ? isAr
      ? order.courier.nameAr
      : order.courier.nameEn
    : null;
  const courierPhone =
    order.courierPhoneSnapshot ?? order.courier?.phone ?? null;

  const actionLabels = defaultOrderStatusActionLabels(statusLocale);

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

      {order.status === 'PENDING_CONFIRMATION' && order.type === 'B2B' ? (
        <section className="mb-6">
          <B2BConfirmPanel
            orderId={order.id}
            labels={{
              title: isAr
                ? 'تأكيد طلب B2B (مبيعات)'
                : 'Confirm B2B order (sales rep)',
              body: isAr
                ? 'وصل الطلب بصيغة "إرسال للمراجعة" — اتفق مع العميل على طريقة الدفع واضغط تأكيد.'
                : 'This order was submitted for review — agree the payment arrangement with the customer, then confirm.',
              paymentMethodNoteLabel: isAr
                ? 'ملاحظة طريقة الدفع / الشروط'
                : 'Payment method / terms note',
              paymentMethodNoteHelp: isAr
                ? 'مثال: "PO #A12 — نت-15" · تظهر على الفاتورة وتفاصيل الطلب.'
                : 'e.g. "PO #A12 — Net-15" · surfaced on the invoice + order detail.',
              noteLabel: isAr
                ? 'ملاحظة للعميل (اختياري)'
                : 'Customer note (optional)',
              notePlaceholder: isAr
                ? 'ملاحظة تُضاف لرسالة التأكيد'
                : 'Appears in the customer confirmation message',
              confirmCta: isAr ? 'تأكيد الطلب' : 'Confirm order',
              confirming: isAr ? 'جارٍ التأكيد...' : 'Confirming…',
              successToast: isAr ? 'تم التأكيد' : 'Confirmed',
              errorGeneric: isAr
                ? 'حصل خطأ. حاول مرة أخرى.'
                : 'Something went wrong — please try again.',
              errorMap: {
                'paymentMethodNote.required': isAr
                  ? 'ملاحظة طريقة الدفع مطلوبة.'
                  : 'Payment method note is required.',
                'order.not_found': isAr
                  ? 'الطلب غير موجود.'
                  : 'Order not found.',
                'order.not_b2b': isAr
                  ? 'هذا الإجراء خاص بطلبات B2B.'
                  : 'Only B2B orders can be confirmed here.',
                'order.not_pending_confirmation': isAr
                  ? 'الطلب مش في حالة "بانتظار التأكيد".'
                  : 'Order is no longer pending confirmation.',
                'order.invalid_status_transition': isAr
                  ? 'التحويل غير مسموح.'
                  : 'Invalid status transition.',
                'validation.failed': isAr
                  ? 'البيانات غير صالحة.'
                  : 'Invalid input.',
                'auth.admin_required': isAr
                  ? 'يجب تسجيل الدخول كمسؤول.'
                  : 'Admin login required.',
              },
            }}
          />
        </section>
      ) : null}

      <section className="mb-6 rounded-md border bg-background p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              {isAr ? 'إجراءات الحالة' : 'Status actions'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAr ? 'الحالة الحالية: ' : 'Current status: '}
              <span className="font-medium text-foreground">
                {statusLabel(order.status as OrderStatusKey)}
              </span>
            </p>
          </div>
        </div>
        <OrderStatusActions
          orderId={order.id}
          currentStatus={order.status}
          couriers={courierOptions}
          hiddenTransitions={
            order.status === 'PENDING_CONFIRMATION' && order.type === 'B2B'
              ? ['CONFIRMED']
              : undefined
          }
          labels={{
            sectionTitle: isAr ? 'إجراءات الحالة' : 'Status actions',
            note: isAr ? 'ملاحظة (اختياري)' : 'Note (optional)',
            notePlaceholder: isAr
              ? 'تُعرض للعميل مع رسالة التحديث'
              : 'Shown to customer with the status update message',
            courier: isAr ? 'شركة الشحن' : 'Courier',
            courierPhone: isAr
              ? 'هاتف المندوب (اختياري)'
              : 'Courier agent phone (optional)',
            courierPhoneHelp: isAr
              ? 'يُستخدم بدلاً من الهاتف الافتراضي للشركة'
              : 'Overrides the courier default phone',
            waybill: isAr ? 'رقم البوليصة' : 'Waybill',
            expectedDelivery: isAr ? 'التسليم المتوقع' : 'Expected delivery',
            confirm: isAr ? 'تأكيد' : 'Confirm',
            cancel: isAr ? 'إلغاء' : 'Cancel',
            noTransitions: isAr
              ? 'هذه الحالة نهائية — لا توجد إجراءات متاحة'
              : 'Terminal state — no further actions',
            actions: actionLabels,
          }}
        />
      </section>

      <OrderInvoicePanel
        current={
          currentInvoice
            ? {
                id: currentInvoice.id,
                invoiceNumber: currentInvoice.invoiceNumber,
                version: currentInvoice.version,
                isAmended: currentInvoice.isAmended,
                amendmentReason: currentInvoice.amendmentReason,
                generatedAt: currentInvoice.generatedAt.toISOString(),
              }
            : null
        }
        history={priorInvoices.map((i) => ({
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          version: i.version,
          isAmended: i.isAmended,
          amendmentReason: i.amendmentReason,
          generatedAt: i.generatedAt.toISOString(),
        }))}
        locale={locale}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-md border bg-background p-4 text-sm">
          <h2 className="mb-2 text-base font-semibold">
            {isAr ? 'الحالة' : 'Status'}
          </h2>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {isAr ? 'الطلب' : 'Order'}
              </dt>
              <dd className="font-medium">
                {statusLabel(order.status as OrderStatusKey)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {isAr ? 'طريقة الدفع' : 'Payment method'}
              </dt>
              <dd>{order.paymentMethod}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {isAr ? 'حالة الدفع' : 'Payment status'}
              </dt>
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
            {order.paymentMethodNote ? (
              <div className="mt-2 rounded border border-accent/30 bg-accent/5 px-2 py-1.5 text-xs">
                <span className="text-muted-foreground">
                  {isAr ? 'ملاحظة الدفع: ' : 'Payment note: '}
                </span>
                <span className="font-medium">{order.paymentMethodNote}</span>
              </div>
            ) : null}
          </dl>
          {order.paymentMethod === 'COD' &&
          order.paymentStatus === 'PENDING_ON_DELIVERY' ? (
            <div className="mt-3">
              <CodMarkPaidButton orderId={order.id} locale={locale} />
            </div>
          ) : null}
        </section>

        <section className="rounded-md border bg-background p-4 text-sm">
          <h2 className="mb-2 text-base font-semibold">
            {isAr ? 'العميل' : 'Customer'}
          </h2>
          <p className="font-medium">{order.contactName}</p>
          <p className="text-muted-foreground" dir="ltr">
            {order.contactPhone}
          </p>
          {order.contactEmail ? (
            <p className="text-muted-foreground" dir="ltr">
              {order.contactEmail}
            </p>
          ) : null}
          {order.user ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {isAr ? 'مستخدم مسجل' : 'Registered user'} · {order.user.id}
            </p>
          ) : (
            <p className="mt-2 text-xs italic text-muted-foreground">
              {isAr ? 'طلب ضيف' : 'Guest checkout'}
            </p>
          )}
          {order.type === 'B2B' ? (
            <dl className="mt-3 space-y-1 rounded border bg-muted/30 px-3 py-2 text-xs">
              {order.placedByName ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {isAr ? 'وضعه' : 'Placed by'}
                  </dt>
                  <dd className="font-medium">{order.placedByName}</dd>
                </div>
              ) : null}
              {order.poReference ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {isAr ? 'رقم PO' : 'PO reference'}
                  </dt>
                  <dd className="font-mono">{order.poReference}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </section>

        {courierName || order.waybill || order.expectedDeliveryDate ? (
          <section className="rounded-md border bg-background p-4 text-sm md:col-span-2">
            <h2 className="mb-2 text-base font-semibold">
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

        <section className="rounded-md border bg-background p-4 text-sm md:col-span-2">
          <h2 className="mb-2 text-base font-semibold">
            {isAr ? 'العنوان' : 'Address'}
          </h2>
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
          <h2 className="mb-2 text-base font-semibold">
            {isAr ? 'المنتجات' : 'Items'}
          </h2>
          <ul className="space-y-2">
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
          <dl className="mt-3 space-y-1 border-t pt-3">
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
              <dd>
                {formatEgp(order.totalEgp.toString(), isAr ? 'ar' : 'en')}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-md border bg-background p-4 text-sm md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {isAr ? 'الإرجاعات' : 'Returns'}
            </h2>
            <RecordReturnButton
              orderId={order.id}
              items={returnableItems}
              labels={{
                trigger: isAr ? 'تسجيل إرجاع' : 'Record a return',
                title: isAr ? 'تسجيل إرجاع' : 'Record a return',
                body: isAr
                  ? 'يتم إرسال قرار الاسترداد إلى القسم المالي يدوياً — لا يوجد استرداد تلقائي.'
                  : 'The refund decision is forwarded to finance manually — no automatic refund processing.',
                reason: isAr ? 'سبب الإرجاع' : 'Reason',
                reasonPlaceholder: isAr
                  ? 'مثال: تالف عند الاستلام'
                  : 'e.g. damaged on arrival',
                refundDecision: isAr ? 'قرار الاسترداد' : 'Refund decision',
                refundDecisionOptions: {
                  PENDING: isAr ? 'بانتظار المراجعة' : 'Pending review',
                  APPROVED_CASH: isAr ? 'استرداد نقدي' : 'Cash refund',
                  APPROVED_CARD_MANUAL: isAr
                    ? 'استرداد بطاقة (يدوي)'
                    : 'Card refund (manual)',
                  DENIED: isAr ? 'مرفوض' : 'Denied',
                },
                refundAmount: isAr
                  ? 'قيمة الاسترداد (جنيه)'
                  : 'Refund amount (EGP)',
                note: isAr ? 'ملاحظات داخلية' : 'Internal note',
                notePlaceholder: isAr
                  ? 'للفريق فقط — لا تظهر للعميل'
                  : 'Team-only — not shown to the customer',
                items: isAr ? 'المنتجات المُرجَعة' : 'Returned items',
                itemQty: isAr ? 'الكمية القصوى:' : 'Max qty:',
                confirm: isAr ? 'تسجيل الإرجاع' : 'Record return',
                cancel: isAr ? 'إلغاء' : 'Cancel',
              }}
            />
          </div>
          {order.returns.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              {isAr ? 'لا توجد إرجاعات.' : 'No returns yet.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {order.returns.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border bg-paper/40 p-3 text-sm"
                >
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{r.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString(
                          isAr ? 'ar-EG' : 'en-US',
                        )}
                      </p>
                    </div>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                      {r.refundDecision}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isAr ? 'عدد البنود:' : 'Items:'} {r.items.length} ·
                    {r.refundAmountEgp
                      ? ` ${isAr ? 'المبلغ:' : 'Amount:'} ${r.refundAmountEgp.toString()} EGP`
                      : ''}
                  </p>
                  {r.note ? (
                    <p className="mt-1 whitespace-pre-line text-xs italic text-muted-foreground">
                      {r.note}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-md border bg-background p-4 text-sm md:col-span-2">
          <h2 className="mb-3 text-base font-semibold">
            {isAr ? 'الملاحظات' : 'Notes'}
          </h2>
          <OrderNotesEditor
            orderId={order.id}
            initialInternal={order.internalNotes}
            initialCustomer={order.customerNotes}
            labels={{
              sectionTitle: isAr ? 'الملاحظات' : 'Notes',
              internal: isAr ? 'ملاحظات داخلية' : 'Internal notes',
              internalHelp: isAr
                ? 'لا تظهر للعميل مطلقاً — للفريق فقط'
                : 'Never shown to the customer — team-only',
              customer: isAr
                ? 'ملاحظات تُعرض للعميل'
                : 'Customer-visible notes',
              customerHelp: isAr
                ? 'تظهر في صفحة تفاصيل الطلب للعميل'
                : "Rendered on the customer's order detail page",
              save: isAr ? 'حفظ الملاحظات' : 'Save notes',
              saved: isAr ? 'تم الحفظ' : 'Saved',
              empty: isAr ? '—' : '—',
            }}
          />
        </section>

        <section className="rounded-md border bg-background p-4 text-sm md:col-span-2">
          <h2 className="mb-4 text-base font-semibold">
            {isAr ? 'سجل الحالة' : 'Timeline'}
          </h2>
          <ol className="relative space-y-5 ps-6">
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
                      className={`font-medium ${
                        isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {statusLabel(e.status as OrderStatusKey)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString(
                        isAr ? 'ar-EG' : 'en-US',
                      )}
                    </span>
                    {e.note ? (
                      <span className="mt-1 text-muted-foreground">
                        {e.note}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
