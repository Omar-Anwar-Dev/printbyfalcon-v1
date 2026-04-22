/**
 * Global free-shipping thresholds (Sprint 9 S9-D1-T1).
 *
 * Per-zone thresholds live on `ShippingZone.freeShippingThresholdB2cEgp` /
 * `freeShippingThresholdB2bEgp` (nullable). When null, `resolveShippingQuote`
 * falls back to the global default stored here. Seeded at install (B2C=1500,
 * B2B=5000) and edited via `/admin/settings/shipping`.
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';

const SETTING_KEY = 'shipping.freeShipThresholds';

export type FreeShipThresholds = {
  b2cEgp: number;
  b2bEgp: number;
};

const DEFAULTS: FreeShipThresholds = { b2cEgp: 1500, b2bEgp: 5000 };

export const getFreeShipThresholds = cache(
  async (): Promise<FreeShipThresholds> => {
    const row = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
      select: { value: true },
    });
    if (!row?.value) return DEFAULTS;
    const val = row.value as Partial<FreeShipThresholds>;
    return {
      b2cEgp: typeof val.b2cEgp === 'number' ? val.b2cEgp : DEFAULTS.b2cEgp,
      b2bEgp: typeof val.b2bEgp === 'number' ? val.b2bEgp : DEFAULTS.b2bEgp,
    };
  },
);

export async function setFreeShipThresholds(
  value: FreeShipThresholds,
  updatedBy: string,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: value as never, updatedBy },
    update: { value: value as never, updatedBy },
  });
}
