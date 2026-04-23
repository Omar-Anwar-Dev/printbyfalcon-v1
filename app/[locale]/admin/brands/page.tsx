import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { BrandRowActions } from '@/components/admin/brand-row-actions';

export default async function AdminBrandsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const t = await getTranslations();
  const isAr = locale === 'ar';

  const brands = await prisma.brand.findMany({
    orderBy: { nameEn: 'asc' },
    include: {
      _count: { select: { products: true, printerModels: true } },
    },
  });

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('admin.catalog.brands.title')}
        </h1>
        <Button asChild>
          <Link href="/admin/brands/new">+ {t('admin.common.new')}</Link>
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-start">
            <tr>
              <th className="p-3 text-start">{isAr ? 'الاسم' : 'Name'}</th>
              <th className="p-3 text-start">
                {t('admin.catalog.brands.slug')}
              </th>
              <th className="p-3 text-start">{t('admin.nav.products')}</th>
              <th className="p-3 text-start">{t('admin.common.status')}</th>
              <th className="p-3 text-end">{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {brands.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-muted-foreground"
                >
                  {t('admin.common.noRows')}
                </td>
              </tr>
            ) : null}
            {brands.map((brand) => {
              const hasDependents =
                brand._count.products > 0 || brand._count.printerModels > 0;
              return (
                <tr key={brand.id} className="border-t">
                  <td className="p-3">
                    <Link
                      href={`/admin/brands/${brand.id}`}
                      className="font-medium hover:underline"
                    >
                      {isAr ? brand.nameAr : brand.nameEn}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {isAr ? brand.nameEn : brand.nameAr}
                    </div>
                  </td>
                  <td className="p-3 font-mono text-xs">{brand.slug}</td>
                  <td className="p-3">{brand._count.products}</td>
                  <td className="p-3">
                    <StatusPill status={brand.status} />
                  </td>
                  <td className="p-3 text-end">
                    <BrandRowActions
                      id={brand.id}
                      status={brand.status}
                      hasDependents={hasDependents}
                      labels={{
                        archive: t('admin.common.archive'),
                        unarchive: t('admin.common.unarchive'),
                        delete: t('admin.common.delete'),
                        confirmArchive: t('admin.common.confirmArchive'),
                        confirmDelete: t('admin.common.confirmDelete'),
                        hasDependentsHelp: t('admin.common.hasDependentsHelp'),
                      }}
                    />
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

function StatusPill({ status }: { status: 'ACTIVE' | 'ARCHIVED' }) {
  const cls =
    status === 'ACTIVE'
      ? 'bg-success-soft text-success'
      : 'bg-warning-soft text-warning';
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
