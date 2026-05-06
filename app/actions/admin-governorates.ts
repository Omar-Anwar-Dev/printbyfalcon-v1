'use server';

/**
 * Sprint 11.5 — Admin actions for `GovernorateConfig` (deliverable toggle,
 * names, position, zone reassignment) + extended `ShippingZone` CRUD
 * (create / update / archive with delivery-day windows).
 *
 * All actions are OWNER-only and emit AuditLog entries. Zone-archive is
 * blocked when the zone has live `GovernorateConfig` rows pointing at it
 * to avoid accidentally orphaning addresses.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Governorate } from '@prisma/client';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

// ---------------------------------------------------------------------------
// GovernorateConfig — admin edits per-governorate
// ---------------------------------------------------------------------------

const updateGovernorateConfigSchema = z.object({
  code: z.nativeEnum(Governorate),
  nameAr: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(80),
  deliverable: z.boolean(),
  zoneId: z.string().min(1).nullable(),
  position: z.number().int().min(0).max(999),
});

export type UpdateGovernorateConfigInput = z.infer<
  typeof updateGovernorateConfigSchema
>;

export async function updateGovernorateConfigAction(
  input: UpdateGovernorateConfigInput,
): Promise<ActionResult<{ saved: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = updateGovernorateConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  try {
    const before = await prisma.governorateConfig.findUnique({
      where: { code: parsed.data.code },
    });
    if (!before) return { ok: false, errorKey: 'governorate.not_found' };

    // Optional: validate zone exists if zoneId is set
    if (parsed.data.zoneId) {
      const zone = await prisma.shippingZone.findUnique({
        where: { id: parsed.data.zoneId },
        select: { id: true, active: true },
      });
      if (!zone) return { ok: false, errorKey: 'shipping.zone_not_found' };
      if (!zone.active) {
        return { ok: false, errorKey: 'shipping.zone_archived' };
      }
    }

    const after = await prisma.governorateConfig.update({
      where: { code: parsed.data.code },
      data: {
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        deliverable: parsed.data.deliverable,
        zoneId: parsed.data.zoneId,
        position: parsed.data.position,
      },
    });

    // Keep legacy `GovernorateZone` in lock-step so `lib/shipping/resolve.ts`
    // continues to find the mapping until Sprint 12 migrates the readers.
    if (parsed.data.zoneId) {
      await prisma.governorateZone.upsert({
        where: { governorate: parsed.data.code },
        update: { zoneId: parsed.data.zoneId },
        create: {
          governorate: parsed.data.code,
          zoneId: parsed.data.zoneId,
        },
      });
    } else {
      // Unassigning the zone — also clear the legacy mapping so the resolver
      // returns `unknownZone=true` instead of pointing at a stale zone.
      await prisma.governorateZone
        .delete({ where: { governorate: parsed.data.code } })
        .catch(() => null);
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.governorate.update',
        entityType: 'GovernorateConfig',
        entityId: parsed.data.code,
        before: {
          nameAr: before.nameAr,
          nameEn: before.nameEn,
          deliverable: before.deliverable,
          zoneId: before.zoneId,
          position: before.position,
        } as never,
        after: {
          nameAr: after.nameAr,
          nameEn: after.nameEn,
          deliverable: after.deliverable,
          zoneId: after.zoneId,
          position: after.position,
        } as never,
      },
    });

    revalidatePath('/admin/settings/governorates');
    revalidatePath('/admin/settings/shipping');
    revalidatePath('/checkout');
    revalidatePath('/account/addresses');
    return { ok: true, data: { saved: true } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message, code: parsed.data.code },
      'settings.governorate.update_failed',
    );
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}

// ---------------------------------------------------------------------------
// ShippingZone — extended CRUD (Sprint 11.5)
// ---------------------------------------------------------------------------

const slugRegex = /^[A-Z][A-Z0-9_]{1,40}$/;
function autoSlug(nameEn: string): string {
  const cleaned = nameEn
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return cleaned || `ZONE_${Date.now().toString(36).toUpperCase()}`;
}

const createZoneSchema = z.object({
  nameAr: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(80),
  code: z.string().regex(slugRegex).optional(),
  baseRateEgp: z.number().min(0).max(10000),
  freeShippingThresholdB2cEgp: z.number().min(0).nullable(),
  freeShippingThresholdB2bEgp: z.number().min(0).nullable(),
  codEnabled: z.boolean(),
  estimatedDeliveryDaysMin: z.number().int().min(0).max(60),
  estimatedDeliveryDaysMax: z.number().int().min(0).max(60),
});

export type CreateZoneInput = z.infer<typeof createZoneSchema>;

export async function createShippingZoneAction(
  input: CreateZoneInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = createZoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };
  if (
    parsed.data.estimatedDeliveryDaysMin > parsed.data.estimatedDeliveryDaysMax
  ) {
    return { ok: false, errorKey: 'shipping.delivery_days_invalid' };
  }
  try {
    const code = parsed.data.code ?? autoSlug(parsed.data.nameEn);
    // Uniqueness pre-check + auto-disambiguate
    let finalCode = code;
    let suffix = 1;
    while (
      await prisma.shippingZone.findUnique({ where: { code: finalCode } })
    ) {
      suffix += 1;
      finalCode = `${code}_${suffix}`;
      if (suffix > 50) break;
    }

    const maxPos = await prisma.shippingZone.aggregate({
      _max: { position: true },
    });
    const position = (maxPos._max.position ?? 0) + 1;

    const created = await prisma.shippingZone.create({
      data: {
        code: finalCode,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        baseRateEgp: parsed.data.baseRateEgp,
        freeShippingThresholdB2cEgp: parsed.data.freeShippingThresholdB2cEgp,
        freeShippingThresholdB2bEgp: parsed.data.freeShippingThresholdB2bEgp,
        codEnabled: parsed.data.codEnabled,
        estimatedDeliveryDaysMin: parsed.data.estimatedDeliveryDaysMin,
        estimatedDeliveryDaysMax: parsed.data.estimatedDeliveryDaysMax,
        position,
        active: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.shipping.zone.create',
        entityType: 'ShippingZone',
        entityId: created.id,
        after: {
          code: created.code,
          nameAr: created.nameAr,
          nameEn: created.nameEn,
          baseRateEgp: Number(created.baseRateEgp),
          estimatedDeliveryDaysMin: created.estimatedDeliveryDaysMin,
          estimatedDeliveryDaysMax: created.estimatedDeliveryDaysMax,
        } as never,
      },
    });

    revalidatePath('/admin/settings/shipping');
    revalidatePath('/admin/settings/governorates');
    return { ok: true, data: { id: created.id, code: created.code } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      'settings.shipping.zone.create_failed',
    );
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}

const updateZoneSchema = z.object({
  id: z.string().min(1),
  nameAr: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(80),
  baseRateEgp: z.number().min(0).max(10000),
  freeShippingThresholdB2cEgp: z.number().min(0).nullable(),
  freeShippingThresholdB2bEgp: z.number().min(0).nullable(),
  codEnabled: z.boolean(),
  estimatedDeliveryDaysMin: z.number().int().min(0).max(60),
  estimatedDeliveryDaysMax: z.number().int().min(0).max(60),
  active: z.boolean(),
});

export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;

export async function updateShippingZoneFullAction(
  input: UpdateZoneInput,
): Promise<ActionResult<{ saved: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = updateZoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };
  if (
    parsed.data.estimatedDeliveryDaysMin > parsed.data.estimatedDeliveryDaysMax
  ) {
    return { ok: false, errorKey: 'shipping.delivery_days_invalid' };
  }
  try {
    const before = await prisma.shippingZone.findUnique({
      where: { id: parsed.data.id },
      include: {
        _count: {
          select: {
            governorateConfigs: { where: { deliverable: true } },
          },
        },
      },
    });
    if (!before) return { ok: false, errorKey: 'shipping.zone_not_found' };

    // Block archive when deliverable governorates still point at this zone.
    if (
      before.active &&
      !parsed.data.active &&
      before._count.governorateConfigs > 0
    ) {
      return { ok: false, errorKey: 'shipping.zone_has_governorates' };
    }

    const after = await prisma.shippingZone.update({
      where: { id: parsed.data.id },
      data: {
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        baseRateEgp: parsed.data.baseRateEgp,
        freeShippingThresholdB2cEgp: parsed.data.freeShippingThresholdB2cEgp,
        freeShippingThresholdB2bEgp: parsed.data.freeShippingThresholdB2bEgp,
        codEnabled: parsed.data.codEnabled,
        estimatedDeliveryDaysMin: parsed.data.estimatedDeliveryDaysMin,
        estimatedDeliveryDaysMax: parsed.data.estimatedDeliveryDaysMax,
        active: parsed.data.active,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.shipping.zone.update',
        entityType: 'ShippingZone',
        entityId: after.id,
        before: {
          nameAr: before.nameAr,
          nameEn: before.nameEn,
          baseRateEgp: Number(before.baseRateEgp),
          estimatedDeliveryDaysMin: before.estimatedDeliveryDaysMin,
          estimatedDeliveryDaysMax: before.estimatedDeliveryDaysMax,
          active: before.active,
        } as never,
        after: {
          nameAr: after.nameAr,
          nameEn: after.nameEn,
          baseRateEgp: Number(after.baseRateEgp),
          estimatedDeliveryDaysMin: after.estimatedDeliveryDaysMin,
          estimatedDeliveryDaysMax: after.estimatedDeliveryDaysMax,
          active: after.active,
        } as never,
      },
    });

    revalidatePath('/admin/settings/shipping');
    revalidatePath('/admin/settings/governorates');
    revalidatePath('/checkout');
    return { ok: true, data: { saved: true } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message, id: parsed.data.id },
      'settings.shipping.zone.update_failed',
    );
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}

const deleteZoneSchema = z.object({ id: z.string().min(1) });

export async function deleteShippingZoneAction(
  input: z.infer<typeof deleteZoneSchema>,
): Promise<ActionResult<{ deleted: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = deleteZoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  try {
    const zone = await prisma.shippingZone.findUnique({
      where: { id: parsed.data.id },
      include: {
        _count: {
          select: {
            governorateConfigs: true,
            governorates: true,
          },
        },
      },
    });
    if (!zone) return { ok: false, errorKey: 'shipping.zone_not_found' };
    if (zone._count.governorateConfigs > 0 || zone._count.governorates > 0) {
      return { ok: false, errorKey: 'shipping.zone_has_governorates' };
    }
    // Don't allow hard-deleting the 5 seed zones — they're referenced by
    // historical orders + the audit log via `code`. The admin can archive
    // them instead (active=false).
    const SEED_CODES = new Set([
      'GREATER_CAIRO',
      'ALEX_DELTA',
      'CANAL_SUEZ',
      'UPPER_EGYPT',
      'SINAI_RED_SEA_REMOTE',
    ]);
    if (SEED_CODES.has(zone.code)) {
      return { ok: false, errorKey: 'shipping.zone_seed_protected' };
    }

    await prisma.shippingZone.delete({ where: { id: parsed.data.id } });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.shipping.zone.delete',
        entityType: 'ShippingZone',
        entityId: parsed.data.id,
        before: {
          code: zone.code,
          nameAr: zone.nameAr,
          nameEn: zone.nameEn,
        } as never,
      },
    });

    revalidatePath('/admin/settings/shipping');
    revalidatePath('/admin/settings/governorates');
    return { ok: true, data: { deleted: true } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message, id: parsed.data.id },
      'settings.shipping.zone.delete_failed',
    );
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}
