import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/routing';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { listLowStockProducts } from '@/lib/inventory/low-stock';

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const user = await requireAdmin();
  const t = await getTranslations();
  const { locale } = await params;
  const isAr = locale === 'ar';

  const [
    productCount,
    brandCount,
    categoryCount,
    lowStock,
    pendingB2BApplications,
    pendingB2BConfirmations,
    oldestPendingB2B,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.brand.count(),
    prisma.category.count(),
    listLowStockProducts(20),
    // Sprint 8 S8-D2-T3 — sales rep workload widgets. Only rendered for
    // OWNER / SALES_REP below (OPS don't see these counts).
    prisma.b2BApplication.count({ where: { status: 'PENDING' } }),
    prisma.order.count({
      where: { status: 'PENDING_CONFIRMATION', type: 'B2B' },
    }),
    prisma.order.findFirst({
      where: { status: 'PENDING_CONFIRMATION', type: 'B2B' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ]);

  const showSalesRepWidgets =
    user.adminRole === 'OWNER' || user.adminRole === 'SALES_REP';
  const oldestWaitingHours = oldestPendingB2B
    ? Math.floor(
        (Date.now() - oldestPendingB2B.createdAt.getTime()) / (60 * 60 * 1000),
      )
    : null;

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('admin.loginTitle')}</h1>

      {showSalesRepWidgets ? (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/b2b/pending-confirmation"
            className="group block rounded-lg border-2 border-accent/40 bg-accent/5 p-5 hover:border-accent/70 hover:bg-accent/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {isAr ? 'بانتظار تأكيد المبيعات' : 'Pending confirmation'}
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {pendingB2BConfirmations}
                </p>
                {oldestWaitingHours !== null && oldestWaitingHours > 0 ? (
                  <p
                    className={`mt-1 text-xs ${
                      oldestWaitingHours >= 24
                        ? 'font-semibold text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {isAr
                      ? `أقدم طلب ينتظر: ${oldestWaitingHours} ساعة`
                      : `Oldest waiting: ${oldestWaitingHours}h`}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-accent/10 px-2 py-1 text-xs font-medium text-accent group-hover:bg-accent/20">
                →
              </span>
            </div>
          </Link>

          <Link
            href="/admin/b2b/applications"
            className="group block rounded-lg border-2 border-primary/20 bg-primary/5 p-5 hover:border-primary/40 hover:bg-primary/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {isAr ? 'طلبات تسجيل B2B' : 'Pending B2B applications'}
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {pendingB2BApplications}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isAr
                    ? 'تحقق من المستندات ثم اعتمد'
                    : 'Verify docs then approve'}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary group-hover:bg-primary/20">
                →
              </span>
            </div>
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.nav.products')}</CardTitle>
            <CardDescription>{productCount}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.nav.brands')}</CardTitle>
            <CardDescription>{brandCount}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.nav.categories')}</CardTitle>
            <CardDescription>{categoryCount}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>
              {isAr ? 'تنبيهات المخزون المنخفض' : 'Low-stock alerts'}{' '}
              <span className="ms-2 text-sm font-normal text-muted-foreground">
                ({lowStock.length})
              </span>
            </CardTitle>
            <CardDescription>
              {isAr
                ? 'المنتجات التي رصيدها على حد التنبيه أو أقل.'
                : 'Products at or below their effective low-stock threshold.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? 'لا توجد تنبيهات — كل شيء على ما يرام.'
                  : 'No alerts — inventory looks healthy.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 text-start">
                        {isAr ? 'الكود' : 'SKU'}
                      </th>
                      <th className="py-2 text-start">
                        {isAr ? 'المنتج' : 'Product'}
                      </th>
                      <th className="py-2 text-start">
                        {isAr ? 'المتاح' : 'Available'}
                      </th>
                      <th className="py-2 text-start">
                        {isAr ? 'حد التنبيه' : 'Threshold'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((row) => (
                      <tr key={row.productId} className="border-t">
                        <td className="py-2 font-mono text-xs">{row.sku}</td>
                        <td className="py-2">
                          <Link
                            href={`/admin/inventory/${row.productId}`}
                            className="font-medium hover:underline"
                          >
                            {isAr ? row.nameAr : row.nameEn}
                          </Link>
                        </td>
                        <td
                          className={`py-2 font-medium tabular-nums ${
                            row.currentQty <= 0
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {row.currentQty}
                        </td>
                        <td className="py-2 tabular-nums">
                          {row.effectiveThreshold}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t('auth.signedInAs')} <strong>{user.email}</strong> (
              {user.adminRole}).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
