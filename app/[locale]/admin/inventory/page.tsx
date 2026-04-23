import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';
import {
  getGlobalLowStockThreshold,
  effectiveLowStockThreshold,
} from '@/lib/settings/inventory';
import { InventoryRowActions } from '@/components/admin/inventory-row-actions';
import { AdminPageHeader } from '@/components/admin/admin-page-header';

const PAGE_SIZE = 50;

function parsePage(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? '1'), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function AdminInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === 'ar';
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const lowOnly = sp.lowOnly === '1';
  const page = parsePage(sp.page);
  const skip = (page - 1) * PAGE_SIZE;

  const globalDefault = await getGlobalLowStockThreshold();

  const where = {
    status: 'ACTIVE' as const,
    ...(q
      ? {
          OR: [
            { sku: { contains: q, mode: 'insensitive' as const } },
            { nameAr: { contains: q, mode: 'insensitive' as const } },
            { nameEn: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        sku: true,
        nameAr: true,
        nameEn: true,
        inventory: {
          select: { currentQty: true, lowStockThreshold: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  type Row = {
    id: string;
    sku: string;
    name: string;
    otherName: string;
    currentQty: number;
    perSkuThreshold: number | null;
    effectiveThreshold: number;
    state: 'OUT' | 'LOW' | 'OK';
  };

  const allRows: Row[] = products.map((p) => {
    const currentQty = p.inventory?.currentQty ?? 0;
    const perSku = p.inventory?.lowStockThreshold ?? null;
    const effective = effectiveLowStockThreshold(perSku, globalDefault);
    const state: Row['state'] =
      currentQty <= 0 ? 'OUT' : currentQty <= effective ? 'LOW' : 'OK';
    return {
      id: p.id,
      sku: p.sku,
      name: isAr ? p.nameAr : p.nameEn,
      otherName: isAr ? p.nameEn : p.nameAr,
      currentQty,
      perSkuThreshold: perSku,
      effectiveThreshold: effective,
      state,
    };
  });
  const rows = lowOnly ? allRows.filter((r) => r.state !== 'OK') : allRows;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function buildHref(
    overrides: Record<string, string | number | undefined>,
  ): string {
    const sp2 = new URLSearchParams();
    if (q) sp2.set('q', q);
    if (lowOnly) sp2.set('lowOnly', '1');
    if (page > 1) sp2.set('page', String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === '' || v === 0) sp2.delete(k);
      else sp2.set(k, String(v));
    }
    const qs = sp2.toString();
    return `/admin/inventory${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="container-page py-10 md:py-14">
      <AdminPageHeader
        overline={isAr ? 'العمليات' : 'Operations'}
        title={isAr ? 'المخزون' : 'Inventory'}
        subtitle={
          isAr
            ? `الحد الافتراضي للتنبيه: ${globalDefault} وحدة. استلم كميات، عدّل الحدود، وراقب المنخفض.`
            : `Global low-stock threshold: ${globalDefault} units. Receive stock, tune thresholds, watch low inventory.`
        }
      />

      <form
        method="get"
        action={`/${locale}/admin/inventory`}
        className="mb-4 flex flex-wrap items-center gap-3"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={isAr ? 'بحث بالاسم أو الكود…' : 'Search SKU or name…'}
          className="h-9 min-w-56 rounded-md border bg-background px-3 text-sm"
        />
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="lowOnly"
            value="1"
            defaultChecked={lowOnly}
          />
          {isAr ? 'مخزون منخفض فقط' : 'Low stock only'}
        </label>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {isAr ? 'تطبيق' : 'Apply'}
        </button>
      </form>

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-start">{isAr ? 'الكود' : 'SKU'}</th>
              <th className="p-3 text-start">{isAr ? 'المنتج' : 'Product'}</th>
              <th className="p-3 text-start">
                {isAr ? 'المتاح' : 'Available'}
              </th>
              <th className="p-3 text-start">
                {isAr ? 'حد التنبيه' : 'Low-stock at'}
              </th>
              <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
              <th className="p-3 text-end">{isAr ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-muted-foreground"
                >
                  {isAr ? 'لا توجد منتجات مطابقة' : 'No matching products'}
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono text-xs">{r.sku}</td>
                <td className="p-3">
                  <Link
                    href={`/admin/products/${r.id}`}
                    className="font-medium hover:underline"
                  >
                    {r.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {r.otherName}
                  </div>
                </td>
                <td className="p-3 tabular-nums">{r.currentQty}</td>
                <td className="p-3 tabular-nums">
                  {r.effectiveThreshold}
                  {r.perSkuThreshold === null ? (
                    <span className="ms-1 text-xs text-muted-foreground">
                      ({isAr ? 'افتراضي' : 'global'})
                    </span>
                  ) : null}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      r.state === 'OUT'
                        ? 'bg-error-soft text-error'
                        : r.state === 'LOW'
                          ? 'bg-warning-soft text-warning'
                          : 'bg-success-soft text-success'
                    }`}
                  >
                    {r.state === 'OUT'
                      ? isAr
                        ? 'نفد المخزون'
                        : 'Out'
                      : r.state === 'LOW'
                        ? isAr
                          ? 'منخفض'
                          : 'Low'
                        : isAr
                          ? 'متوفر'
                          : 'OK'}
                  </span>
                </td>
                <td className="p-3 text-end">
                  <InventoryRowActions
                    productId={r.id}
                    currentQty={r.currentQty}
                    productLabel={r.name}
                    locale={locale}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isAr
              ? `صفحة ${page} من ${totalPages} · ${totalCount} منتج`
              : `Page ${page} of ${totalPages} · ${totalCount} products`}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={buildHref({ page: page - 1 })}
                className="rounded-md border px-3 py-1.5"
              >
                {isAr ? 'السابق' : 'Prev'}
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={buildHref({ page: page + 1 })}
                className="rounded-md border px-3 py-1.5"
              >
                {isAr ? 'التالي' : 'Next'}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
