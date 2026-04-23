import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  buildTree,
  flattenTree,
  type FlatCategory,
} from '@/lib/catalog/category-tree';
import { CategoryRowActions } from '@/components/admin/category-row-actions';

type CategoryRow = {
  id: string;
  parentId: string | null;
  position: number;
  nameAr: string;
  nameEn: string;
  slug: string;
  status: 'ACTIVE' | 'ARCHIVED';
  productCount: number;
};

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin(['OWNER', 'OPS']);
  const { locale } = await params;
  const t = await getTranslations();
  const isAr = locale === 'ar';

  const rows = await prisma.category.findMany({
    include: { _count: { select: { products: true, children: true } } },
    orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { nameEn: 'asc' }],
  });

  const flat: FlatCategory<CategoryRow>[] = rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    position: r.position,
    nameAr: r.nameAr,
    nameEn: r.nameEn,
    slug: r.slug,
    status: r.status,
    productCount: r._count.products,
  }));
  const tree = buildTree(flat);
  const ordered = flattenTree(tree);

  const hasDependents = (row: CategoryRow): boolean =>
    row.productCount > 0 ||
    rows.some(
      (r) => r.parentId === row.id, // has any child
    );

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('admin.catalog.categories.title')}
        </h1>
        <Button asChild>
          <Link href="/admin/categories/new">+ {t('admin.common.new')}</Link>
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-start">{isAr ? 'الاسم' : 'Name'}</th>
              <th className="p-3 text-start">
                {t('admin.catalog.categories.slug')}
              </th>
              <th className="p-3 text-start">{t('admin.nav.products')}</th>
              <th className="p-3 text-start">{t('admin.common.status')}</th>
              <th className="p-3 text-end">{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {ordered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-muted-foreground"
                >
                  {t('admin.common.noRows')}
                </td>
              </tr>
            ) : null}
            {ordered.map((n) => (
              <tr key={n.id} className="border-t">
                <td
                  className="p-3"
                  style={{ paddingInlineStart: 12 + n.depth * 20 }}
                >
                  <Link
                    href={`/admin/categories/${n.id}`}
                    className="font-medium hover:underline"
                  >
                    {isAr ? n.nameAr : n.nameEn}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {isAr ? n.nameEn : n.nameAr}
                  </div>
                </td>
                <td className="p-3 font-mono text-xs">{n.slug}</td>
                <td className="p-3">{n.productCount}</td>
                <td className="p-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${n.status === 'ACTIVE' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}
                  >
                    {n.status}
                  </span>
                </td>
                <td className="p-3 text-end">
                  <CategoryRowActions
                    id={n.id}
                    status={n.status}
                    hasDependents={hasDependents(n)}
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
