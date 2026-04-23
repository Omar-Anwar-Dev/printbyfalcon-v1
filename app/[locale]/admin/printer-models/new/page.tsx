import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth';
import { getBrandOptions } from '@/lib/catalog/admin-options';
import { PrinterModelForm } from '@/components/admin/printer-model-form';

export default async function NewPrinterModelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const t = await getTranslations();
  const brands = await getBrandOptions(locale);
  const isAr = locale === 'ar';

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <h1 className="mb-6 text-2xl font-semibold">
        {isAr ? 'موديل طابعة جديد' : 'New printer model'}
      </h1>
      <PrinterModelForm
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
