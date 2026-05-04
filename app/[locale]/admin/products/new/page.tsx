import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth';
import {
  getBrandOptions,
  getCategoryOptions,
} from '@/lib/catalog/admin-options';
import { ProductForm } from '@/components/admin/product-form';

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const t = await getTranslations();
  const isAr = locale === 'ar';

  const [brands, categories] = await Promise.all([
    getBrandOptions(locale),
    getCategoryOptions(locale),
  ]);

  return (
    <div className="container-page max-w-5xl py-10 md:py-14">
      <h1 className="mb-6 text-2xl font-semibold">
        {t('admin.catalog.products.newTitle')}
      </h1>
      <ProductForm
        brands={brands}
        categories={categories}
        cancelHref="/admin/products"
        labels={{
          sku: t('admin.catalog.products.sku'),
          brand: t('admin.catalog.products.brand'),
          category: t('admin.catalog.products.category'),
          authenticity: t('admin.catalog.products.authenticity'),
          genuine: t('admin.catalog.products.genuine'),
          compatible: t('admin.catalog.products.compatible'),
          condition: isAr ? 'حالة المنتج' : 'Condition',
          conditionNew: isAr ? 'جديد' : 'New',
          conditionUsed: isAr ? 'مستعمل' : 'Used',
          warranty: isAr ? 'الضمان' : 'Warranty',
          warrantyHelp: isAr
            ? 'مثلاً: ضمان سنة، ضمان 6 شهور، بدون ضمان'
            : 'e.g. 1-year warranty, 6 months, no warranty',
          conditionNote: isAr
            ? 'ملاحظة الحالة (للمستعمل)'
            : 'Condition note (for used)',
          conditionNoteHelp: isAr
            ? 'مثلاً: 9/10، استخدام شهرين، علبة أصلية'
            : 'e.g. 9/10, 2 months use, original packaging',
          nameAr: t('admin.catalog.products.nameAr'),
          nameEn: t('admin.catalog.products.nameEn'),
          descriptionAr: t('admin.catalog.products.descriptionAr'),
          descriptionEn: t('admin.catalog.products.descriptionEn'),
          specs: t('admin.catalog.products.specs'),
          specsHelp: t('admin.catalog.products.specsHelp'),
          specsAr: isAr ? 'المواصفات بالعربي' : 'Specs (AR)',
          specsEn: isAr ? 'المواصفات بالإنجليزي' : 'Specs (EN)',
          specsLegacy: isAr ? 'مواصفات قديمة' : 'Legacy specs',
          addSpec: t('admin.catalog.products.addSpec'),
          basePrice: t('admin.catalog.products.basePrice'),
          vatExempt: t('admin.catalog.products.vatExempt'),
          returnable: t('admin.catalog.products.returnable'),
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
