'use server';

/**
 * Sprint 11.5 — Payment-method toggle + mode switch (TEST/LIVE).
 *
 * All sensitive flips are gated by `verifyAdminPasswordOrThrow` — even
 * though the caller is already an authenticated OWNER (via session), we
 * re-prompt to defend against an unattended laptop / leaked session token
 * silently flipping prod → TEST and capturing real customer payments
 * against a sandbox merchant.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  AdminPasswordVerifyError,
  verifyAdminPasswordOrThrow,
} from '@/lib/auth/verify-admin-password';
import { setPaymentMode, type PaymentMode } from '@/lib/settings/payment';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = {
  ok: false;
  errorKey: string;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
};
type ActionResult<T> = ActionOk<T> | ActionErr;

const passwordSchema = z.string().min(1).max(200);

const toggleSchema = z.object({
  code: z.string().min(1).max(40),
  enabled: z.boolean(),
  password: passwordSchema,
});

export async function togglePaymentMethodAction(
  input: z.infer<typeof toggleSchema>,
): Promise<ActionResult<{ saved: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  // Re-verify the OWNER's password before flipping any payment surface.
  try {
    await verifyAdminPasswordOrThrow(actor, parsed.data.password);
  } catch (err) {
    if (err instanceof AdminPasswordVerifyError) {
      return {
        ok: false,
        errorKey: `admin_password.${err.kind}`,
        retryAfterSeconds: err.retryAfterSeconds,
        remainingAttempts: err.remainingAttempts,
      };
    }
    throw err;
  }

  try {
    const before = await prisma.paymentMethodConfig.findUnique({
      where: { code: parsed.data.code },
    });
    if (!before) return { ok: false, errorKey: 'payment.method_not_found' };

    const after = await prisma.paymentMethodConfig.update({
      where: { code: parsed.data.code },
      data: { enabled: parsed.data.enabled },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.payment_method.toggle',
        entityType: 'PaymentMethodConfig',
        entityId: parsed.data.code,
        before: { enabled: before.enabled } as never,
        after: { enabled: after.enabled } as never,
      },
    });

    revalidatePath('/admin/settings/payment-methods');
    revalidatePath('/checkout');
    return { ok: true, data: { saved: true } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message, code: parsed.data.code },
      'settings.payment_method.toggle_failed',
    );
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}

const updateMethodLabelsSchema = z.object({
  code: z.string().min(1).max(40),
  nameAr: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(80),
  descriptionAr: z.string().max(280).nullable(),
  descriptionEn: z.string().max(280).nullable(),
});

export async function updatePaymentMethodLabelsAction(
  input: z.infer<typeof updateMethodLabelsSchema>,
): Promise<ActionResult<{ saved: true }>> {
  // Label edits are non-sensitive (no money flow) — no password required.
  const actor = await requireAdmin(['OWNER']);
  const parsed = updateMethodLabelsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  try {
    const before = await prisma.paymentMethodConfig.findUnique({
      where: { code: parsed.data.code },
    });
    if (!before) return { ok: false, errorKey: 'payment.method_not_found' };

    const after = await prisma.paymentMethodConfig.update({
      where: { code: parsed.data.code },
      data: {
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        descriptionAr: parsed.data.descriptionAr,
        descriptionEn: parsed.data.descriptionEn,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.payment_method.labels',
        entityType: 'PaymentMethodConfig',
        entityId: parsed.data.code,
        before: {
          nameAr: before.nameAr,
          nameEn: before.nameEn,
          descriptionAr: before.descriptionAr,
          descriptionEn: before.descriptionEn,
        } as never,
        after: {
          nameAr: after.nameAr,
          nameEn: after.nameEn,
          descriptionAr: after.descriptionAr,
          descriptionEn: after.descriptionEn,
        } as never,
      },
    });

    revalidatePath('/admin/settings/payment-methods');
    revalidatePath('/checkout');
    return { ok: true, data: { saved: true } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message, code: parsed.data.code },
      'settings.payment_method.labels_failed',
    );
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}

const modeSchema = z.object({
  mode: z.enum(['LIVE', 'TEST']),
  password: passwordSchema,
});

export async function setPaymentModeAction(
  input: z.infer<typeof modeSchema>,
): Promise<ActionResult<{ mode: PaymentMode }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = modeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  // Mode flips are the most sensitive op in this surface — they change the
  // merchant account that takes real customer money. Always require password.
  try {
    await verifyAdminPasswordOrThrow(actor, parsed.data.password);
  } catch (err) {
    if (err instanceof AdminPasswordVerifyError) {
      return {
        ok: false,
        errorKey: `admin_password.${err.kind}`,
        retryAfterSeconds: err.retryAfterSeconds,
        remainingAttempts: err.remainingAttempts,
      };
    }
    throw err;
  }

  try {
    await setPaymentMode(parsed.data.mode, actor.id);
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.payment.mode',
        entityType: 'Setting',
        entityId: 'payment.mode',
        after: { mode: parsed.data.mode } as never,
      },
    });
    revalidatePath('/admin/settings/payment-methods');
    revalidatePath('/checkout');
    return { ok: true, data: { mode: parsed.data.mode } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      'settings.payment.mode_failed',
    );
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}
