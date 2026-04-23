import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';
import {
  getGlobalLowStockThreshold,
  effectiveLowStockThreshold,
} from '@/lib/settings/inventory';
import { InventoryRowActions } from '@/components/admin/inventory-row-actions';
import { SkuThresholdForm } from '@/components/admin/sku-threshold-form';

const MOVEMENT_LABELS_AR: Record<string, string> = {
  RECEIVE: 'استلام',
  SALE: 'بيع',
  ADJUST: 'تعديل',
  RETURN: 'مرتجع',
  RESERVATION_RELEASE: 'إلغاء حجز',
};
const MOVEMENT_LABELS_EN: Record<string, string> = {
  RECEIVE: 'Receive',
  SALE: 'Sale',
  ADJUST: 'Adjust',
  RETURN: 'Return',
  RESERVATION_RELEASE: 'Reservation release',
};

function formatDate(d: Date, isAr: boolean): string {
  return new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

export default async function AdminInventoryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale, id } = await params;
  const isAr = locale === 'ar';

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      sku: true,
      nameAr: true,
      nameEn: true,
      inventory: {
        select: { currentQty: true, lowStockThreshold: true, updatedAt: true },
      },
    },
  });
  if (!product) notFound();

  const globalDefault = await getGlobalLowStockThreshold();
  const perSku = product.inventory?.lowStockThreshold ?? null;
  const effective = effectiveLowStockThreshold(perSku, globalDefault);
  const currentQty = product.inventory?.currentQty ?? 0;

  const movements = await prisma.inventoryMovement.findMany({
    where: { productId: id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      type: true,
      qtyDelta: true,
      reason: true,
      refId: true,
      createdAt: true,
      actorId: true,
    },
  });

  const actorIds = Array.from(
    new Set(movements.map((m) => m.actorId).filter((x): x is string => !!x)),
  );
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const movementLabels = isAr ? MOVEMENT_LABELS_AR : MOVEMENT_LABELS_EN;
  const name = isAr ? product.nameAr : product.nameEn;
  const otherName = isAr ? product.nameEn : product.nameAr;

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-4 text-sm">
        <Link href="/admin/inventory" className="hover:underline">
          ← {isAr ? 'المخزون' : 'Inventory'}
        </Link>
      </div>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {name}
          </h1>
          <div className="text-sm text-muted-foreground">
            <span className="font-mono">{product.sku}</span>
            <span className="mx-2">·</span>
            <span>{otherName}</span>
          </div>
        </div>
        <InventoryRowActions
          productId={product.id}
          currentQty={currentQty}
          productLabel={name}
          locale={locale}
        />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border bg-background p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {isAr ? 'الرصيد الحالي' : 'Current qty'}
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">
            {currentQty}
          </div>
        </div>
        <div className="rounded-md border bg-background p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {isAr ? 'حد التنبيه الفعلي' : 'Effective threshold'}
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">
            {effective}
          </div>
          <div className="text-xs text-muted-foreground">
            {perSku === null
              ? isAr
                ? `الافتراضي العام (${globalDefault})`
                : `global default (${globalDefault})`
              : isAr
                ? 'تخصيص يدوي'
                : 'per-SKU override'}
          </div>
        </div>
        <SkuThresholdForm
          productId={product.id}
          currentValue={perSku}
          globalDefault={globalDefault}
          locale={locale}
        />
      </div>

      <h2 className="mb-3 text-lg font-semibold">
        {isAr ? 'سجل الحركات' : 'Stock movements'}
      </h2>
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-start">{isAr ? 'التاريخ' : 'When'}</th>
              <th className="p-3 text-start">{isAr ? 'النوع' : 'Type'}</th>
              <th className="p-3 text-start">{isAr ? 'التغيير' : 'Delta'}</th>
              <th className="p-3 text-start">{isAr ? 'السبب' : 'Reason'}</th>
              <th className="p-3 text-start">{isAr ? 'المرجع' : 'Ref'}</th>
              <th className="p-3 text-start">{isAr ? 'المستخدم' : 'Actor'}</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-muted-foreground"
                >
                  {isAr ? 'لا توجد حركات بعد' : 'No movements yet'}
                </td>
              </tr>
            ) : null}
            {movements.map((m) => {
              const actor = m.actorId ? actorMap.get(m.actorId) : null;
              return (
                <tr key={m.id} className="border-t">
                  <td className="p-3 tabular-nums">
                    {formatDate(m.createdAt, isAr)}
                  </td>
                  <td className="p-3">{movementLabels[m.type] ?? m.type}</td>
                  <td
                    className={`p-3 font-medium tabular-nums ${
                      m.qtyDelta > 0
                        ? 'text-success'
                        : m.qtyDelta < 0
                          ? 'text-error'
                          : ''
                    }`}
                  >
                    {m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta}
                  </td>
                  <td className="whitespace-pre-wrap p-3">{m.reason ?? '—'}</td>
                  <td className="p-3 font-mono text-xs">{m.refId ?? '—'}</td>
                  <td className="p-3">
                    {actor ? actor.name || actor.email || actor.id : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
