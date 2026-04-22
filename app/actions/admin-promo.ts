'use server';

/**
 * Admin promo-code CRUD (Sprint 9 S9-D5-T1). OWNER-only per ADR-016.
 * `code` is normalized to uppercase on write so comparisons at checkout
 * are case-insensitive without needing a functional index.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; errorKey: string };

const baseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9\-_]+$/, 'promo.invalid_code'),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().min(0).max(1_000_000),
  minOrderEgp: z.number().min(0).max(1_000_000).nullable(),
  usageLimit: z.number().int().min(1).max(100_000).nullable(),
  validFrom: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? new Date(v) : null)),
  validTo: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? new Date(v) : null)),
  active: z.boolean(),
});

export type PromoCodeInput = z.input<typeof baseSchema>;

function refineValue(
  data: z.infer<typeof baseSchema>,
): { ok: true } | { ok: false; errorKey: string } {
  if (data.type === 'PERCENT') {
    if (data.value < 1 || data.value > 100) {
      return { ok: false, errorKey: 'promo.percent_out_of_range' };
    }
  }
  if (data.validFrom && data.validTo && data.validFrom > data.validTo) {
    return { ok: false, errorKey: 'promo.date_window_invalid' };
  }
  return { ok: true };
}

export async function createPromoCodeAction(
  input: PromoCodeInput,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };
  const refined = refineValue(parsed.data);
  if (!refined.ok) return refined;
  const code = parsed.data.code.toUpperCase();
  try {
    const row = await prisma.promoCode.create({
      data: {
        code,
        type: parsed.data.type,
        value: parsed.data.value,
        minOrderEgp: parsed.data.minOrderEgp,
        usageLimit: parsed.data.usageLimit,
        validFrom: parsed.data.validFrom,
        validTo: parsed.data.validTo,
        active: parsed.data.active,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'promo.create',
        entityType: 'PromoCode',
        entityId: row.id,
        after: { code, type: row.type, value: Number(row.value) } as never,
      },
    });
    revalidatePath('/admin/settings/promo-codes');
    return { ok: true, data: { id: row.id } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { ok: false, errorKey: 'promo.code_exists' };
    }
    logger.error({ err: (err as Error).message }, 'promo.create_failed');
    return { ok: false, errorKey: 'promo.create_failed' };
  }
}

export async function updatePromoCodeAction(
  id: string,
  input: PromoCodeInput,
): Promise<ActionResult> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };
  const refined = refineValue(parsed.data);
  if (!refined.ok) return refined;
  const code = parsed.data.code.toUpperCase();
  try {
    const row = await prisma.promoCode.update({
      where: { id },
      data: {
        code,
        type: parsed.data.type,
        value: parsed.data.value,
        minOrderEgp: parsed.data.minOrderEgp,
        usageLimit: parsed.data.usageLimit,
        validFrom: parsed.data.validFrom,
        validTo: parsed.data.validTo,
        active: parsed.data.active,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'promo.update',
        entityType: 'PromoCode',
        entityId: row.id,
        after: { code, type: row.type, value: Number(row.value) } as never,
      },
    });
    revalidatePath('/admin/settings/promo-codes');
    revalidatePath(`/admin/settings/promo-codes/${id}`);
    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { ok: false, errorKey: 'promo.code_exists' };
    }
    logger.error({ err: (err as Error).message }, 'promo.update_failed');
    return { ok: false, errorKey: 'promo.update_failed' };
  }
}

export async function togglePromoCodeActiveAction(
  id: string,
): Promise<ActionResult> {
  const actor = await requireAdmin(['OWNER']);
  const cur = await prisma.promoCode.findUnique({
    where: { id },
    select: { active: true },
  });
  if (!cur) return { ok: false, errorKey: 'promo.not_found' };
  await prisma.promoCode.update({
    where: { id },
    data: { active: !cur.active },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'promo.toggle_active',
      entityType: 'PromoCode',
      entityId: id,
      after: { active: !cur.active } as never,
    },
  });
  revalidatePath('/admin/settings/promo-codes');
  revalidatePath(`/admin/settings/promo-codes/${id}`);
  return { ok: true };
}

/**
 * S9-D8-T2 bulk-disable: flip `active = false` for every PromoCode whose
 * `validTo < now`. Idempotent — already-inactive rows are no-ops.
 */
export async function bulkDisableExpiredPromosAction(): Promise<
  ActionResult<{ disabled: number }>
> {
  const actor = await requireAdmin(['OWNER']);
  const now = new Date();
  const res = await prisma.promoCode.updateMany({
    where: { active: true, validTo: { lt: now, not: null } },
    data: { active: false },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'promo.bulk_disable_expired',
      entityType: 'PromoCode',
      entityId: 'bulk',
      after: { disabled: res.count } as never,
    },
  });
  revalidatePath('/admin/settings/promo-codes');
  return { ok: true, data: { disabled: res.count } };
}

export async function createPromoCodeAndRedirectAction(
  input: PromoCodeInput,
): Promise<ActionResult> {
  const r = await createPromoCodeAction(input);
  if (!r.ok) return r;
  redirect('/admin/settings/promo-codes');
}
