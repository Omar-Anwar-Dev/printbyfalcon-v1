'use server';

/**
 * Admin catalog media uploads — Brand logos and Category hero images.
 *
 * Mirrors the shape of `app/actions/admin-store-info.ts` (which handles the
 * *store's own* logo for invoices) but writes to per-entity rows instead of
 * the singleton StoreInfo blob. Both flows are gated on OWNER + OPS per
 * ADR-016 (catalog editors), audited, and idempotent on retry.
 */
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  processSingleImage,
  deleteSingleImage,
  SingleImageUploadError,
} from '@/lib/storage/single-image';
import {
  brandLogoDir,
  brandLogoDiskPath,
  categoryImageDir,
  categoryImageDiskPath,
} from '@/lib/storage/paths';
import type { AdminRole } from '@prisma/client';

const CATALOG_ROLES: AdminRole[] = ['OWNER', 'OPS'];

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

function fileFromForm(formData: FormData): File | null {
  const f = formData.get('file');
  return f instanceof File && f.size > 0 ? f : null;
}

// ───────────── Brand logo ─────────────

export async function uploadCatalogBrandLogoAction(
  brandId: string,
  formData: FormData,
): Promise<ActionResult<{ filename: string }>> {
  const actor = await requireAdmin(CATALOG_ROLES);
  const file = fileFromForm(formData);
  if (!file) return { ok: false, errorKey: 'catalog.brand.logo.missing' };

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return { ok: false, errorKey: 'catalog.brand.not_found' };

  const buffer = Buffer.from(await file.arrayBuffer());
  let filename: string;
  try {
    filename = await processSingleImage(buffer, {
      targetDir: brandLogoDir(),
      // Sortable, slug-prefixed filename helps when browsing the disk
      // directory directly during ops debugging.
      filenameStem: `brand-${brand.slug}`,
      maxDimensionPx: 400,
    });
  } catch (err) {
    const code = err instanceof SingleImageUploadError ? err.code : 'unknown';
    logger.warn(
      { code, brandId, message: (err as Error).message },
      'catalog.brand.logo.process_failed',
    );
    return { ok: false, errorKey: `catalog.brand.logo.${code}` };
  }

  const prior = brand.logoFilename;
  await prisma.brand.update({
    where: { id: brandId },
    data: { logoFilename: filename },
  });
  if (prior && prior !== filename) {
    await deleteSingleImage(brandLogoDiskPath(prior)).catch(() => undefined);
  }
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'catalog.brand.logo.upload',
      entityType: 'Brand',
      entityId: brandId,
      after: { logoFilename: filename } as never,
    },
  });

  revalidatePath('/', 'layout');
  revalidatePath(`/admin/brands/${brandId}`);
  return { ok: true, data: { filename } };
}

export async function clearCatalogBrandLogoAction(
  brandId: string,
): Promise<ActionResult<{ ok: true }>> {
  const actor = await requireAdmin(CATALOG_ROLES);
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return { ok: false, errorKey: 'catalog.brand.not_found' };
  if (!brand.logoFilename) return { ok: true, data: { ok: true } };

  const prior = brand.logoFilename;
  await prisma.brand.update({
    where: { id: brandId },
    data: { logoFilename: null },
  });
  await deleteSingleImage(brandLogoDiskPath(prior)).catch(() => undefined);
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'catalog.brand.logo.clear',
      entityType: 'Brand',
      entityId: brandId,
      before: { logoFilename: prior } as never,
    },
  });

  revalidatePath('/', 'layout');
  revalidatePath(`/admin/brands/${brandId}`);
  return { ok: true, data: { ok: true } };
}

// ───────────── Category image ─────────────

export async function uploadCategoryImageAction(
  categoryId: string,
  formData: FormData,
): Promise<ActionResult<{ filename: string }>> {
  const actor = await requireAdmin(CATALOG_ROLES);
  const file = fileFromForm(formData);
  if (!file) return { ok: false, errorKey: 'catalog.category.image.missing' };

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) return { ok: false, errorKey: 'catalog.category.not_found' };

  const buffer = Buffer.from(await file.arrayBuffer());
  let filename: string;
  try {
    filename = await processSingleImage(buffer, {
      targetDir: categoryImageDir(),
      filenameStem: `category-${category.slug}`,
      // Hero photos benefit from larger source bytes — 1200px gives a
      // crisp result on retina category cards (rendered ≤256px wide) and
      // on the category landing header (rendered ≤900px wide).
      maxDimensionPx: 1200,
      // Photos can be larger files than logos — allow up to 5 MB.
      maxBytes: 5 * 1024 * 1024,
    });
  } catch (err) {
    const code = err instanceof SingleImageUploadError ? err.code : 'unknown';
    logger.warn(
      { code, categoryId, message: (err as Error).message },
      'catalog.category.image.process_failed',
    );
    return { ok: false, errorKey: `catalog.category.image.${code}` };
  }

  const prior = category.imageFilename;
  await prisma.category.update({
    where: { id: categoryId },
    data: { imageFilename: filename },
  });
  if (prior && prior !== filename) {
    await deleteSingleImage(categoryImageDiskPath(prior)).catch(
      () => undefined,
    );
  }
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'catalog.category.image.upload',
      entityType: 'Category',
      entityId: categoryId,
      after: { imageFilename: filename } as never,
    },
  });

  revalidatePath('/', 'layout');
  revalidatePath(`/admin/categories/${categoryId}`);
  return { ok: true, data: { filename } };
}

export async function clearCategoryImageAction(
  categoryId: string,
): Promise<ActionResult<{ ok: true }>> {
  const actor = await requireAdmin(CATALOG_ROLES);
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) return { ok: false, errorKey: 'catalog.category.not_found' };
  if (!category.imageFilename) return { ok: true, data: { ok: true } };

  const prior = category.imageFilename;
  await prisma.category.update({
    where: { id: categoryId },
    data: { imageFilename: null },
  });
  await deleteSingleImage(categoryImageDiskPath(prior)).catch(() => undefined);
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'catalog.category.image.clear',
      entityType: 'Category',
      entityId: categoryId,
      before: { imageFilename: prior } as never,
    },
  });

  revalidatePath('/', 'layout');
  revalidatePath(`/admin/categories/${categoryId}`);
  return { ok: true, data: { ok: true } };
}
