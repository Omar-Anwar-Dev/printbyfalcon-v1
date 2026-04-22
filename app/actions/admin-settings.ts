'use server';

/**
 * Admin settings Server Actions (Sprint 5+). Gated on OWNER only — Ops + Sales
 * Rep never touch global toggles per ADR-016.
 *
 * Sprint 9 additions: shipping zones + free-ship thresholds + COD policy +
 * governorate mapping + VAT rate + per-product vatExempt + store-info edit.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Governorate, type OrderStatus } from '@prisma/client';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { setNotificationOptOut } from '@/lib/settings/notifications';
import { setFreeShipThresholds } from '@/lib/settings/shipping';
import { setCodPolicy } from '@/lib/settings/cod';
import { setVatRate } from '@/lib/settings/vat';
import { logger } from '@/lib/logger';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

const orderStatusSchema: z.ZodType<OrderStatus> = z.enum([
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'HANDED_TO_COURIER',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'DELAYED_OR_ISSUE',
]);

const notificationOptOutSchema = z.object({
  WHATSAPP: z.array(orderStatusSchema),
  EMAIL: z.array(orderStatusSchema),
});

export type NotificationOptOutInput = z.infer<typeof notificationOptOutSchema>;

export async function updateNotificationOptOutAction(
  input: NotificationOptOutInput,
): Promise<ActionResult<{ saved: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = notificationOptOutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  await setNotificationOptOut(parsed.data, actor.id);
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'settings.notifications.optout_update',
      entityType: 'Setting',
      entityId: 'notifications.optout',
      before: null as never,
      after: parsed.data as never,
    },
  });

  revalidatePath('/admin/settings/notifications', 'page');
  return { ok: true, data: { saved: true } };
}

// --- Shipping zones + thresholds + governorate mapping (S9-D2-T2, S9-D4-T4)

const zoneUpdateSchema = z.object({
  id: z.string().min(1),
  baseRateEgp: z.number().min(0).max(10000),
  freeShippingThresholdB2cEgp: z.number().min(0).nullable(),
  freeShippingThresholdB2bEgp: z.number().min(0).nullable(),
  codEnabled: z.boolean(),
});

export async function updateShippingZoneAction(
  input: z.infer<typeof zoneUpdateSchema>,
): Promise<ActionResult<{ saved: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = zoneUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };
  try {
    const before = await prisma.shippingZone.findUnique({
      where: { id: parsed.data.id },
    });
    if (!before) return { ok: false, errorKey: 'shipping.zone_not_found' };
    const after = await prisma.shippingZone.update({
      where: { id: parsed.data.id },
      data: {
        baseRateEgp: parsed.data.baseRateEgp,
        freeShippingThresholdB2cEgp: parsed.data.freeShippingThresholdB2cEgp,
        freeShippingThresholdB2bEgp: parsed.data.freeShippingThresholdB2bEgp,
        codEnabled: parsed.data.codEnabled,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.shipping.zone.update',
        entityType: 'ShippingZone',
        entityId: after.id,
        before: {
          baseRateEgp: Number(before.baseRateEgp),
          freeShippingThresholdB2cEgp:
            before.freeShippingThresholdB2cEgp !== null
              ? Number(before.freeShippingThresholdB2cEgp)
              : null,
          freeShippingThresholdB2bEgp:
            before.freeShippingThresholdB2bEgp !== null
              ? Number(before.freeShippingThresholdB2bEgp)
              : null,
          codEnabled: before.codEnabled,
        } as never,
        after: {
          baseRateEgp: Number(after.baseRateEgp),
          freeShippingThresholdB2cEgp:
            after.freeShippingThresholdB2cEgp !== null
              ? Number(after.freeShippingThresholdB2cEgp)
              : null,
          freeShippingThresholdB2bEgp:
            after.freeShippingThresholdB2bEgp !== null
              ? Number(after.freeShippingThresholdB2bEgp)
              : null,
          codEnabled: after.codEnabled,
        } as never,
      },
    });
    revalidatePath('/admin/settings/shipping');
    revalidatePath('/checkout');
    return { ok: true, data: { saved: true } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      'settings.shipping.zone.update_failed',
    );
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}

const thresholdsSchema = z.object({
  b2cEgp: z.number().min(0).max(1_000_000),
  b2bEgp: z.number().min(0).max(1_000_000),
});

export async function updateFreeShipThresholdsAction(
  input: z.infer<typeof thresholdsSchema>,
): Promise<ActionResult<{ saved: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = thresholdsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };
  try {
    await setFreeShipThresholds(parsed.data, actor.id);
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.shipping.thresholds.update',
        entityType: 'Setting',
        entityId: 'shipping.freeShipThresholds',
        after: parsed.data as never,
      },
    });
    revalidatePath('/admin/settings/shipping');
    revalidatePath('/checkout');
    return { ok: true, data: { saved: true } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      'settings.shipping.thresholds.update_failed',
    );
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}

const bulkReassignSchema = z.object({
  zoneId: z.string().min(1),
  governorates: z.array(z.nativeEnum(Governorate)).min(1),
});

export async function bulkReassignGovernoratesAction(
  input: z.infer<typeof bulkReassignSchema>,
): Promise<ActionResult<{ saved: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = bulkReassignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };
  try {
    const zone = await prisma.shippingZone.findUnique({
      where: { id: parsed.data.zoneId },
      select: { code: true },
    });
    if (!zone) return { ok: false, errorKey: 'shipping.zone_not_found' };
    await prisma.$transaction(
      parsed.data.governorates.map((g) =>
        prisma.governorateZone.upsert({
          where: { governorate: g },
          update: { zoneId: parsed.data.zoneId },
          create: { governorate: g, zoneId: parsed.data.zoneId },
        }),
      ),
    );
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.shipping.governorate.bulk_reassign',
        entityType: 'GovernorateZone',
        entityId: parsed.data.zoneId,
        after: {
          zoneCode: zone.code,
          governorates: parsed.data.governorates,
        } as never,
      },
    });
    revalidatePath('/admin/settings/shipping');
    revalidatePath('/checkout');
    return { ok: true, data: { saved: true } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      'settings.shipping.governorate.bulk_reassign_failed',
    );
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}

// --- COD policy (S9-D3-T3) ------------------------------------------------

const codPolicySchema = z.object({
  enabled: z.boolean(),
  feeType: z.enum(['FIXED', 'PERCENT']),
  feeValue: z.number().min(0).max(10000),
  maxOrderEgp: z.number().min(0).max(10_000_000),
});

export async function updateCodPolicyAction(
  input: z.infer<typeof codPolicySchema>,
): Promise<ActionResult<{ saved: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = codPolicySchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };
  try {
    await setCodPolicy(parsed.data, actor.id);
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.cod.update',
        entityType: 'Setting',
        entityId: 'cod.policy',
        after: parsed.data as never,
      },
    });
    revalidatePath('/admin/settings/cod');
    revalidatePath('/checkout');
    return { ok: true, data: { saved: true } };
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'settings.cod.update_failed');
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}

// --- VAT (S9-D6-T3) -------------------------------------------------------

const vatSchema = z.object({
  percent: z.number().min(0).max(100),
});

export async function updateVatRateAction(
  input: z.infer<typeof vatSchema>,
): Promise<ActionResult<{ saved: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = vatSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };
  try {
    await setVatRate(parsed.data, actor.id);
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.vat.update',
        entityType: 'Setting',
        entityId: 'vat.rate',
        after: parsed.data as never,
      },
    });
    revalidatePath('/admin/settings/vat');
    revalidatePath('/checkout');
    return { ok: true, data: { saved: true } };
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'settings.vat.update_failed');
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}

const productVatExemptSchema = z.object({
  productId: z.string().min(1),
  vatExempt: z.boolean(),
});

export async function setProductVatExemptAction(
  input: z.infer<typeof productVatExemptSchema>,
): Promise<ActionResult<{ saved: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = productVatExemptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };
  try {
    await prisma.product.update({
      where: { id: parsed.data.productId },
      data: { vatExempt: parsed.data.vatExempt },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'product.vat_exempt.update',
        entityType: 'Product',
        entityId: parsed.data.productId,
        after: { vatExempt: parsed.data.vatExempt } as never,
      },
    });
    revalidatePath('/admin/settings/vat');
    return { ok: true, data: { saved: true } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      'product.vat_exempt.update_failed',
    );
    return { ok: false, errorKey: 'product.update_failed' };
  }
}
