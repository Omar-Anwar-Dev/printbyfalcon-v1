import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import {
  getBrandOptions,
  getCategoryOptions,
} from '@/lib/catalog/admin-options';
import { ProductForm } from '@/components/admin/product-form';
import { ProductImageManager } from '@/components/admin/product-image-manager';
import {
  CompatibilityPicker,
  type CompatibilityOption,
} from '@/components/admin/compatibility-picker';
import { productImageUrl } from '@/lib/storage/paths';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { id, locale } = await params;
  const t = await getTranslations();

  const [product, brands, categories, printerModels] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        compatibilities: { select: { printerModelId: true } },
      },
    }),
    getBrandOptions(locale),
    getCategoryOptions(locale),
    prisma.printerModel.findMany({
      where: { status: 'ACTIVE' },
      include: { brand: { select: { nameAr: true, nameEn: true } } },
      orderBy: [{ brand: { nameEn: 'asc' } }, { modelName: 'asc' }],
    }),
  ]);

  if (!product) notFound();

  const isAr = locale === 'ar';
  const compatOptions: CompatibilityOption[] = printerModels.map((pm) => ({
    id: pm.id,
    brandLabel: isAr ? pm.brand.nameAr : pm.brand.nameEn,
    modelName: pm.modelName,
  }));
  const selectedCompatIds = product.compatibilities.map(
    (c) => c.printerModelId,
  );

  // Narrow `specs` — Prisma returns `Prisma.JsonValue`, but the Server Action
  // validates via zod.record(string,string), so any non-object or non-string
  // values get dropped in the form's row initializer.
  const specsObj =
    product.specs &&
    typeof product.specs === 'object' &&
    !Array.isArray(product.specs)
      ? (Object.fromEntries(
          Object.entries(product.specs as Record<string, unknown>)
            .filter(([, v]) => typeof v === 'string')
            .map(([k, v]) => [k, v as string]),
        ) as Record<string, string>)
      : {};

  const initialImages = product.images.map((img) => ({
    id: img.id,
    url: productImageUrl(product.id, 'thumb', img.filename),
    altAr: img.altAr,
    altEn: img.altEn,
  }));

  return (
    <main className="container-page max-w-5xl space-y-10 py-8">
      <div>
        <h1 className="mb-6 text-2xl font-semibold">
          {t('admin.catalog.products.editTitle')}
        </h1>
        <ProductForm
          id={product.id}
          initial={{
            sku: product.sku,
            brandId: product.brandId,
            categoryId: product.categoryId,
            slug: product.slug,
            nameAr: product.nameAr,
            nameEn: product.nameEn,
            descriptionAr: product.descriptionAr,
            descriptionEn: product.descriptionEn,
            specs: specsObj,
            basePriceEgp: Number(product.basePriceEgp),
            vatExempt: product.vatExempt,
            returnable: product.returnable,
            authenticity: product.authenticity,
            status: product.status,
          }}
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
            nameAr: t('admin.catalog.products.nameAr'),
            nameEn: t('admin.catalog.products.nameEn'),
            descriptionAr: t('admin.catalog.products.descriptionAr'),
            descriptionEn: t('admin.catalog.products.descriptionEn'),
            specs: t('admin.catalog.products.specs'),
            specsHelp: t('admin.catalog.products.specsHelp'),
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

      <ProductImageManager
        productId={product.id}
        initial={initialImages}
        labels={{
          images: t('admin.catalog.products.images'),
          noImages: t('admin.catalog.products.noImages'),
          uploadImage: t('admin.catalog.products.uploadImage'),
          uploadHint: t('admin.catalog.products.uploadHint'),
          altAr: t('admin.catalog.products.altAr'),
          altEn: t('admin.catalog.products.altEn'),
          delete: t('admin.common.delete'),
          moveUp: t('admin.catalog.products.moveUp'),
          moveDown: t('admin.catalog.products.moveDown'),
          confirmDelete: t('admin.common.confirmDelete'),
          save: t('admin.common.save'),
        }}
      />

      <CompatibilityPicker
        productId={product.id}
        options={compatOptions}
        initialSelectedIds={selectedCompatIds}
        labels={{
          title: isAr ? 'الطابعات المتوافقة' : 'Compatible printers',
          search: isAr ? 'بحث...' : 'Search...',
          save: t('admin.common.save'),
          saved: t('admin.common.saved'),
          empty: isAr
            ? 'أضف موديلات طابعات من قائمة "موديلات الطابعات" أولاً.'
            : 'Add printer models in the "Printer Models" list first.',
        }}
      />
    </main>
  );
}
