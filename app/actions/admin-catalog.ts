'use server';

/**
 * Admin catalog Server Actions — brand, category, product, and product-image
 * CRUD. All gated on OWNER + OPS roles per ADR-016 (Sales Rep is read-only).
 * Mutations write to `AuditLog` so future v1.1 audit viewer has full history.
 *
 * Deletion follows the 2-tier pattern from Sprint 2 kickoff:
 *   - Archive (soft): sets status=ARCHIVED. Always safe. Reversible.
 *   - Hard delete: only when 0 dependent rows exist; otherwise returns
 *     an error and the admin must reassign first.
 */
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { uniqueSlug } from '@/lib/catalog/slug';
import {
  updateProductSearchVector,
  updateSearchVectorsForBrand,
} from '@/lib/catalog/search-vector';
import { logger } from '@/lib/logger';
import {
  deleteProductImageDir,
  deleteProductImageFiles,
  processProductImage,
} from '@/lib/storage/images';
import {
  brandSchema,
  categorySchema,
  printerModelSchema,
  productImageUpdateSchema,
  productSchema,
  type BrandInput,
  type CategoryInput,
  type PrinterModelInput,
  type ProductImageUpdateInput,
  type ProductInput,
} from '@/lib/validation/catalog';
import { toLocalizedIssues } from '@/lib/validation/error-map';
import type { AdminRole, CatalogStatus } from '@prisma/client';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = {
  ok: false;
  errorKey: string;
  fieldErrors?: { path: (string | number)[]; key: string }[];
};
type ActionResult<T> = ActionOk<T> | ActionErr;

const CATALOG_ROLES: AdminRole[] = ['OWNER', 'OPS'];

async function requireCatalogAdmin() {
  return requireAdmin(CATALOG_ROLES);
}

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      before: before as never,
      after: after as never,
    },
  });
}

function revalidateStorefront() {
  // Catalog changes invalidate every public catalog route + home.
  revalidatePath('/', 'layout');
}

// ---------- BRANDS ----------

export async function createBrandAction(
  input: BrandInput,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireCatalogAdmin();
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const slug = await uniqueSlug(
    parsed.data.slug ?? parsed.data.nameEn,
    async (candidate) =>
      (await prisma.brand.count({ where: { slug: candidate } })) > 0,
  );

  const brand = await prisma.brand.create({
    data: {
      nameAr: parsed.data.nameAr,
      nameEn: parsed.data.nameEn,
      slug,
      status: parsed.data.status,
    },
  });
  await audit(admin.id, 'catalog.brand.create', 'Brand', brand.id, null, brand);
  revalidateStorefront();
  return { ok: true, data: { id: brand.id } };
}

export async function updateBrandAction(
  id: string,
  input: BrandInput,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }
  const before = await prisma.brand.findUnique({ where: { id } });
  if (!before) return { ok: false, errorKey: 'catalog.brand.not_found' };

  const slug =
    parsed.data.slug && parsed.data.slug !== before.slug
      ? await uniqueSlug(
          parsed.data.slug,
          async (candidate) =>
            (await prisma.brand.count({
              where: { slug: candidate, NOT: { id } },
            })) > 0,
        )
      : before.slug;

  const after = await prisma.brand.update({
    where: { id },
    data: {
      nameAr: parsed.data.nameAr,
      nameEn: parsed.data.nameEn,
      slug,
      status: parsed.data.status,
    },
  });
  await audit(admin.id, 'catalog.brand.update', 'Brand', id, before, after);
  // Brand names are indexed in each product's searchVector (weight B) — if
  // either name changed, every product in this brand needs its vector rebuilt.
  if (
    before.nameAr !== parsed.data.nameAr ||
    before.nameEn !== parsed.data.nameEn
  ) {
    await updateSearchVectorsForBrand(id);
  }
  revalidateStorefront();
  return { ok: true, data: null };
}

