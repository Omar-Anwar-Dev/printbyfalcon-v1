import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getVatRate } from '@/lib/settings/vat';
import { VatRateForm } from '@/components/admin/vat-rate-form';

export const dynamic = 'force-dynamic';

export default async function VatSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER']);
  const { locale } = await params;
  const isAr = locale === 'ar';
  const [vat, exemptCount, exemptProducts] = await Promise.all([
    getVatRate(),
    prisma.product.count({ where: { vatExempt: true } }),
    prisma.product.findMany({
      where: { vatExempt: true, status: 'ACTIVE' },
      orderBy: { nameAr: 'asc' },
      take: 20,
      select: { id: true, sku: true, nameAr: true, nameEn: true },
    }),
  ]);

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <h1 className="mb-2 text-2xl font-semibold">
        {isAr ? 'ضريبة القيمة المضافة' : 'VAT'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {isAr
          ? 'تُطبَّق على المنتجات غير المُعفاة فقط. لتعديل حالة الإعفاء لمنتج محدد، افتح صفحة المنتج من قائمة المنتجات.'
          : 'Applied to non-exempt products only. To flip a product, open it from the products list.'}
      </p>
      <VatRateForm locale={isAr ? 'ar' : 'en'} initial={vat} />

      <section className="mt-8 space-y-3 rounded-md border bg-background p-4">
        <h2 className="text-base font-semibold">
          {isAr
            ? `المنتجات المُعفاة (${exemptCount})`
            : `VAT-exempt products (${exemptCount})`}
        </h2>
        {exemptProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isAr
              ? 'لا توجد منتجات مُعفاة حاليًا.'
              : 'No products are currently marked tax-exempt.'}
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {exemptProducts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/products/${p.id}`}
                  className="underline hover:no-underline"
                >
                  {isAr ? p.nameAr : p.nameEn}{' '}
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.sku}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {exemptCount > exemptProducts.length ? (
          <p className="text-xs text-muted-foreground">
            {isAr
              ? `+ ${exemptCount - exemptProducts.length} منتج آخر معفى`
              : `+ ${exemptCount - exemptProducts.length} more exempt`}
          </p>
        ) : null}
      </section>
    </div>
  );
}
