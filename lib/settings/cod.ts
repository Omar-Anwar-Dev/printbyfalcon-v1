/**
 * COD policy (Sprint 9 S9-D3-T3). Global toggle + fee + max-order cap.
 * Per-zone on/off lives on `ShippingZone.codEnabled` (admin flips a zone
 * without touching the global policy — useful for Sinai/Red Sea when a
 * courier refuses cash collection there).
 *
 * Fee can be a fixed EGP amount or a percent of subtotal; enforced at
 * checkout by `computeCodFee()`. Max-order gate hides COD entirely when
 * `subtotal > maxOrderEgp` so the customer can't slip through.
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';

const SETTING_KEY = 'cod.policy';

export type CodFeeType = 'FIXED' | 'PERCENT';

export type CodPolicy = {
  enabled: boolean;
  feeType: CodFeeType;
  /// FIXED → EGP. PERCENT → points (e.g. 2 = 2% of subtotal).
  feeValue: number;
  /// Max subtotal (before shipping + VAT) that qualifies for COD.
  maxOrderEgp: number;
};

const DEFAULTS: CodPolicy = {
  enabled: true,
  feeType: 'FIXED',
  feeValue: 20,
  maxOrderEgp: 15000,
};

export const getCodPolicy = cache(async (): Promise<CodPolicy> => {
  const row = await prisma.setting.findUnique({
    where: { key: SETTING_KEY },
    select: { value: true },
  });
  if (!row?.value) return DEFAULTS;
  const val = row.value as Partial<CodPolicy>;
  return {
    enabled: typeof val.enabled === 'boolean' ? val.enabled : DEFAULTS.enabled,
    feeType: val.feeType === 'PERCENT' ? 'PERCENT' : 'FIXED',
    feeValue:
      typeof val.feeValue === 'number' && val.feeValue >= 0
        ? val.feeValue
        : DEFAULTS.feeValue,
    maxOrderEgp:
      typeof val.maxOrderEgp === 'number' && val.maxOrderEgp > 0
        ? val.maxOrderEgp
        : DEFAULTS.maxOrderEgp,
  };
});

export async function setCodPolicy(
  value: CodPolicy,
  updatedBy: string,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: value as never, updatedBy },
    update: { value: value as never, updatedBy },
  });
}

/**
 * Compute the COD fee EGP for a given subtotal under the given policy.
 * Caller decides whether COD is eligible at all (zone + maxOrder checks).
 */
export function computeCodFee(subtotalEgp: number, policy: CodPolicy): number {
  if (!policy.enabled) return 0;
  if (policy.feeType === 'FIXED') return roundEgp(policy.feeValue);
  return roundEgp((subtotalEgp * policy.feeValue) / 100);
}

function roundEgp(n: number): number {
  return Math.round(n * 100) / 100;
}
