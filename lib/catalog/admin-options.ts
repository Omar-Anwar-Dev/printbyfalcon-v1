/**
 * Server-only helpers that build `<select>` option lists for admin forms
 * (brand picker + flattened/indented category picker).
 */
import { prisma } from '@/lib/db';
import {
  buildTree,
  flattenTree,
  type FlatCategory,
} from '@/lib/catalog/category-tree';

type CategoryRow = {
  id: string;
  parentId: string | null;
  position: number;
  nameAr: string;
  nameEn: string;
  status: 'ACTIVE' | 'ARCHIVED';
};

export async function getBrandOptions(locale: string) {
  const rows = await prisma.brand.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { nameEn: 'asc' },
  });
  const isAr = locale === 'ar';
  return rows.map((b) => ({
    id: b.id,
    label: isAr ? b.nameAr : b.nameEn,
  }));
}

export async function getCategoryOptions(
  locale: string,
): Promise<Array<{ id: string; label: string; disabled?: boolean }>> {
  const rows = await prisma.category.findMany({
    select: {
      id: true,
      parentId: true,
      position: true,
      nameAr: true,
      nameEn: true,
      status: true,
    },
  });
  const isAr = locale === 'ar';
  const flat: FlatCategory<CategoryRow>[] = rows.map((r) => ({ ...r }));
  const ordered = flattenTree(buildTree(flat));
  return ordered.map((n) => ({
    id: n.id,
    label: `${'— '.repeat(n.depth)}${isAr ? n.nameAr : n.nameEn}${n.status === 'ARCHIVED' ? ' (archived)' : ''}`,
    disabled: n.status === 'ARCHIVED',
  }));
}
