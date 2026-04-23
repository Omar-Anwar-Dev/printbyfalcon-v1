import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ReturnDecisionPanel } from '@/components/admin/return-decision-panel';

export const dynamic = 'force-dynamic';

export default async function ReturnDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale, id } = await params;
  const isAr = locale === 'ar';

  const ret = await prisma.return.findUnique({
    where: { id },
    include: {
      order: {
        select: { id: true, orderNumber: true, contactName: true, type: true },
      },
      items: {
        include: {
          orderItem: {
            select: {
              id: true,
              skuSnapshot: true,
              nameArSnapshot: true,
              nameEnSnapshot: true,
              unitPriceEgp: true,
            },
          },
        },
      },
    },
  });
  if (!ret) notFound();

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <Link
        href="/admin/orders/returns"
        className="mb-4 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← {isAr ? 'سجل الإرجاعات' : 'Back to returns log'}
      </Link>
      <h1 className="mb-1 text-2xl font-semibold">
        {isAr ? 'تفاصيل الاسترجاع' : 'Return details'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        <Link
          href={`/admin/orders/${ret.order.id}`}
          className="font-mono hover:underline"
        >
          {ret.order.orderNumber}
        </Link>{' '}
        · {ret.order.contactName}
      </p>

      {ret.policyOverride ? (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
          <strong>{isAr ? 'تجاوز السياسة:' : 'Policy override:'}</strong>{' '}
          {ret.overrideReason}
        </div>
      ) : null}

      <section className="mb-6 rounded-md border bg-background p-5">
        <h2 className="mb-2 text-lg font-semibold">
          {isAr ? 'السبب' : 'Reason'}
        </h2>
        <p className="whitespace-pre-line text-sm">{ret.reason}</p>
      </section>

      <section className="mb-6 rounded-md border bg-background p-5">
        <h2 className="mb-3 text-lg font-semibold">
          {isAr ? 'الأصناف المُرجعة' : 'Returned items'}
        </h2>
        <ul className="divide-y">
          {ret.items.map((ri) => (
            <li key={ri.id} className="flex justify-between gap-3 py-2 text-sm">
              <div>
                <div className="font-medium">
                  {isAr
                    ? ri.orderItem.nameArSnapshot
                    : ri.orderItem.nameEnSnapshot}
                </div>
                <div
                  className="font-mono text-xs text-muted-foreground"
                  dir="ltr"
                >
                  {ri.orderItem.skuSnapshot}
                </div>
              </div>
              <div className="text-end text-sm">
                <div>
                  {isAr ? 'الكمية:' : 'Qty:'} {ri.qty}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Number(ri.orderItem.unitPriceEgp).toFixed(2)}{' '}
                  {isAr ? 'ج.م' : 'EGP'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ReturnDecisionPanel
        returnId={ret.id}
        currentDecision={ret.refundDecision}
        currentAmount={ret.refundAmountEgp ? Number(ret.refundAmountEgp) : null}
        currentNote={ret.note}
        stockReleasedAt={ret.stockReleasedAt}
        isAr={isAr}
      />
    </div>
  );
}
