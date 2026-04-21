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

  const [productCount, brandCount, categoryCount, lowStock] = await Promise.all(
    [
      prisma.product.count(),
      prisma.brand.count(),
      prisma.category.count(),
      listLowStockProducts(20),
    ],
  );

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t('admin.loginTitle')}</h1>
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
