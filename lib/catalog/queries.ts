/**
 * Public catalog read models. SSR pages call these helpers so the DB query
 * shape lives in one place. All functions filter to `status: ACTIVE` for
 * public surfaces; admin uses Prisma directly with full access.
 */
import { prisma } from '@/lib/db';
import type { ProductCondition } from '@prisma/client';
import { productImageUrl } from '@/lib/storage/paths';
import { getStockStatus, type StockStatus } from '@/lib/catalog/stock';
import { getGlobalLowStockThreshold } from '@/lib/settings/inventory';

/// PR 3 — `recommended` is the new default. It orders by the precomputed
/// `popularityScore` (DESC) and falls back to `createdAt` (DESC) on ties.
/// Products with no orders get score 0, so on a cold dataset
/// `recommended` and `newest` produce identical orderings; once the
/// nightly recompute job has run, popular SKUs rise to the top.
export type ProductSort = 'recommended' | 'newest' | 'price-asc' | 'price-desc';

export const DEFAULT_PRODUCT_SORT: ProductSort = 'recommended';

const PAGE_SIZE = 20;

export type ProductListItem = {
  id: string;
  slug: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  basePriceEgp: string;
  authenticity: 'GENUINE' | 'COMPATIBLE';
  /// Sprint 14 — NEW or USED. Drives the "مستعمل" badge on cards/detail.
  condition: ProductCondition;
  primaryImageUrl: string | null;
  brand: { nameAr: string; nameEn: string; slug: string };
  category: { nameAr: string; nameEn: string; slug: string };
  stockStatus: StockStatus;
};

// Exported for unit-testing the sort selection without needing a DB.
export function orderByFor(sort: ProductSort) {
  switch (sort) {
    case 'price-asc':
      return [{ basePriceEgp: 'asc' as const }];
    case 'price-desc':
      return [{ basePriceEgp: 'desc' as const }];
    case 'newest':
      return [{ createdAt: 'desc' as const }];
    case 'recommended':
    default:
      // Compound order matches the @@index([popularityScore Desc, createdAt Desc])
      // so Postgres serves it from the index without a sort node.
      return [
        { popularityScore: 'desc' as const },
        { createdAt: 'desc' as const },
      ];
  }
}

export async function listActiveProducts({
  page = 1,
  sort = DEFAULT_PRODUCT_SORT,
  categoryId,
  categoryIds,
  brandSlug,
  categorySlug,
  condition,
}: {
  page?: number;
  sort?: ProductSort;
  categoryId?: string;
  /// When set, products from any of these category IDs are returned. Used
  /// by the public category page to aggregate the parent + every descendant
  /// (so opening a parent shows everything under it, not only direct children).
  /// Mutually exclusive with `categoryId`; if both are passed, `categoryIds`
  /// wins.
  categoryIds?: string[];
  brandSlug?: string;
  categorySlug?: string;
  /// Sprint 14 — filter by condition (NEW / USED). Undefined = no filter.
  condition?: ProductCondition;
} = {}): Promise<{
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const skip = (Math.max(1, page) - 1) * PAGE_SIZE;

  const categoryFilter =
    categoryIds && categoryIds.length > 0
      ? { categoryId: { in: categoryIds } }
      : categoryId
        ? { categoryId }
        : {};

  const where = {
    status: 'ACTIVE' as const,
    ...categoryFilter,
    ...(condition ? { condition } : {}),
    ...(brandSlug
      ? { brand: { slug: brandSlug, status: 'ACTIVE' as const } }
      : { brand: { status: 'ACTIVE' as const } }),
    ...(categorySlug
      ? { category: { slug: categorySlug, status: 'ACTIVE' as const } }
      : { category: { status: 'ACTIVE' as const } }),
  };

  const [total, rows, globalThreshold] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: orderByFor(sort),
      skip,
      take: PAGE_SIZE,
      include: {
        brand: { select: { nameAr: true, nameEn: true, slug: true } },
        category: { select: { nameAr: true, nameEn: true, slug: true } },
        images: {
          orderBy: { position: 'asc' },
          take: 1,
          select: { filename: true },
        },
        inventory: {
          select: { currentQty: true, lowStockThreshold: true },
        },
      },
    }),
    getGlobalLowStockThreshold(),
  ]);

  const items: ProductListItem[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    basePriceEgp: p.basePriceEgp.toString(),
    authenticity: p.authenticity,
    condition: p.condition,
    primaryImageUrl: p.images[0]
      ? productImageUrl(p.id, 'medium', p.images[0].filename)
      : null,
    brand: p.brand,
    category: p.category,
    stockStatus: getStockStatus(
      { status: p.status, inventory: p.inventory },
      globalThreshold,
    ),
  }));

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export type ProductDetail = Awaited<ReturnType<typeof getActiveProductBySlug>>;

