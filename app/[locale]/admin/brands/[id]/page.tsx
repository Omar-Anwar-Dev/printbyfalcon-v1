import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { BrandForm } from '@/components/admin/brand-form';

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { id } = await params;
  const t = await getTranslations();

  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) notFound();

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <h1 className="mb-6 text-2xl font-semibold">
        {t('admin.catalog.brands.editTitle')}
      </h1>
      <BrandForm
        id={brand.id}
        initial={{
          nameAr: brand.nameAr,
          nameEn: brand.nameEn,
          slug: brand.slug,
          status: brand.status,
        }}
        cancelHref="/admin/brands"
        labels={{
          nameAr: t('admin.catalog.brands.nameAr'),
          nameEn: t('admin.catalog.brands.nameEn'),
          slug: t('admin.catalog.brands.slug'),
          slugHelp: t('admin.catalog.brands.slugHelp'),
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
