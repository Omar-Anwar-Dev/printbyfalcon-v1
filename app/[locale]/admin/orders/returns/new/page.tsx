import { notFound, redirect } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import {
  canOverrideReturnPolicy,
  checkReturnPolicy,
  getReturnPolicy,
} from '@/lib/returns/policy';
import { RecordReturnForm } from '@/components/admin/record-return-form';

type SearchParams = Promise<{ orderId?: string }>;

export default async function RecordReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const actor = await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === 'ar';

  if (!sp.orderId) redirect(`/${locale}/admin/orders`);

  const order = await prisma.order.findUnique({
    where: { id: sp.orderId },
    select: {
      id: true,
      orderNumber: true,
      deliveredAt: true,
      totalEgp: true,
      status: true,
      type: true,
      items: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          skuSnapshot: true,
          nameArSnapshot: true,
          nameEnSnapshot: true,
          qty: true,
          unitPriceEgp: true,
          product: { select: { returnable: true } },
        },
      },
    },
  });
  if (!order) notFound();

  const policy = await getReturnPolicy();
  const check = checkReturnPolicy(policy, {
    orderDeliveredAt: order.deliveredAt,
    orderTotalEgp: Number(order.totalEgp),
    items: order.items.map((oi) => ({
      sku: oi.skuSnapshot,
      returnable: oi.product?.returnable ?? false,
    })),
  });
  const canOverride = canOverrideReturnPolicy(policy, actor.adminRole ?? null);

  const items = order.items.map((oi) => ({
    id: oi.id,
    sku: oi.skuSnapshot,
    name: isAr ? oi.nameArSnapshot : oi.nameEnSnapshot,
    qty: oi.qty,
    unitPrice: Number(oi.unitPriceEgp),
    returnable: oi.product?.returnable ?? false,
  }));

  return (
    <div className="container max-w-3xl py-8">
      <Link
        href={`/admin/orders/${order.id}`}
        className="mb-4 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← {isAr ? 'رجوع للطلب' : 'Back to order'}
      </Link>
      <h1 className="mb-1 text-2xl font-semibold">
        {isAr ? 'تسجيل استرجاع جديد' : 'Record a new return'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr ? `للطلب ` : 'For order '}
        <span className="font-mono">{order.orderNumber}</span>
      </p>

      <RecordReturnForm
        orderId={order.id}
        items={items}
        policyCheck={check}
        canOverride={canOverride}
        isAr={isAr}
      />
    </div>
  );
}