export async function getActiveProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      status: 'ACTIVE',
      brand: { status: 'ACTIVE' },
      category: { status: 'ACTIVE' },
    },
    include: {
      brand: { select: { nameAr: true, nameEn: true, slug: true } },
      category: { select: { nameAr: true, nameEn: true, slug: true } },
      images: { orderBy: { position: 'asc' } },
      compatibilities: {
        where: { printerModel: { status: 'ACTIVE' } },
        include: {
          printerModel: {
            include: {
              brand: { select: { nameAr: true, nameEn: true } },
            },
          },
        },
        orderBy: [
          { printerModel: { brand: { nameEn: 'asc' } } },
          { printerModel: { modelName: 'asc' } },
        ],
      },
    },
  });
  if (!product) return null;
  return {
    ...product,
    images: product.images.map((img) => ({
      id: img.id,
      altAr: img.altAr,
      altEn: img.altEn,
      thumb: productImageUrl(product.id, 'thumb', img.filename),
      medium: productImageUrl(product.id, 'medium', img.filename),
      original: productImageUrl(product.id, 'original', img.filename),
    })),
    compatiblePrinters: product.compatibilities.map((c) => ({
      id: c.printerModel.id,
      slug: c.printerModel.slug,
      modelName: c.printerModel.modelName,
      brandAr: c.printerModel.brand.nameAr,
      brandEn: c.printerModel.brand.nameEn,
    })),
  };
}

/**
 * Consumables (toner / ink / cartridges) that are explicitly marked
 * compatible with the PrinterModel the given printer Product represents.
 *
 * Returns an empty array when the printer Product has no `printerModelId`
 * link OR when no ProductCompatibility row points at that PrinterModel.
 * Bounded by `take` (default 8) so it can be embedded in a related-section
 * grid without paginating.
 */
export async function listConsumablesForPrinter(
  printerProductId: string,
  take = 8,
): Promise<ProductListItem[]> {
  const printer = await prisma.product.findUnique({
    where: { id: printerProductId },
    select: { printerModelId: true },
  });
  if (!printer?.printerModelId) return [];

  const [rows, globalThreshold] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        brand: { status: 'ACTIVE' },
        category: { status: 'ACTIVE' },
        compatibilities: { some: { printerModelId: printer.printerModelId } },
      },
      orderBy: [{ authenticity: 'asc' }, { createdAt: 'desc' }],
      take,
      include: {
        brand: { select: { nameAr: true, nameEn: true, slug: true } },
        category: { select: { nameAr: true, nameEn: true, slug: true } },
        images: {
          orderBy: { position: 'asc' },
          take: 1,
          select: { filename: true },
        },
        inventory: {
          select: { currentQty: true, lowStockThreshold: true },
        },
      },
    }),
    getGlobalLowStockThreshold(),
  ]);

  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    basePriceEgp: p.basePriceEgp.toString(),
    authenticity: p.authenticity,
    condition: p.condition,
    primaryImageUrl: p.images[0]
      ? productImageUrl(p.id, 'medium', p.images[0].filename)
      : null,
    brand: p.brand,
    category: p.category,
    stockStatus: getStockStatus(
      { status: p.status, inventory: p.inventory },
      globalThreshold,
    ),
  }));
}

/**
 * Alternative COMPATIBLE consumables that share at least one PrinterModel
 * with the given product. Intended for the "بدائل متوافقة" section under a
 * GENUINE consumable's detail page — the customer landed on a genuine
 * cartridge and we surface the cheaper compatible options that fit the same
 * printers.
 *
 * Caller is expected to invoke this only on GENUINE consumables; for safety
 * we still return [] when the source product has no compatibility links.
 */
export async function listAlternativeCompatibleConsumables(
  productId: string,
  take = 8,
): Promise<ProductListItem[]> {
  const links = await prisma.productCompatibility.findMany({
    where: { productId },
    select: { printerModelId: true },
  });
  if (links.length === 0) return [];
  const printerModelIds = links.map((l) => l.printerModelId);

  const [rows, globalThreshold] = await Promise.all([
    prisma.product.findMany({
      where: {
        id: { not: productId },
        status: 'ACTIVE',
        authenticity: 'COMPATIBLE',
        brand: { status: 'ACTIVE' },
        category: { status: 'ACTIVE' },
        compatibilities: { some: { printerModelId: { in: printerModelIds } } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        brand: { select: { nameAr: true, nameEn: true, slug: true } },
        category: { select: { nameAr: true, nameEn: true, slug: true } },
        images: {
          orderBy: { position: 'asc' },
          take: 1,
          select: { filename: true },
        },
        inventory: {
          select: { currentQty: true, lowStockThreshold: true },
        },
      },
    }),
    getGlobalLowStockThreshold(),
  ]);

  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    basePriceEgp: p.basePriceEgp.toString(),
    authenticity: p.authenticity,
    condition: p.condition,
    primaryImageUrl: p.images[0]
      ? productImageUrl(p.id, 'medium', p.images[0].filename)
      : null,
    brand: p.brand,
    category: p.category,
    stockStatus: getStockStatus(
      { status: p.status, inventory: p.inventory },
      globalThreshold,
    ),
  }));
}

export async function getActiveCategoryBySlug(slug: string) {
  const category = await prisma.category.findFirst({
    where: { slug, status: 'ACTIVE' },
    include: {
      children: {
        where: { status: 'ACTIVE' },
        orderBy: { position: 'asc' },
        select: { id: true, slug: true, nameAr: true, nameEn: true },
      },
      parent: {
        select: { id: true, slug: true, nameAr: true, nameEn: true },
      },
    },
  });
  return category;
}

export async function listActiveCategories() {
  return prisma.category.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { nameEn: 'asc' }],
    select: {
      id: true,
      parentId: true,
      position: true,
      slug: true,
      nameAr: true,
      nameEn: true,
    },
  });
}
