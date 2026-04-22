'use server';

/**
 * Admin action — update store / company info used on invoice headers
 * (Sprint 6 kickoff decision #2). Owner-only per ADR-016; Ops team shouldn't
 * be able to change the commercial registry or tax card numbers that appear
 * on every invoice.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { toLocalizedIssues } from '@/lib/validation/error-map';
import {
  getStoreInfo,
  setStoreInfo,
  type StoreInfo,
} from '@/lib/settings/store-info';
import { processBrandLogo, deleteBrandLogo } from '@/lib/storage/brand';
import { logger } from '@/lib/logger';

// Drop the explicit `z.ZodType<StoreInfo>` annotation — zod's `.default('')`
// emits an optional input but a concrete output, which doesn't line up with
// the `StoreInfo` type that requires both fields. The `safeParse` below
// produces a fully-populated object that satisfies StoreInfo at call sites.
const storeInfoSchema = z.object({
  nameAr: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  commercialRegistryNumber: z.string().trim().min(1).max(60),
  taxCardNumber: z.string().trim().min(1).max(60),
  addressAr: z.string().trim().min(1).max(300),
  addressEn: z.string().trim().min(1).max(300),
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(200),
  website: z.string().trim().min(1).max(200),
  // Sprint 9 — optional. Logo filename under /storage/brand/ (empty = no logo).
  // Support WhatsApp is the sales-team manual line used by Sprint 10's bridge
  // button (distinct from the Whats360 OTP device). Closes PRD Q#2.
  logoFilename: z.string().trim().max(120).default(''),
  supportWhatsapp: z.string().trim().max(40).default(''),
});

type ActionOk<T> = { ok: true; data: T };
type ActionErr = {
  ok: false;
  errorKey: string;
  fieldErrors?: { path: (string | number)[]; key: string }[];
};
type ActionResult<T> = ActionOk<T> | ActionErr;

export async function updateStoreInfoAction(
  input: StoreInfo,
): Promise<ActionResult<{ ok: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = storeInfoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.failed',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }
  await setStoreInfo(parsed.data, actor.id);
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'settings.store_info_update',
      after: parsed.data as never,
    },
  });
  revalidatePath('/admin/settings/store', 'page');
  return { ok: true, data: { ok: true } };
}

/**
 * Sprint 9 S9-D6-T1 — upload a new brand logo. Processes via sharp → WebP,
 * stores under /storage/brand/, updates StoreInfo.logoFilename, deletes the
 * prior file. Idempotent on retry — the previous filename is captured before
 * we upsert, so a failed write leaves the old file intact.
 */
export async function uploadBrandLogoAction(
  formData: FormData,
): Promise<ActionResult<{ filename: string }>> {
  const actor = await requireAdmin(['OWNER']);
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errorKey: 'store.logo.missing' };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  let filename: string;
  try {
    filename = await processBrandLogo(buffer);
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    logger.warn(
      { code, message: (err as Error).message },
      'store.logo.process_failed',
    );
    return { ok: false, errorKey: `store.logo.${code}` };
  }

  const current = await getStoreInfo();
  const prior = current.logoFilename;
  await setStoreInfo({ ...current, logoFilename: filename }, actor.id);
  if (prior && prior !== filename) {
    await deleteBrandLogo(prior).catch(() => {
      /* non-fatal — old file survives in /storage/brand until next cleanup */
    });
  }
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'store.logo.upload',
      entityType: 'Setting',
      entityId: 'store.info',
      after: { logoFilename: filename } as never,
    },
  });
  revalidatePath('/admin/settings/store', 'page');
  return { ok: true, data: { filename } };
}

/**
 * Clear the logo (no image) — keeps the filename history via audit log.
 */
export async function clearBrandLogoAction(): Promise<
  ActionResult<{ ok: true }>
> {
  const actor = await requireAdmin(['OWNER']);
  const current = await getStoreInfo();
  if (!current.logoFilename) return { ok: true, data: { ok: true } };
  await setStoreInfo({ ...current, logoFilename: '' }, actor.id);
  await deleteBrandLogo(current.logoFilename).catch(() => undefined);
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'store.logo.clear',
      entityType: 'Setting',
      entityId: 'store.info',
      before: { logoFilename: current.logoFilename } as never,
    },
  });
  revalidatePath('/admin/settings/store', 'page');
  return { ok: true, data: { ok: true } };
}