export async function archiveBrandAction(
  id: string,
): Promise<ActionResult<null>> {
  return setBrandStatus(id, 'ARCHIVED');
}
export async function unarchiveBrandAction(
  id: string,
): Promise<ActionResult<null>> {
  return setBrandStatus(id, 'ACTIVE');
}
async function setBrandStatus(
  id: string,
  status: CatalogStatus,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const before = await prisma.brand.findUnique({ where: { id } });
  if (!before) return { ok: false, errorKey: 'catalog.brand.not_found' };
  const after = await prisma.brand.update({ where: { id }, data: { status } });
  await audit(
    admin.id,
    status === 'ARCHIVED' ? 'catalog.brand.archive' : 'catalog.brand.unarchive',
    'Brand',
    id,
    before,
    after,
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

export async function deleteBrandAction(
  id: string,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const [before, productCount, printerCount] = await Promise.all([
    prisma.brand.findUnique({ where: { id } }),
    prisma.product.count({ where: { brandId: id } }),
    prisma.printerModel.count({ where: { brandId: id } }),
  ]);
  if (!before) return { ok: false, errorKey: 'catalog.brand.not_found' };
  if (productCount > 0 || printerCount > 0) {
    return { ok: false, errorKey: 'catalog.brand.has_dependents' };
  }
  await prisma.brand.delete({ where: { id } });
  await audit(admin.id, 'catalog.brand.delete', 'Brand', id, before, null);
  revalidateStorefront();
  return { ok: true, data: null };
}

// ---------- CATEGORIES ----------

export async function createCategoryAction(
  input: CategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireCatalogAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  // If parentId supplied, verify it exists. Self-parenting is blocked on update only.
  if (parsed.data.parentId) {
    const parentExists = await prisma.category.count({
      where: { id: parsed.data.parentId },
    });
    if (parentExists === 0) {
      return { ok: false, errorKey: 'catalog.category.parent_not_found' };
    }
  }

  const slug = await uniqueSlug(
    parsed.data.slug ?? parsed.data.nameEn,
    async (candidate) =>
      (await prisma.category.count({ where: { slug: candidate } })) > 0,
  );

  const category = await prisma.category.create({
    data: {
      nameAr: parsed.data.nameAr,
      nameEn: parsed.data.nameEn,
      slug,
      parentId: parsed.data.parentId ?? null,
      position: parsed.data.position,
      status: parsed.data.status,
    },
  });
  await audit(
    admin.id,
    'catalog.category.create',
    'Category',
    category.id,
    null,
    category,
  );
  revalidateStorefront();
  return { ok: true, data: { id: category.id } };
}

export async function updateCategoryAction(
  id: string,
  input: CategoryInput,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }
  if (parsed.data.parentId === id) {
    return { ok: false, errorKey: 'catalog.category.cycle' };
  }
  // Guard against deeper cycles: walking the proposed parent's ancestors must
  // not lead back to this node.
  if (parsed.data.parentId) {
    let cursor: string | null = parsed.data.parentId;
    const visited = new Set<string>();
    while (cursor && !visited.has(cursor)) {
      if (cursor === id) {
        return { ok: false, errorKey: 'catalog.category.cycle' };
      }
      visited.add(cursor);
      const next: { parentId: string | null } | null =
        await prisma.category.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
      if (!next) break;
      cursor = next.parentId;
    }
  }
  const before = await prisma.category.findUnique({ where: { id } });
  if (!before) return { ok: false, errorKey: 'catalog.category.not_found' };

  const slug =
    parsed.data.slug && parsed.data.slug !== before.slug
      ? await uniqueSlug(
          parsed.data.slug,
          async (candidate) =>
            (await prisma.category.count({
              where: { slug: candidate, NOT: { id } },
            })) > 0,
        )
      : before.slug;

  const after = await prisma.category.update({
    where: { id },
    data: {
      nameAr: parsed.data.nameAr,
      nameEn: parsed.data.nameEn,
      slug,
      parentId: parsed.data.parentId ?? null,
      position: parsed.data.position,
      status: parsed.data.status,
    },
  });
  await audit(
    admin.id,
    'catalog.category.update',
    'Category',
    id,
    before,
    after,
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

export async function archiveCategoryAction(
  id: string,
): Promise<ActionResult<null>> {
  return setCategoryStatus(id, 'ARCHIVED');
}
export async function unarchiveCategoryAction(
  id: string,
): Promise<ActionResult<null>> {
  return setCategoryStatus(id, 'ACTIVE');
}
async function setCategoryStatus(
  id: string,
  status: CatalogStatus,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const before = await prisma.category.findUnique({ where: { id } });
  if (!before) return { ok: false, errorKey: 'catalog.category.not_found' };
  const after = await prisma.category.update({
    where: { id },
    data: { status },
  });
  await audit(
    admin.id,
    status === 'ARCHIVED'
      ? 'catalog.category.archive'
      : 'catalog.category.unarchive',
    'Category',
    id,
    before,
    after,
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

export async function deleteCategoryAction(
  id: string,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const [before, productCount, childCount] = await Promise.all([
    prisma.category.findUnique({ where: { id } }),
    prisma.product.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentId: id } }),
  ]);
  if (!before) return { ok: false, errorKey: 'catalog.category.not_found' };
  if (productCount > 0 || childCount > 0) {
    return { ok: false, errorKey: 'catalog.category.has_dependents' };
  }
  await prisma.category.delete({ where: { id } });
  await audit(
    admin.id,
    'catalog.category.delete',
    'Category',
    id,
    before,
    null,
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

// ---------- PRODUCTS ----------

export async function createProductAction(
  input: ProductInput,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireCatalogAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const [brandExists, categoryExists, skuClash] = await Promise.all([
    prisma.brand.count({ where: { id: parsed.data.brandId } }),
    prisma.category.count({ where: { id: parsed.data.categoryId } }),
    prisma.product.count({ where: { sku: parsed.data.sku } }),
  ]);
  if (!brandExists) return { ok: false, errorKey: 'catalog.brand.not_found' };
  if (!categoryExists)
    return { ok: false, errorKey: 'catalog.category.not_found' };
  if (skuClash) return { ok: false, errorKey: 'catalog.product.sku_taken' };

  const slug = await uniqueSlug(
    parsed.data.slug ?? `${parsed.data.nameEn}-${parsed.data.sku}`,
    async (candidate) =>
      (await prisma.product.count({ where: { slug: candidate } })) > 0,
  );

  const product = await prisma.product.create({
    data: {
      sku: parsed.data.sku,
      brandId: parsed.data.brandId,
      categoryId: parsed.data.categoryId,
      slug,
      nameAr: parsed.data.nameAr,
      nameEn: parsed.data.nameEn,
      descriptionAr: parsed.data.descriptionAr,
      descriptionEn: parsed.data.descriptionEn,
      specs: parsed.data.specs,
      specsAr: parsed.data.specsAr,
      specsEn: parsed.data.specsEn,
      basePriceEgp: parsed.data.basePriceEgp,
      vatExempt: parsed.data.vatExempt,
      returnable: parsed.data.returnable,
      authenticity: parsed.data.authenticity,
      condition: parsed.data.condition,
      warranty: parsed.data.warranty || null,
      conditionNote:
        parsed.data.condition === 'USED'
          ? parsed.data.conditionNote || null
          : null,
      status: parsed.data.status,
    },
  });
  await audit(
    admin.id,
    'catalog.product.create',
    'Product',
    product.id,
    null,
    product,
  );
  await updateProductSearchVector(product.id);
  revalidateStorefront();
  return { ok: true, data: { id: product.id } };
}

export async function updateProductAction(
  id: string,
  input: ProductInput,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return { ok: false, errorKey: 'catalog.product.not_found' };

  if (parsed.data.sku !== before.sku) {
    const skuClash = await prisma.product.count({
      where: { sku: parsed.data.sku, NOT: { id } },
    });
    if (skuClash) return { ok: false, errorKey: 'catalog.product.sku_taken' };
  }

  const slug =
    parsed.data.slug && parsed.data.slug !== before.slug
      ? await uniqueSlug(
          parsed.data.slug,
          async (candidate) =>
            (await prisma.product.count({
              where: { slug: candidate, NOT: { id } },
            })) > 0,
        )
      : before.slug;

  const after = await prisma.product.update({
    where: { id },
    data: {
      sku: parsed.data.sku,
      brandId: parsed.data.brandId,
      categoryId: parsed.data.categoryId,
      slug,
      nameAr: parsed.data.nameAr,
      nameEn: parsed.data.nameEn,
      descriptionAr: parsed.data.descriptionAr,
      descriptionEn: parsed.data.descriptionEn,
      specs: parsed.data.specs,
      specsAr: parsed.data.specsAr,
      specsEn: parsed.data.specsEn,
      basePriceEgp: parsed.data.basePriceEgp,
      vatExempt: parsed.data.vatExempt,
      returnable: parsed.data.returnable,
      authenticity: parsed.data.authenticity,
      condition: parsed.data.condition,
      warranty: parsed.data.warranty || null,
      conditionNote:
        parsed.data.condition === 'USED'
          ? parsed.data.conditionNote || null
          : null,
      status: parsed.data.status,
    },
  });
  await audit(admin.id, 'catalog.product.update', 'Product', id, before, after);
  await updateProductSearchVector(id);
  revalidateStorefront();
  return { ok: true, data: null };
}

export async function archiveProductAction(
  id: string,
): Promise<ActionResult<null>> {
  return setProductStatus(id, 'ARCHIVED');
}
export async function unarchiveProductAction(
  id: string,
): Promise<ActionResult<null>> {
  return setProductStatus(id, 'ACTIVE');
}
async function setProductStatus(
  id: string,
  status: CatalogStatus,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return { ok: false, errorKey: 'catalog.product.not_found' };
  const after = await prisma.product.update({
    where: { id },
    data: { status },
  });
  await audit(
    admin.id,
    status === 'ARCHIVED'
      ? 'catalog.product.archive'
      : 'catalog.product.unarchive',
    'Product',
    id,
    before,
    after,
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

export async function deleteProductAction(
  id: string,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const before = await prisma.product.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!before) return { ok: false, errorKey: 'catalog.product.not_found' };
  // Images cascade via Prisma; blow away on-disk variants too.
  await deleteProductImageDir(id).catch((err: unknown) => {
    logger.warn(
      { productId: id, err: (err as Error).message },
      'catalog.product.delete.image_cleanup_failed',
    );
  });
  await prisma.product.delete({ where: { id } });
  await audit(admin.id, 'catalog.product.delete', 'Product', id, before, null);
  revalidateStorefront();
  return { ok: true, data: null };
}

// ---------- PRINTER MODELS ----------

export async function createPrinterModelAction(
  input: PrinterModelInput,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireCatalogAdmin();
  const parsed = printerModelSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }
  const brandExists = await prisma.brand.count({
    where: { id: parsed.data.brandId },
  });
  if (!brandExists) return { ok: false, errorKey: 'catalog.brand.not_found' };

  const clash = await prisma.printerModel.count({
    where: { brandId: parsed.data.brandId, modelName: parsed.data.modelName },
  });
  if (clash) {
    return { ok: false, errorKey: 'catalog.printer.duplicate_model' };
  }

  const slug = await uniqueSlug(
    parsed.data.slug ?? parsed.data.modelName,
    async (candidate) =>
      (await prisma.printerModel.count({ where: { slug: candidate } })) > 0,
  );

  const pm = await prisma.printerModel.create({
    data: {
      brandId: parsed.data.brandId,
      modelName: parsed.data.modelName,
      slug,
      status: parsed.data.status,
    },
  });
  await audit(
    admin.id,
    'catalog.printer.create',
    'PrinterModel',
    pm.id,
    null,
    pm,
  );
  revalidateStorefront();
  return { ok: true, data: { id: pm.id } };
}

export async function updatePrinterModelAction(
  id: string,
  input: PrinterModelInput,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const parsed = printerModelSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }
  const before = await prisma.printerModel.findUnique({ where: { id } });
  if (!before) return { ok: false, errorKey: 'catalog.printer.not_found' };

  if (
    parsed.data.brandId !== before.brandId ||
    parsed.data.modelName !== before.modelName
  ) {
    const clash = await prisma.printerModel.count({
      where: {
        brandId: parsed.data.brandId,
        modelName: parsed.data.modelName,
        NOT: { id },
      },
    });
    if (clash) {
      return { ok: false, errorKey: 'catalog.printer.duplicate_model' };
    }
  }

  const slug =
    parsed.data.slug && parsed.data.slug !== before.slug
      ? await uniqueSlug(
          parsed.data.slug,
          async (candidate) =>
            (await prisma.printerModel.count({
              where: { slug: candidate, NOT: { id } },
            })) > 0,
        )
      : before.slug;

  const after = await prisma.printerModel.update({
    where: { id },
    data: {
      brandId: parsed.data.brandId,
      modelName: parsed.data.modelName,
      slug,
      status: parsed.data.status,
    },
  });
  await audit(
    admin.id,
    'catalog.printer.update',
    'PrinterModel',
    id,
    before,
    after,
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

export async function archivePrinterModelAction(
  id: string,
): Promise<ActionResult<null>> {
  return setPrinterModelStatus(id, 'ARCHIVED');
}
export async function unarchivePrinterModelAction(
  id: string,
): Promise<ActionResult<null>> {
  return setPrinterModelStatus(id, 'ACTIVE');
}
async function setPrinterModelStatus(
  id: string,
  status: CatalogStatus,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const before = await prisma.printerModel.findUnique({ where: { id } });
  if (!before) return { ok: false, errorKey: 'catalog.printer.not_found' };
  const after = await prisma.printerModel.update({
    where: { id },
    data: { status },
  });
  await audit(
    admin.id,
    status === 'ARCHIVED'
      ? 'catalog.printer.archive'
      : 'catalog.printer.unarchive',
    'PrinterModel',
    id,
    before,
    after,
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

export async function deletePrinterModelAction(
  id: string,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const [before, compatCount] = await Promise.all([
    prisma.printerModel.findUnique({ where: { id } }),
    prisma.productCompatibility.count({ where: { printerModelId: id } }),
  ]);
  if (!before) return { ok: false, errorKey: 'catalog.printer.not_found' };
  if (compatCount > 0) {
    return { ok: false, errorKey: 'catalog.printer.has_dependents' };
  }
  await prisma.printerModel.delete({ where: { id } });
  await audit(
    admin.id,
    'catalog.printer.delete',
    'PrinterModel',
    id,
    before,
    null,
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

// ---------- PRODUCT COMPATIBILITY ----------

export async function setProductCompatibilityAction(
  productId: string,
  printerModelIds: string[],
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return { ok: false, errorKey: 'catalog.product.not_found' };

  // Verify every submitted model exists (defensive — the UI only offers valid ones).
  if (printerModelIds.length > 0) {
    const existing = await prisma.printerModel.findMany({
      where: { id: { in: printerModelIds } },
      select: { id: true },
    });
    if (existing.length !== printerModelIds.length) {
      return { ok: false, errorKey: 'catalog.printer.not_found' };
    }
  }

  await prisma.$transaction([
    prisma.productCompatibility.deleteMany({ where: { productId } }),
    ...(printerModelIds.length > 0
      ? [
          prisma.productCompatibility.createMany({
            data: printerModelIds.map((printerModelId) => ({
              productId,
              printerModelId,
            })),
          }),
        ]
      : []),
  ]);
  await audit(
    admin.id,
    'catalog.product.compatibility.set',
    'Product',
    productId,
    null,
    { printerModelIds },
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

// ---------- PRODUCT IMAGES ----------

const MAX_IMAGES_PER_PRODUCT = 10;

export async function uploadProductImageAction(
  productId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireCatalogAdmin();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return { ok: false, errorKey: 'catalog.product.not_found' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errorKey: 'catalog.image.missing' };
  }

  const existingCount = await prisma.productImage.count({
    where: { productId },
  });
  if (existingCount >= MAX_IMAGES_PER_PRODUCT) {
    return { ok: false, errorKey: 'catalog.image.limit' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let processed;
  try {
    processed = await processProductImage(productId, buffer);
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    logger.warn(
      { productId, code, message: (err as Error).message },
      'catalog.image.process_failed',
    );
    return { ok: false, errorKey: `catalog.image.${code}` };
  }

  const image = await prisma.productImage.create({
    data: {
      productId,
      filename: processed.filename,
      position: existingCount,
    },
  });
  await audit(
    admin.id,
    'catalog.product.image.upload',
    'ProductImage',
    image.id,
    null,
    image,
  );
  revalidateStorefront();
  return { ok: true, data: { id: image.id } };
}

export async function updateProductImageAction(
  input: ProductImageUpdateInput,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const parsed = productImageUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }
  const before = await prisma.productImage.findUnique({
    where: { id: parsed.data.id },
  });
  if (!before) return { ok: false, errorKey: 'catalog.image.not_found' };
  const after = await prisma.productImage.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.position !== undefined
        ? { position: parsed.data.position }
        : {}),
      ...(parsed.data.altAr !== undefined ? { altAr: parsed.data.altAr } : {}),
      ...(parsed.data.altEn !== undefined ? { altEn: parsed.data.altEn } : {}),
    },
  });
  await audit(
    admin.id,
    'catalog.product.image.update',
    'ProductImage',
    parsed.data.id,
    before,
    after,
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

export async function reorderProductImagesAction(
  productId: string,
  orderedIds: string[],
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const images = await prisma.productImage.findMany({
    where: { productId },
    select: { id: true },
  });
  const owned = new Set(images.map((i: { id: string }) => i.id));
  for (const id of orderedIds) {
    if (!owned.has(id)) {
      return { ok: false, errorKey: 'catalog.image.not_found' };
    }
  }
  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.productImage.update({
        where: { id },
        data: { position },
      }),
    ),
  );
  await audit(
    admin.id,
    'catalog.product.image.reorder',
    'Product',
    productId,
    null,
    { orderedIds },
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

export async function deleteProductImageAction(
  imageId: string,
): Promise<ActionResult<null>> {
  const admin = await requireCatalogAdmin();
  const before = await prisma.productImage.findUnique({
    where: { id: imageId },
  });
  if (!before) return { ok: false, errorKey: 'catalog.image.not_found' };
  await prisma.productImage.delete({ where: { id: imageId } });
  await deleteProductImageFiles(before.productId, before.filename).catch(
    (err: unknown) => {
      logger.warn(
        {
          productId: before.productId,
          filename: before.filename,
          err: (err as Error).message,
        },
        'catalog.image.delete.disk_cleanup_failed',
      );
    },
  );
  await audit(
    admin.id,
    'catalog.product.image.delete',
    'ProductImage',
    imageId,
    before,
    null,
  );
  revalidateStorefront();
  return { ok: true, data: null };
}

/**
 * Bulk-archive many products in one click (admin list page "Archive selected"
 * button). Only ACTIVE rows are flipped to ARCHIVED — already-ARCHIVED ones
 * are silently skipped so re-submitting the same form is idempotent. Each
 * successful archive gets its own AuditLog row for full traceability.
 *
 * Takes the full `FormData` so it can be wired directly to a native
 * `<form action={bulkArchiveProductsAction}>` with checkbox rows bearing
 * `name="ids"`.
 */
export async function bulkArchiveProductsAction(
  formData: FormData,
): Promise<ActionResult<{ archived: number }>> {
  const admin = await requireCatalogAdmin();
  const rawIds = formData.getAll('ids');
  const ids = rawIds
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .slice(0, 500); // sanity cap

  if (ids.length === 0) {
    return { ok: false, errorKey: 'catalog.product.bulk.empty_selection' };
  }

  const targets = await prisma.product.findMany({
    where: { id: { in: ids }, status: 'ACTIVE' },
    select: { id: true, status: true, sku: true, nameAr: true, nameEn: true },
  });

  if (targets.length === 0) {
    return { ok: true, data: { archived: 0 } };
  }

  await prisma.$transaction([
    prisma.product.updateMany({
      where: { id: { in: targets.map((t) => t.id) } },
      data: { status: 'ARCHIVED' },
    }),
    prisma.auditLog.createMany({
      data: targets.map((t) => ({
        actorId: admin.id,
        action: 'catalog.product.bulk_archive',
        entityType: 'Product',
        entityId: t.id,
        before: { status: 'ACTIVE', sku: t.sku } as never,
        after: { status: 'ARCHIVED', sku: t.sku } as never,
        note: `Bulk archive (${targets.length} selected)`,
      })),
    }),
  ]);
  revalidateStorefront();
  return { ok: true, data: { archived: targets.length } };
}
