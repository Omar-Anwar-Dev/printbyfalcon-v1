import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { PrinterModelRowActions } from '@/components/admin/printer-model-row-actions';

export default async function AdminPrinterModelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const t = await getTranslations();
  const isAr = locale === 'ar';

  const models = await prisma.printerModel.findMany({
    include: {
      brand: { select: { nameAr: true, nameEn: true } },
      _count: { select: { compatibilities: true } },
    },
    orderBy: [{ brand: { nameEn: 'asc' } }, { modelName: 'asc' }],
  });

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {t('admin.nav.printerModels')}
        </h1>
        <Button asChild>
          <Link href="/admin/printer-models/new">
            + {t('admin.common.new')}
          </Link>
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-start">
                {t('admin.catalog.products.brand')}
              </th>
              <th className="p-3 text-start">{isAr ? 'الموديل' : 'Model'}</th>
              <th className="p-3 text-start">
                {isAr ? 'منتجات متوافقة' : 'Compatible products'}
              </th>
              <th className="p-3 text-start">{t('admin.common.status')}</th>
              <th className="p-3 text-end">{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-muted-foreground"
                >
                  {t('admin.common.noRows')}
                </td>
              </tr>
            ) : null}
            {models.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-3">
                  {isAr ? m.brand.nameAr : m.brand.nameEn}
                </td>
                <td className="p-3">
                  <Link
                    href={`/admin/printer-models/${m.id}`}
                    className="font-medium hover:underline"
                  >
                    {m.modelName}
                  </Link>
                </td>
                <td className="p-3">{m._count.compatibilities}</td>
                <td className="p-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${m.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="p-3 text-end">
                  <PrinterModelRowActions
                    id={m.id}
                    status={m.status}
                    hasDependents={m._count.compatibilities > 0}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
