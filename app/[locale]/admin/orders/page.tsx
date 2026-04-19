import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { formatEgp } from '@/lib/catalog/price';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    paymentStatus?: string;
  }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === 'ar';

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

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
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
  });

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
        />
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">{isAr ? 'كل الحالات' : 'All statuses'}</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="HANDED_TO_COURIER">Handed to Courier</option>
          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          name="paymentStatus"
          defaultValue={sp.paymentStatus ?? ''}
          className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">{isAr ? 'كل حالات الدفع' : 'All payments'}</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING_ON_DELIVERY">COD Pending</option>
        </select>
        <button
          type="submit"
          className="col-span-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          {isAr ? 'بحث' : 'Search'}
        </button>
        <Link
          href="/admin/orders"
          className="col-span-2 rounded-md border bg-background px-3 py-2 text-center text-sm hover:bg-muted"
        >
          {isAr ? 'إلغاء الفلاتر' : 'Clear filters'}
        </Link>
      </form>

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
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
                  colSpan={6}
                  className="p-6 text-center text-muted-foreground"
                >
                  {isAr ? 'لا توجد طلبات بعد.' : 'No orders yet.'}
                </td>
              </tr>
            ) : null}
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
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
                <td className="p-3">{o.status}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
