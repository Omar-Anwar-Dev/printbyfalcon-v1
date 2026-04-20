import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatEgp } from '@/lib/catalog/price';
import type { Prisma } from '@prisma/client';
import {
  AdminOrdersBulkBar,
  type BulkBarCourier,
} from '@/components/admin/admin-orders-bulk-bar';
import {
  ORDER_STATUS_LABELS,
  type OrderStatusKey,
} from '@/lib/whatsapp-templates';
import { ORDER_STATUS_TRANSITIONS } from '@/lib/order/status';

export const dynamic = 'force-dynamic';

const BULK_FORM_ID = 'admin-orders-bulk-form';

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    paymentStatus?: string;
    type?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === 'ar';
  const statusLocale: 'ar' | 'en' = isAr ? 'ar' : 'en';
  const statusLabel = (s: OrderStatusKey) =>
    ORDER_STATUS_LABELS[s][statusLocale];

  const where: Prisma.OrderWhereInput = {};
  const q = sp.q?.trim();
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { contactName: { contains: q, mode: 'insensitive' } },
      { contactPhone: { contains: q } },
    ];
  }
  if (sp.status) {
    const statuses = [
      'PENDING_CONFIRMATION',
      'CONFIRMED',
      'HANDED_TO_COURIER',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
      'DELAYED_OR_ISSUE',
    ];
    if (statuses.includes(sp.status)) {
      where.status = sp.status as Prisma.OrderWhereInput['status'];
    }
  }
  if (sp.paymentStatus) {
    const statuses = [
      'PENDING',
      'PAID',
      'FAILED',
      'REFUNDED',
      'PENDING_ON_DELIVERY',
    ];
    if (statuses.includes(sp.paymentStatus)) {
      where.paymentStatus =
        sp.paymentStatus as Prisma.OrderWhereInput['paymentStatus'];
    }
  }
  if (sp.type && (sp.type === 'B2C' || sp.type === 'B2B')) {
    where.type = sp.type;
  }
  if (sp.paymentMethod) {
    const methods = ['COD', 'PAYMOB_CARD', 'PAYMOB_FAWRY'];
    if (methods.includes(sp.paymentMethod)) {
      where.paymentMethod =
        sp.paymentMethod as Prisma.OrderWhereInput['paymentMethod'];
    }
  }
  // Date range — inclusive of both ends. Accepts `YYYY-MM-DD` from the form.
  if (sp.dateFrom || sp.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (sp.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(sp.dateFrom)) {
      createdAt.gte = new Date(sp.dateFrom + 'T00:00:00Z');
    }
    if (sp.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(sp.dateTo)) {
      // end-of-day inclusive
      createdAt.lte = new Date(sp.dateTo + 'T23:59:59.999Z');
    }
    where.createdAt = createdAt;
  }

  const pageSize = 50;
  const pageNum = Math.max(1, Number(sp.page ?? '1') || 1);
  const skip = (pageNum - 1) * pageSize;

  const [orders, totalCount, couriers] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        orderNumber: true,
        contactName: true,
        contactPhone: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        totalEgp: true,
        createdAt: true,
      },
    }),
    prisma.order.count({ where }),
    prisma.courier.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { nameEn: 'asc' }],
      select: { id: true, nameAr: true, nameEn: true, phone: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const courierOptions: BulkBarCourier[] = couriers.map((c) => ({
    id: c.id,
    label: isAr ? c.nameAr : c.nameEn,
    phone: c.phone,
  }));

  /**
   * Checkbox is only rendered for orders whose current status permits the
   * → HANDED_TO_COURIER transition (CONFIRMED or DELAYED_OR_ISSUE). Other
   * rows show an empty cell so the column alignment stays stable.
   */
  const canBulkHandover = (s: Prisma.OrderWhereInput['status']) =>
    s && typeof s === 'string'
      ? ORDER_STATUS_TRANSITIONS[s]?.includes('HANDED_TO_COURIER')
      : false;

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {isAr ? 'الطلبات' : 'Orders'}
        </h1>
      </div>

      <form method="GET" className="mb-6 grid gap-2 md:grid-cols-4">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder={
            isAr
              ? 'ابحث برقم / اسم / موبايل'
              : 'Search by number / name / phone'
          }
          className="col-span-2 flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
          aria-label={
            isAr ? 'بحث عن طلب' : 'Search orders by number, name, or phone'
          }
        />
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
          aria-label={isAr ? 'فلتر الحالة' : 'Status filter'}
        >
          <option value="">{isAr ? 'كل الحالات' : 'All statuses'}</option>
          {(
            [
              'PENDING_CONFIRMATION',
              'CONFIRMED',
              'HANDED_TO_COURIER',
              'OUT_FOR_DELIVERY',
              'DELIVERED',
              'CANCELLED',
              'RETURNED',
              'DELAYED_OR_ISSUE',
            ] as OrderStatusKey[]
          ).map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <select
          name="paymentStatus"
          defaultValue={sp.paymentStatus ?? ''}
          className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
          aria-label={isAr ? 'فلتر حالة الدفع' : 'Payment status filter'}
        >
          <option value="">{isAr ? 'كل حالات الدفع' : 'All payments'}</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING_ON_DELIVERY">COD Pending</option>
        </select>
        <select
          name="type"
          defaultValue={sp.type ?? ''}
          className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
          aria-label={isAr ? 'نوع العميل' : 'Customer type'}
        >
          <option value="">{isAr ? 'كل الأنواع' : 'All customer types'}</option>
          <option value="B2C">B2C</option>
          <option value="B2B">B2B</option>
        </select>
        <select
          name="paymentMethod"
          defaultValue={sp.paymentMethod ?? ''}
          className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
          aria-label={isAr ? 'طريقة الدفع' : 'Payment method'}
        >
          <option value="">{isAr ? 'كل الطرق' : 'All methods'}</option>
          <option value="COD">{isAr ? 'الدفع عند الاستلام' : 'COD'}</option>
          <option value="PAYMOB_CARD">
            {isAr ? 'بطاقة' : 'Card (Paymob)'}
          </option>
          <option value="PAYMOB_FAWRY">
            {isAr ? 'فوري' : 'Fawry (Paymob)'}
          </option>
        </select>
        <input
          type="date"
          name="dateFrom"
          defaultValue={sp.dateFrom ?? ''}
          className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
          aria-label={isAr ? 'من تاريخ' : 'From date'}
        />
        <input
          type="date"
          name="dateTo"
          defaultValue={sp.dateTo ?? ''}
          className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
          aria-label={isAr ? 'إلى تاريخ' : 'To date'}
        />
        <button
          type="submit"
          className="col-span-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          {isAr ? 'تطبيق الفلاتر' : 'Apply filters'}
        </button>
        <Link
          href="/admin/orders"
          className="col-span-2 rounded-md border bg-background px-3 py-2 text-center text-sm hover:bg-muted"
        >
          {isAr ? 'إلغاء الفلاتر' : 'Clear filters'}
        </Link>
      </form>

      <AdminOrdersBulkBar
        couriers={courierOptions}
        formId={BULK_FORM_ID}
        labels={{
          // Templates use {n} / {s} / {f} placeholders — client interpolates.
          // Functions can't cross the Server → Client Component boundary.
          selectedTemplate: isAr ? 'تم اختيار {n} طلب' : '{n} selected',
          noneSelected: isAr
            ? 'اختر طلبات مؤهلة للتسليم لشركة الشحن'
            : 'Select orders eligible for courier handoff',
          bulkHandoff: isAr
            ? 'تسليم المحدد لشركة الشحن'
            : 'Mark selected as Handed to Courier',
          dialogTitle: isAr
            ? 'تسليم الطلبات المحددة لشركة الشحن'
            : 'Hand selected orders to courier',
          dialogBody: isAr
            ? 'سيتم تطبيق نفس شركة الشحن ورقم البوليصة وتاريخ التسليم المتوقع على كل الطلبات المحددة.'
            : 'The same courier, waybill, and expected delivery date will be applied to every selected order.',
          courier: isAr ? 'شركة الشحن' : 'Courier',
          noCouriers: isAr
            ? 'لا توجد شركات شحن نشطة — أضِف شركة من "شركات الشحن" أولاً'
            : 'No active couriers — add one from the Couriers page first',
          courierPhone: isAr
            ? 'هاتف المندوب (اختياري)'
            : 'Courier agent phone (optional)',
          courierPhoneHelp: isAr
            ? 'يُستخدم بدلاً من الهاتف الافتراضي للشركة'
            : 'Overrides the courier default phone',
          waybill: isAr ? 'رقم البوليصة' : 'Waybill',
          expectedDelivery: isAr ? 'التسليم المتوقع' : 'Expected delivery',
          note: isAr ? 'ملاحظة (اختياري)' : 'Note (optional)',
          notePlaceholder: isAr
            ? 'تُرسل مع رسالة التحديث لكل العملاء المحددين'
            : "Included in every selected customer's status message",
          confirm: isAr ? 'تأكيد التسليم' : 'Confirm handoff',
          cancel: isAr ? 'إلغاء' : 'Cancel',
          resultSuccessTemplate: isAr
            ? 'تم تسليم {n} طلب لشركة الشحن'
            : '{n} orders handed to courier',
          resultPartialTemplate: isAr
            ? 'نجح {s}، فشل {f} — راجع قائمة الطلبات'
            : '{s} succeeded, {f} failed — review the orders list',
          resultAllFailed: isAr
            ? 'تعذّر تسليم أي طلب — راجع السجلات'
            : 'No orders could be handed over — check the logs',
        }}
      />

      <div className="overflow-x-auto rounded-md border bg-background">
        <form id={BULK_FORM_ID} className="hidden" />
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 p-3" aria-hidden />
              <th className="p-3 text-start">#</th>
              <th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th>
              <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
              <th className="p-3 text-start">{isAr ? 'الدفع' : 'Payment'}</th>
              <th className="p-3 text-end">{isAr ? 'الإجمالي' : 'Total'}</th>
              <th className="p-3 text-start">{isAr ? 'تاريخ' : 'Created'}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-muted-foreground"
                >
                  {isAr ? 'لا توجد طلبات بعد.' : 'No orders yet.'}
                </td>
              </tr>
            ) : null}
            {orders.length > 0 ? null : null}
            {orders.map((o) => {
              const eligible = canBulkHandover(o.status);
              return (
                <tr key={o.id} className="border-t">
                  <td className="p-3">
                    {eligible ? (
                      <input
                        type="checkbox"
                        form={BULK_FORM_ID}
                        name="orderIds"
                        value={o.id}
                        aria-label={
                          isAr
                            ? `اختيار الطلب ${o.orderNumber}`
                            : `Select order ${o.orderNumber}`
                        }
                      />
                    ) : null}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="p-3">
                    <span className="block font-medium">{o.contactName}</span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {o.contactPhone}
                    </span>
                  </td>
                  <td className="p-3">
                    {statusLabel(o.status as OrderStatusKey)}
                  </td>
                  <td className="p-3">
                    <span className="block">{o.paymentMethod}</span>
                    <span className="block text-xs text-muted-foreground">
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3 text-end font-mono">
                    {formatEgp(o.totalEgp.toString(), isAr ? 'ar' : 'en')}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {new Date(o.createdAt).toLocaleString(
                      isAr ? 'ar-EG' : 'en-US',
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalCount > pageSize ? (
        <nav
          className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm"
          aria-label={isAr ? 'ترقيم الصفحات' : 'Pagination'}
        >
          <p className="text-muted-foreground">
            {isAr
              ? `الصفحة ${pageNum} من ${totalPages} · ${totalCount} طلب`
              : `Page ${pageNum} of ${totalPages} · ${totalCount} orders`}
          </p>
          <div className="inline-flex gap-2">
            {pageNum > 1 ? (
              <Link
                href={{
                  pathname: '/admin/orders',
                  query: { ...sp, page: String(pageNum - 1) },
                }}
                className="rounded-md border bg-background px-3 py-1.5 hover:bg-muted"
              >
                {isAr ? 'السابق' : 'Previous'}
              </Link>
            ) : null}
            {pageNum < totalPages ? (
              <Link
                href={{
                  pathname: '/admin/orders',
                  query: { ...sp, page: String(pageNum + 1) },
                }}
                className="rounded-md border bg-background px-3 py-1.5 hover:bg-muted"
              >
                {isAr ? 'التالي' : 'Next'}
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
