/**
 * Public catalog read models. SSR pages call these helpers so the DB query
 * shape lives in one place. All functions filter to `status: ACTIVE` for
 * public surfaces; admin uses Prisma directly with full access.
 */
import { prisma } from '@/lib/db';
import { productImageUrl } from '@/lib/storage/paths';
import { getStockStatus, type StockStatus } from '@/lib/catalog/stock';
import { getGlobalLowStockThreshold } from '@/lib/settings/inventory';

export type ProductSort = 'newest' | 'price-asc' | 'price-desc';

const PAGE_SIZE = 20;

export type ProductListItem = {
  id: string;
  slug: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  basePriceEgp: string;
  authenticity: 'GENUINE' | 'COMPATIBLE';
  primaryImageUrl: string | null;
  brand: { nameAr: string; nameEn: string; slug: string };
  category: { nameAr: string; nameEn: string; slug: string };
  stockStatus: StockStatus;
};

function orderByFor(sort: ProductSort) {
  switch (sort) {
    case 'price-asc':
      return { basePriceEgp: 'asc' as const };
    case 'price-desc':
      return { basePriceEgp: 'desc' as const };
    case 'newest':
    default:
      return { createdAt: 'desc' as const };
  }
}

export async function listActiveProducts({
  page = 1,
  sort = 'newest',
  categoryId,
}: {
  page?: number;
  sort?: ProductSort;
  categoryId?: string;
} = {}): Promise<{
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const skip = (Math.max(1, page) - 1) * PAGE_SIZE;

  const where = {
    status: 'ACTIVE' as const,
    ...(categoryId ? { categoryId } : {}),
    brand: { status: 'ACTIVE' as const },
    category: { status: 'ACTIVE' as const },
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
