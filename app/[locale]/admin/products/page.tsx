import { getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ProductRowActions } from '@/components/admin/product-row-actions';
import { BulkArchiveBar } from '@/components/admin/bulk-archive-bar';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import type { Prisma } from '@prisma/client';

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    brand?: string;
    category?: string;
    authenticity?: string;
  }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations();
  const isAr = locale === 'ar';

  const where: Prisma.ProductWhereInput = {};
  const q = sp.q?.trim();
  if (q) {
    where.OR = [
      { sku: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
      { nameAr: { contains: q } },
    ];
  }
  if (sp.status === 'ACTIVE' || sp.status === 'ARCHIVED') {
    where.status = sp.status;
  }
  if (sp.brand) where.brandId = sp.brand;
  if (sp.category) where.categoryId = sp.category;
  if (sp.authenticity === 'GENUINE' || sp.authenticity === 'COMPATIBLE') {
    where.authenticity = sp.authenticity;
  }

  const [products, brands, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: { select: { nameAr: true, nameEn: true } },
        category: { select: { nameAr: true, nameEn: true } },
        _count: { select: { images: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.brand.findMany({ orderBy: { nameEn: 'asc' } }),
    prisma.category.findMany({ orderBy: { nameEn: 'asc' } }),
  ]);

  return (
    <div className="container-page py-10 md:py-14">
      <AdminPageHeader
        overline={isAr ? 'الكتالوج' : 'Catalog'}
        title={t('admin.catalog.products.title')}
        subtitle={
          isAr
            ? 'كل منتجات المتجر — فلترة بالعلامة والفئة والنوع، وأرشفة جماعية.'
            : 'All products — filter by brand/category/authenticity, bulk archive.'
        }
        actions={
          <Button asChild variant="accent" size="sm">
            <Link href="/admin/products/new">
              <Plus className="me-1.5 h-4 w-4" strokeWidth={2} aria-hidden />
              {t('admin.common.new')}
            </Link>
          </Button>
        }
      />
      <form method="GET" className="mb-6 grid gap-2 md:grid-cols-5">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('admin.common.search')}
          className="col-span-2 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('admin.common.status')}</option>
          <option value="ACTIVE">{t('admin.common.active')}</option>
          <option value="ARCHIVED">{t('admin.common.archived')}</option>
        </select>
        <select
          name="brand"
          defaultValue={sp.brand ?? ''}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('admin.catalog.products.brand')}</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {isAr ? b.nameAr : b.nameEn}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={sp.category ?? ''}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('admin.catalog.products.category')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {isAr ? c.nameAr : c.nameEn}
            </option>
          ))}
        </select>
        <select
          name="authenticity"
          defaultValue={sp.authenticity ?? ''}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('admin.catalog.products.authenticity')}</option>
          <option value="GENUINE">{t('admin.catalog.products.genuine')}</option>
          <option value="COMPATIBLE">
            {t('admin.catalog.products.compatible')}
          </option>
        </select>
        <div className="col-span-2 flex gap-2">
          <Button type="submit" size="sm">
            {t('admin.common.search')}
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/admin/products">{t('admin.common.cancel')}</Link>
          </Button>
        </div>
      </form>
      <BulkArchiveBar
        confirmLabel={
          isAr ? 'أرشفة المنتجات المحددة؟' : 'Archive the selected products?'
        }
        bulkArchiveLabel={isAr ? 'أرشفة المحدد' : 'Archive selected'}
        noneSelectedLabel={
          isAr ? 'لم يتم تحديد منتجات' : 'No products selected'
        }
      />

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 p-3">
                <span className="sr-only">{isAr ? 'تحديد' : 'Select'}</span>
              </th>
              <th className="p-3 text-start">
                {t('admin.catalog.products.sku')}
              </th>
              <th className="p-3 text-start">{isAr ? 'الاسم' : 'Name'}</th>
              <th className="p-3 text-start">
                {t('admin.catalog.products.brand')}
              </th>
              <th className="p-3 text-start">
                {t('admin.catalog.products.category')}
              </th>
              <th className="p-3 text-start">
                {t('admin.catalog.products.basePrice')}
              </th>
              <th className="p-3 text-start">{t('admin.common.status')}</th>
              <th className="p-3 text-end">{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-6 text-center text-muted-foreground"
                >
                  {t('admin.common.noRows')}
                </td>
              </tr>
            ) : null}
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <input
                    type="checkbox"
                    name="ids"
                    value={p.id}
                    form="admin-bulk-archive-form"
                    aria-label={isAr ? `تحديد ${p.sku}` : `Select ${p.sku}`}
                    disabled={p.status !== 'ACTIVE'}
                    className="h-4 w-4 accent-primary disabled:opacity-40"
                  />
                </td>
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="font-medium hover:underline"
                  >
                    {isAr ? p.nameAr : p.nameEn}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {isAr ? p.nameEn : p.nameAr}
                  </div>
                </td>
                <td className="p-3">
                  {isAr ? p.brand.nameAr : p.brand.nameEn}
                </td>
                <td className="p-3">
                  {isAr ? p.category.nameAr : p.category.nameEn}
                </td>
                <td className="p-3 font-mono text-xs">
                  {Number(p.basePriceEgp).toFixed(2)}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${p.status === 'ACTIVE' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-3 text-end">
                  <ProductRowActions
                    id={p.id}
                    status={p.status}
                    labels={{
                      archive: t('admin.common.archive'),
                      unarchive: t('admin.common.unarchive'),
                      delete: t('admin.common.delete'),
                      confirmArchive: t('admin.common.confirmArchive'),
                      confirmDelete: t('admin.common.confirmDelete'),
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
