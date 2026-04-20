import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ReturnsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const returns = await prisma.return.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      order: {
        select: { id: true, orderNumber: true, contactName: true },
      },
      items: { select: { qty: true } },
    },
  });

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {isAr ? 'سجل الإرجاعات' : 'Returns log'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? 'يتم إدخال الإرجاعات يدوياً من صفحة الطلب. لا يوجد استرداد تلقائي.'
              : 'Returns are entered manually from the order detail page. No automatic refund processing.'}
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          {isAr ? 'كل الطلبات' : 'All orders'}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-start">{isAr ? 'رقم الطلب' : 'Order'}</th>
              <th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th>
              <th className="p-3 text-start">{isAr ? 'السبب' : 'Reason'}</th>
              <th className="p-3 text-start">
                {isAr ? 'قرار الاسترداد' : 'Refund decision'}
              </th>
              <th className="p-3 text-end">
                {isAr ? 'المبلغ (جنيه)' : 'Amount (EGP)'}
              </th>
              <th className="p-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
            </tr>
          </thead>
          <tbody>
            {returns.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-muted-foreground"
                >
                  {isAr ? 'لا توجد إرجاعات بعد.' : 'No returns yet.'}
                </td>
              </tr>
            ) : null}
            {returns.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono text-xs">
                  <Link
                    href={`/admin/orders/${r.order.id}`}
                    className="hover:underline"
                  >
                    {r.order.orderNumber}
                  </Link>
                </td>
                <td className="p-3">{r.order.contactName}</td>
                <td className="max-w-[320px] whitespace-pre-line p-3">
                  {r.reason}
                </td>
                <td className="p-3">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                    {r.refundDecision}
                  </span>
                </td>
                <td className="p-3 text-end font-mono">
                  {r.refundAmountEgp?.toString() ?? '—'}
                </td>
                <td className="p-3 font-mono text-xs">
                  {new Date(r.createdAt).toLocaleString(
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
