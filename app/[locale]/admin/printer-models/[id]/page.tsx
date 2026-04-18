import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getBrandOptions } from '@/lib/catalog/admin-options';
import { PrinterModelForm } from '@/components/admin/printer-model-form';

export default async function EditPrinterModelPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { id, locale } = await params;
  const t = await getTranslations();
  const isAr = locale === 'ar';

  const [pm, brands] = await Promise.all([
    prisma.printerModel.findUnique({ where: { id } }),
    getBrandOptions(locale),
  ]);
  if (!pm) notFound();

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-semibold">
        {isAr ? 'تعديل موديل الطابعة' : 'Edit printer model'}
      </h1>
      <PrinterModelForm
        id={pm.id}
        initial={{
          brandId: pm.brandId,
          modelName: pm.modelName,
          slug: pm.slug,
          status: pm.status,
        }}
        brands={brands}
        cancelHref="/admin/printer-models"
        labels={{
          brand: t('admin.catalog.products.brand'),
          modelName: isAr ? 'اسم الموديل' : 'Model name',
          slug: t('admin.catalog.brands.slug'),
          status: t('admin.common.status'),
          active: t('admin.common.active'),
          archived: t('admin.common.archived'),
          save: t('admin.common.save'),
          cancel: t('admin.common.cancel'),
        }}
      />
    </div>
  );
}
