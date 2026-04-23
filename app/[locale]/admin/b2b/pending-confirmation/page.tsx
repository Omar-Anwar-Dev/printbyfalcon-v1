/**
 * Sprint 8 S8-D2-T1 — Pending-Confirmation queue.
 *
 * Lists every B2B order in PENDING_CONFIRMATION (awaiting the sales rep's
 * Confirm action). Ordered oldest-first so the SLA window is visually clear.
 * Role: OWNER + SALES_REP. OPS deliberately omitted — this is rep territory.
 */
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: 'ar' | 'en' }>;
};

export default async function AdminPendingConfirmationPage({ params }: Props) {
  await requireAdmin(['OWNER', 'SALES_REP']);
  const { locale } = await params;
  const isAr = locale === 'ar';

  const orders = await prisma.order.findMany({
    where: { status: 'PENDING_CONFIRMATION', type: 'B2B' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      orderNumber: true,
      contactName: true,
      contactPhone: true,
      placedByName: true,
      poReference: true,
      totalEgp: true,
      createdAt: true,
      company: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          pricingTier: { select: { code: true } },
        },
      },
      _count: { select: { items: true } },
    },
    take: 200,
  });

  const t = isAr
    ? {
        title: 'طلبات بانتظار تأكيد المبيعات',
        subtitle:
          'كل طلب هنا قدّمته شركة B2B عن طريق "إرسال الطلب للمراجعة" ومستني تأكيد رسمي من ممثل المبيعات.',
        empty: 'مفيش طلبات حاليًا بانتظار التأكيد.',
        columns: {
          order: 'رقم الطلب',
          company: 'الشركة',
          placedBy: 'وضعه',
          po: 'PO',
          items: 'عدد الأصناف',
          total: 'الإجمالي',
          waiting: 'وقت الانتظار',
          action: '',
        },
        hoursSuffix: 'ساعة',
        minutesSuffix: 'دقيقة',
        open: 'افتح الطلب',
      }
    : {
        title: 'Pending Confirmation queue',
        subtitle:
          'B2B orders submitted for review. Each needs a sales rep to Confirm.',
        empty: 'Nothing pending right now.',
        columns: {
          order: 'Order #',
          company: 'Company',
          placedBy: 'Placed by',
          po: 'PO',
          items: 'Items',
          total: 'Total',
          waiting: 'Waiting',
          action: '',
        },
        hoursSuffix: 'h',
        minutesSuffix: 'm',
        open: 'Open order',
      };

  function formatWaiting(createdAt: Date): string {
    const mins = Math.round((Date.now() - createdAt.getTime()) / 60000);
    if (mins < 60) return `${mins} ${t.minutesSuffix}`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0
      ? `${hrs}${t.hoursSuffix} ${rem}${t.minutesSuffix}`
      : `${hrs} ${t.hoursSuffix}`;
  }

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          {t.empty}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-start">{t.columns.order}</th>
                <th className="px-3 py-2 text-start">{t.columns.company}</th>
                <th className="px-3 py-2 text-start">{t.columns.placedBy}</th>
                <th className="px-3 py-2 text-start">{t.columns.po}</th>
                <th className="px-3 py-2 text-end">{t.columns.items}</th>
                <th className="px-3 py-2 text-end">{t.columns.total}</th>
                <th className="px-3 py-2 text-end">{t.columns.waiting}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const companyName = isAr
                  ? o.company?.nameAr
                  : (o.company?.nameEn ?? o.company?.nameAr);
                const waitingMs = Date.now() - o.createdAt.getTime();
                const overSla = waitingMs > 24 * 60 * 60 * 1000;
                return (
                  <tr
                    key={o.id}
                    className={
                      overSla
                        ? 'border-t bg-destructive/5'
                        : 'border-t hover:bg-muted/30'
                    }
                  >
                    <td className="px-3 py-2 font-mono">{o.orderNumber}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{companyName ?? '—'}</span>
                        {o.company?.pricingTier.code ? (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {o.company.pricingTier.code}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">{o.placedByName ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {o.poReference ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-end">{o._count.items}</td>
                    <td className="px-3 py-2 text-end">
                      {Number(o.totalEgp).toLocaleString('en-US')}
                    </td>
                    <td
                      className={`px-3 py-2 text-end ${overSla ? 'font-semibold text-destructive' : ''}`}
                    >
                      {formatWaiting(o.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-end">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        locale={locale}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                      >
                        {t.open}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
