import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import {
  CategoryForm,
  type CategoryOption,
} from '@/components/admin/category-form';
import {
  buildTree,
  flattenTree,
  type FlatCategory,
} from '@/lib/catalog/category-tree';

type Row = {
  id: string;
  parentId: string | null;
  position: number;
  nameAr: string;
  nameEn: string;
};

export default async function NewCategoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const t = await getTranslations();
  const isAr = locale === 'ar';

  const rows = await prisma.category.findMany({
    select: {
      id: true,
      parentId: true,
      position: true,
      nameAr: true,
      nameEn: true,
    },
  });
  const flat: FlatCategory<Row>[] = rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    position: r.position,
    nameAr: r.nameAr,
    nameEn: r.nameEn,
  }));
  const ordered = flattenTree(buildTree(flat));
  const parentOptions: CategoryOption[] = ordered.map((n) => ({
    id: n.id,
    label: `${'— '.repeat(n.depth)}${isAr ? n.nameAr : n.nameEn}`,
  }));

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <h1 className="mb-6 text-2xl font-semibold">
        {t('admin.catalog.categories.newTitle')}
      </h1>
      <CategoryForm
        parentOptions={parentOptions}
        cancelHref="/admin/categories"
        labels={{
          nameAr: t('admin.catalog.categories.nameAr'),
          nameEn: t('admin.catalog.categories.nameEn'),
          slug: t('admin.catalog.categories.slug'),
          parent: t('admin.catalog.categories.parent'),
          noParent: t('admin.catalog.categories.noParent'),
          position: t('admin.catalog.categories.position'),
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
