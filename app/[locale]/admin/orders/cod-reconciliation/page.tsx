import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';

/**
 * S9-D4-T5 COD reconciliation report — lists orders whose paymentStatus is
 * PENDING_ON_DELIVERY, grouped by courier so ops can tick off cash when it
 * comes back. Filter by "since date" for daily/weekly runs.
 */
export default async function CodReconciliationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ since?: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const { since } = await searchParams;
  const isAr = locale === 'ar';

  const sinceDate = since ? new Date(since) : null;
  const where = {
    paymentMethod: 'COD' as const,
    paymentStatus: 'PENDING_ON_DELIVERY' as const,
    ...(sinceDate && !isNaN(sinceDate.getTime())
      ? { createdAt: { gte: sinceDate } }
      : {}),
  };

  const rows = await prisma.order.findMany({
    where,
    orderBy: [{ courierId: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      orderNumber: true,
      totalEgp: true,
      codFeeEgp: true,
      shippingEgp: true,
      status: true,
      createdAt: true,
      courier: { select: { nameAr: true, nameEn: true } },
      contactName: true,
    },
  });

  const grouped = new Map<
    string,
    { total: number; count: number; orders: typeof rows }
  >();
  for (const r of rows) {
    const courierName = r.courier
      ? isAr
        ? r.courier.nameAr
        : r.courier.nameEn
      : isAr
        ? 'بدون مندوب'
        : 'No courier yet';
    const key = courierName;
    const bucket = grouped.get(key) ?? { total: 0, count: 0, orders: [] };
    bucket.total += Number(r.totalEgp);
    bucket.count += 1;
    bucket.orders.push(r);
    grouped.set(key, bucket);
  }
  const grandTotal = rows.reduce((acc, r) => acc + Number(r.totalEgp), 0);

  return (
    <div className="container-page max-w-5xl py-10 md:py-14">
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'تسوية الدفع عند الاستلام' : 'COD reconciliation'}
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {isAr
          ? 'قائمة الطلبات التي لم يتم تحصيل قيمتها نقدًا حتى الآن — مقسّمة حسب المندوب.'
          : 'Orders awaiting cash collection, grouped by courier. Mark each as paid from its detail page.'}
      </p>

      <form method="get" className="mb-4 flex items-end gap-2">
        <label className="grow text-sm">
          <span className="block text-xs text-muted-foreground">
            {isAr ? 'من تاريخ (اختياري)' : 'Since date (optional)'}
          </span>
          <input
            type="date"
            name="since"
            defaultValue={since ?? ''}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          {isAr ? 'تصفية' : 'Filter'}
        </button>
      </form>

      <div className="mb-6 rounded-md border bg-muted/30 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {isAr ? 'الإجمالي المستحق' : 'Outstanding total'}
          </span>
          <span className="font-semibold">
            {grandTotal.toLocaleString(isAr ? 'ar-EG' : 'en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            {isAr ? 'ج.م' : 'EGP'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{isAr ? 'عدد الطلبات' : 'Orders'}</span>
          <span>{rows.length}</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border bg-background p-6 text-center text-sm text-muted-foreground">
          {isAr
            ? 'لا توجد طلبات معلّقة للتحصيل.'
            : 'No pending-collection orders.'}
        </p>
      ) : (
        Array.from(grouped.entries()).map(([name, bucket]) => (
          <section key={name} className="mb-6 rounded-md border bg-background">
            <header className="flex items-center justify-between border-b bg-muted/20 p-3">
              <h2 className="font-semibold">{name}</h2>
              <span className="text-sm">
                {bucket.count} {isAr ? 'طلب' : 'orders'} —{' '}
                {bucket.total.toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {isAr ? 'ج.م' : 'EGP'}
              </span>
            </header>
            <ul className="divide-y">
              {bucket.orders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between p-3 text-sm"
                >
                  <span>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-mono font-medium underline hover:no-underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <span className="ms-2 text-muted-foreground">
                      {o.contactName}
                    </span>
                    <span className="ms-2 text-xs text-muted-foreground">
                      {o.status}
                    </span>
                  </span>
                  <span className="font-medium">
                    {Number(o.totalEgp).toLocaleString(
                      isAr ? 'ar-EG' : 'en-US',
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}{' '}
                    {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
