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

/**
 * Lookup data for the JSON-paste quick-fill panel (Sprint 16). Returns the
 * minimum needed to resolve a free-form `brand` / `category` value (id, slug,
 * or name in either locale) back to a row id.
 */
export type ResolveItem = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
};

export async function getBrandResolveData(): Promise<ResolveItem[]> {
  const rows = await prisma.brand.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true, nameAr: true, nameEn: true },
    orderBy: { nameEn: 'asc' },
  });
  return rows;
}

export async function getCategoryResolveData(): Promise<ResolveItem[]> {
  const rows = await prisma.category.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true, nameAr: true, nameEn: true },
    orderBy: { nameEn: 'asc' },
  });
  return rows;
}

/**
 * PrinterModel doesn't have bilingual `nameAr/nameEn` like Brand/Category —
 * just `modelName` plus the related Brand. To make the JSON-paste resolver
 * (which expects ResolveItem) accept all the natural ways a user might
 * type a printer model, we expose two synthetic name forms per row:
 *   - bare modelName ("LaserJet Pro M404dn")
 *   - "Brand modelName" ("HP LaserJet Pro M404dn") in both languages
 * Plus the slug. Empty array if there are no PrinterModels yet.
 */
export type PrinterModelResolveItem = ResolveItem & {
  modelName: string;
  brandNameAr: string;
  brandNameEn: string;
};

export async function getPrinterModelResolveData(): Promise<
  PrinterModelResolveItem[]
> {
  const rows = await prisma.printerModel.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      slug: true,
      modelName: true,
      brand: { select: { nameAr: true, nameEn: true } },
    },
    orderBy: [{ brand: { nameEn: 'asc' } }, { modelName: 'asc' }],
  });
  return rows.map((pm) => ({
    id: pm.id,
    slug: pm.slug,
    modelName: pm.modelName,
    brandNameAr: pm.brand.nameAr,
    brandNameEn: pm.brand.nameEn,
    // ResolveItem name fields → composite "Brand ModelName" so the existing
    // resolveOption substring/exact matcher in product-json-paste.tsx Just
    // Works for queries like "HP M404dn" without touching that helper.
    nameAr: `${pm.brand.nameAr} ${pm.modelName}`,
    nameEn: `${pm.brand.nameEn} ${pm.modelName}`,
  }));
}
