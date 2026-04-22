/**
 * Shipping quote resolver (Sprint 9 S9-D1-T3 / S9-D2-T1).
 *
 * Given a `governorate` + cart `subtotalEgp` + customer type, returns the
 * zone id, base rate, whether free shipping kicks in, final shipping cost,
 * and COD availability. Single call from the checkout page + the
 * createOrderAction so the quote seen on screen is byte-identical to what
 * lands on the Order row.
 *
 * Rules:
 * 1. Governorate → ShippingZone via `GovernorateZone`. If no mapping
 *    exists (shouldn't happen post-seed), returns `unknownZone = true`
 *    and caller surfaces an error.
 * 2. Free shipping threshold: zone-specific override first
 *    (`ShippingZone.freeShippingThresholdB2c/b2bEgp`), else global
 *    default from `Setting shipping.freeShipThresholds`.
 * 3. COD availability = `ShippingZone.codEnabled && cod.policy.enabled
 *    && subtotal <= cod.policy.maxOrderEgp`.
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';
import type { Governorate } from '@prisma/client';
import { getFreeShipThresholds } from '@/lib/settings/shipping';
import {
  getCodPolicy,
  computeCodFee,
  type CodPolicy,
} from '@/lib/settings/cod';

export type ViewerType = 'B2C' | 'B2B';

export type ShippingQuote = {
  unknownZone: boolean;
  zoneId: string | null;
  zoneCode: string | null;
  zoneNameAr: string | null;
  zoneNameEn: string | null;
  baseRateEgp: number;
  freeShippingThresholdEgp: number;
  freeShipped: boolean;
  shippingEgp: number;
  codAvailable: boolean;
  codFeeEgp: number;
  codPolicy: CodPolicy;
};

export async function resolveShippingQuote({
  governorate,
  subtotalEgp,
  viewer,
  method,
}: {
  governorate: Governorate;
  subtotalEgp: number;
  viewer: ViewerType;
  /// 'COD' applies the COD fee; anything else returns codFeeEgp = 0.
  method?: 'COD' | string;
}): Promise<ShippingQuote> {
  const [mapping, thresholds, codPolicy] = await Promise.all([
    prisma.governorateZone.findUnique({
      where: { governorate },
      select: {
        zone: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
            baseRateEgp: true,
            freeShippingThresholdB2cEgp: true,
            freeShippingThresholdB2bEgp: true,
            codEnabled: true,
          },
        },
      },
    }),
    getFreeShipThresholds(),
    getCodPolicy(),
  ]);

  if (!mapping?.zone) {
    return {
      unknownZone: true,
      zoneId: null,
      zoneCode: null,
      zoneNameAr: null,
      zoneNameEn: null,
      baseRateEgp: 0,
      freeShippingThresholdEgp: 0,
      freeShipped: false,
      shippingEgp: 0,
      codAvailable: false,
      codFeeEgp: 0,
      codPolicy,
    };
  }

  const zone = mapping.zone;
  const thresholdOverride =
    viewer === 'B2B'
      ? zone.freeShippingThresholdB2bEgp
      : zone.freeShippingThresholdB2cEgp;
  const threshold =
    thresholdOverride !== null
      ? Number(thresholdOverride)
      : viewer === 'B2B'
        ? thresholds.b2bEgp
        : thresholds.b2cEgp;

  const baseRate = Number(zone.baseRateEgp);
  const freeShipped = subtotalEgp >= threshold;
  const shippingEgp = freeShipped ? 0 : baseRate;

  const codAvailable =
    zone.codEnabled &&
    codPolicy.enabled &&
    subtotalEgp <= codPolicy.maxOrderEgp;
  const codFeeEgp =
    method === 'COD' && codAvailable
      ? computeCodFee(subtotalEgp, codPolicy)
      : 0;

  return {
    unknownZone: false,
    zoneId: zone.id,
    zoneCode: zone.code,
    zoneNameAr: zone.nameAr,
    zoneNameEn: zone.nameEn,
    baseRateEgp: baseRate,
    freeShippingThresholdEgp: threshold,
    freeShipped,
    shippingEgp,
    codAvailable,
    codFeeEgp,
    codPolicy,
  };
}

/** Cached loader of all zones + their governorate lists — used by admin UI. */
export const getAllShippingZones = cache(async () => {
  return prisma.shippingZone.findMany({
    orderBy: { position: 'asc' },
    include: {
      governorates: {
        orderBy: { governorate: 'asc' },
        select: { governorate: true },
      },
    },
  });
});
