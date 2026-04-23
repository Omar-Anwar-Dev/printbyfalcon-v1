import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import type { Prisma, RefundDecision } from '@prisma/client';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ decision?: string; stockReleased?: string }>;

export default async function ReturnsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === 'ar';

  const decisionFilter =
    sp.decision && sp.decision !== 'ALL'
      ? (sp.decision as RefundDecision)
      : null;
  const stockReleasedFilter =
    sp.stockReleased === 'YES'
      ? true
      : sp.stockReleased === 'NO'
        ? false
        : null;

  const where: Prisma.ReturnWhereInput = {
    ...(decisionFilter ? { refundDecision: decisionFilter } : {}),
    ...(stockReleasedFilter === true
      ? { stockReleasedAt: { not: null } }
      : stockReleasedFilter === false
        ? { stockReleasedAt: null }
        : {}),
  };

  const returns = await prisma.return.findMany({
    where,
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
    <div className="container-page py-10 md:py-14">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
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

      <form className="mb-4 flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            {isAr ? 'قرار الاسترداد' : 'Refund decision'}
          </label>
          <select
            name="decision"
            defaultValue={decisionFilter ?? 'ALL'}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ALL">{isAr ? 'كل القرارات' : 'All'}</option>
            <option value="PENDING">{isAr ? 'قيد المراجعة' : 'Pending'}</option>
            <option value="APPROVED_CASH">
              {isAr ? 'موافق (نقدي)' : 'Approved (cash)'}
            </option>
            <option value="APPROVED_CARD_MANUAL">
              {isAr ? 'موافق (بطاقة)' : 'Approved (card)'}
            </option>
            <option value="DENIED">{isAr ? 'مرفوض' : 'Denied'}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            {isAr ? 'تم إرجاع المخزون؟' : 'Stock released?'}
          </label>
          <select
            name="stockReleased"
            defaultValue={sp.stockReleased ?? 'ALL'}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ALL">{isAr ? 'الكل' : 'All'}</option>
            <option value="YES">{isAr ? 'نعم' : 'Yes'}</option>
            <option value="NO">{isAr ? 'لا' : 'No'}</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {isAr ? 'تطبيق' : 'Apply'}
          </button>
        </div>
      </form>

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
              <th className="p-3 text-start">{isAr ? 'المخزون' : 'Stock'}</th>
              <th className="p-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
            </tr>
          </thead>
          <tbody>
            {returns.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-6 text-center text-muted-foreground"
                >
                  {isAr ? 'لا توجد إرجاعات بعد.' : 'No returns yet.'}
                </td>
              </tr>
            ) : null}
            {returns.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/20">
                <td className="p-3 font-mono text-xs">
                  <Link
                    href={`/admin/orders/returns/${r.id}`}
                    className="hover:underline"
                  >
                    {r.order.orderNumber}
                  </Link>
                  {r.policyOverride ? (
                    <div className="mt-1 text-[10px] uppercase text-warning">
                      {isAr ? 'تجاوز سياسة' : 'Policy override'}
                    </div>
                  ) : null}
                </td>
                <td className="p-3">{r.order.contactName}</td>
                <td className="max-w-[320px] whitespace-pre-line p-3">
                  {r.reason}
                  {r.overrideReason ? (
                    <div className="mt-1 text-xs text-warning">
                      {isAr ? 'سبب التجاوز:' : 'Override reason:'}{' '}
                      {r.overrideReason}
                    </div>
                  ) : null}
                </td>
                <td className="p-3">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                    {r.refundDecision}
                  </span>
                </td>
                <td className="p-3 text-end font-mono">
                  {r.refundAmountEgp?.toString() ?? '—'}
                </td>
                <td className="p-3 text-xs">
                  {r.stockReleasedAt ? (
                    <span className="rounded bg-success-soft px-2 py-0.5 text-success">
                      {isAr ? 'أُعيد' : 'Released'}
                    </span>
                  ) : (
                    <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
                      —
                    </span>
                  )}
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
