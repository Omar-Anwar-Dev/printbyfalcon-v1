/**
 * VAT rate (Sprint 9 S9-D6-T3). Default 14% per PRD §8 Non-Functional
 * Requirements. Per-product tax-exempt toggle (`Product.vatExempt`) was
 * already in schema; this Setting controls the rate applied to non-exempt
 * items.
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';

const SETTING_KEY = 'vat.rate';

export type VatRate = {
  /// Percentage points: 14 = 14%.
  percent: number;
};

const DEFAULTS: VatRate = { percent: 14 };

export const getVatRate = cache(async (): Promise<VatRate> => {
  const row = await prisma.setting.findUnique({
    where: { key: SETTING_KEY },
    select: { value: true },
  });
  if (!row?.value) return DEFAULTS;
  const val = row.value as Partial<VatRate>;
  return {
    percent:
      typeof val.percent === 'number' && val.percent >= 0
        ? val.percent
        : DEFAULTS.percent,
  };
});

export async function setVatRate(
  value: VatRate,
  updatedBy: string,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: value as never, updatedBy },
    update: { value: value as never, updatedBy },
  });
}

/**
 * Compute VAT EGP for a line price × qty. Caller applies per-item (not on
 * whole subtotal) so `vatExempt` products are skipped cleanly.
 */
export function computeLineVat(
  unitPriceEgp: number,
  qty: number,
  isVatExempt: boolean,
  ratePercent: number,
): number {
  if (isVatExempt) return 0;
  const lineTotal = unitPriceEgp * qty;
  return roundEgp((lineTotal * ratePercent) / 100);
}

function roundEgp(n: number): number {
  return Math.round(n * 100) / 100;
}
