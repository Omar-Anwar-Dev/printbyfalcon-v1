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
  setStoreInfo,
  type StoreInfo,
  STORE_INFO_DEFAULT,
} from '@/lib/settings/store-info';

const storeInfoSchema: z.ZodType<StoreInfo> = z.object({
  nameAr: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  commercialRegistryNumber: z.string().trim().min(1).max(60),
  taxCardNumber: z.string().trim().min(1).max(60),
  addressAr: z.string().trim().min(1).max(300),
  addressEn: z.string().trim().min(1).max(300),
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(200),
  website: z.string().trim().min(1).max(200),
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

export { STORE_INFO_DEFAULT };
