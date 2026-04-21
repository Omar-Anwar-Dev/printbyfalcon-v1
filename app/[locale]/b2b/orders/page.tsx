import { redirect } from 'next/navigation';
import { requireB2BUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';
import { formatEgp } from '@/lib/catalog/price';
import {
  ORDER_STATUS_LABELS,
  type OrderStatusKey,
} from '@/lib/whatsapp-templates';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: 'ar' | 'en' }>;
  searchParams?: Promise<{ status?: string; page?: string }>;
};

const PAGE_SIZE = 25;

export default async function B2BOrdersPage({ params, searchParams }: Props) {
  const user = await requireB2BUser();
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const isAr = locale === 'ar';

  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);

  const company = await prisma.company.findUnique({
    where: { primaryUserId: user.id },
    select: { id: true },
  });
  if (!company) redirect(`/${locale}`);

  const statusFilter = sp.status;
  const where = {
    companyId: company.id,
    ...(statusFilter ? { status: statusFilter as OrderStatusKey } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalEgp: true,
        createdAt: true,
        contactName: true,
      },
    }),
    prisma.order.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {isAr ? 'طلبات الشركة' : 'Company orders'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? 'كل الطلبات التي أجراها حساب الشركة.'
              : 'All orders placed under this company account.'}
          </p>
        </div>
        <Link
          href="/b2b/profile"
          className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          {isAr ? 'بيانات الشركة' : 'Company profile'}
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-md border bg-background p-8 text-center text-muted-foreground">
          {isAr ? 'لا توجد طلبات بعد.' : 'No orders yet.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase">
                  <th className="px-3 py-2 text-start">
                    {isAr ? 'الطلب' : 'Order'}
                  </th>
                  <th className="px-3 py-2 text-start">
                    {isAr ? 'التاريخ' : 'Date'}
                  </th>
                  <th className="px-3 py-2 text-start">
                    {isAr ? 'مقدّم الطلب' : 'Placed by'}
                  </th>
                  <th className="px-3 py-2 text-start">
                    {isAr ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-3 py-2 text-end">
                    {isAr ? 'الإجمالي' : 'Total'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/account/orders/${o.id}`}
                        className="font-mono text-sm hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString(
                        isAr ? 'ar-EG' : 'en-US',
                      )}
                    </td>
                    <td className="px-3 py-2">{o.contactName}</td>
                    <td className="px-3 py-2">
                      {ORDER_STATUS_LABELS[o.status as OrderStatusKey][locale]}
                    </td>
                    <td className="px-3 py-2 text-end font-mono">
                      {formatEgp(o.totalEgp.toString(), locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
              {page > 1 ? (
                <Link
                  href={{
                    pathname: '/b2b/orders',
                    query: { page: String(page - 1) },
                  }}
                  className="rounded border bg-background px-3 py-1 hover:bg-muted"
                >
                  {isAr ? '→ السابق' : '← Prev'}
                </Link>
              ) : null}
              <span className="text-muted-foreground">
                {isAr
                  ? `صفحة ${page} من ${totalPages}`
                  : `Page ${page} of ${totalPages}`}
              </span>
              {page < totalPages ? (
                <Link
                  href={{
                    pathname: '/b2b/orders',
                    query: { page: String(page + 1) },
                  }}
                  className="rounded border bg-background px-3 py-1 hover:bg-muted"
                >
                  {isAr ? 'التالي ←' : 'Next →'}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
