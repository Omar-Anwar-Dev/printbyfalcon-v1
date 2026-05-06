/**
 * Sprint 11.5 — Deliverable governorate list helpers.
 *
 * Single source of truth for the address-form governorate dropdown +
 * checkout enforcement. Reads from `GovernorateConfig` (Sprint 11.5 admin-
 * editable surface), filters to `deliverable=true`, and joins each row to
 * its `ShippingZone` so checkout can show estimated delivery days inline.
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';
import type { Governorate } from '@prisma/client';

export type DeliverableGovernorate = {
  code: Governorate;
  nameAr: string;
  nameEn: string;
  zoneId: string | null;
  zoneNameAr: string | null;
  zoneNameEn: string | null;
  estimatedDeliveryDaysMin: number | null;
  estimatedDeliveryDaysMax: number | null;
};

/** Returns all governorates flagged `deliverable=true`, ordered by `position`. */
export const getDeliverableGovernorates = cache(
  async (): Promise<DeliverableGovernorate[]> => {
    const rows = await prisma.governorateConfig.findMany({
      where: { deliverable: true },
      orderBy: { position: 'asc' },
      include: {
        zone: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            estimatedDeliveryDaysMin: true,
            estimatedDeliveryDaysMax: true,
            active: true,
          },
        },
      },
    });
    return rows.map((r) => ({
      code: r.code,
      nameAr: r.nameAr,
      nameEn: r.nameEn,
      zoneId: r.zoneId,
      zoneNameAr: r.zone?.active ? r.zone.nameAr : null,
      zoneNameEn: r.zone?.active ? r.zone.nameEn : null,
      estimatedDeliveryDaysMin: r.zone?.active
        ? r.zone.estimatedDeliveryDaysMin
        : null,
      estimatedDeliveryDaysMax: r.zone?.active
        ? r.zone.estimatedDeliveryDaysMax
        : null,
    }));
  },
);

/**
 * Throws-style guard: returns true iff the governorate is currently
 * configured as `deliverable=true`. Used by checkout + address actions to
 * reject submissions targeting a deactivated governorate.
 */
export async function isGovernorateDeliverable(
  code: Governorate,
): Promise<boolean> {
  const row = await prisma.governorateConfig.findUnique({
    where: { code },
    select: { deliverable: true },
  });
  return Boolean(row?.deliverable);
}
