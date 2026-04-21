/**
 * Global low-stock threshold (Sprint 6 S6-D3-T2). Stored in the generic
 * `Setting` KV under `inventory.lowStockGlobalDefault`. Per-SKU overrides live
 * on `Inventory.lowStockThreshold` and win when non-null; otherwise this value
 * is used. Default: 5 units (owner decision, Sprint 6 kickoff).
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';

const SETTING_KEY = 'inventory.lowStockGlobalDefault';
export const GLOBAL_THRESHOLD_DEFAULT = 5;

export const getGlobalLowStockThreshold = cache(async (): Promise<number> => {
  const row = await prisma.setting.findUnique({
    where: { key: SETTING_KEY },
    select: { value: true },
  });
  const raw = row?.value as unknown;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return raw;
  return GLOBAL_THRESHOLD_DEFAULT;
});

export async function setGlobalLowStockThreshold(
  value: number,
  updatedBy: string,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    create: {
      key: SETTING_KEY,
      value: value as never,
      updatedBy,
    },
    update: {
      value: value as never,
      updatedBy,
    },
  });
}

/**
 * Resolve the effective threshold for a product. Per-SKU override wins when
 * non-null; otherwise the global default is used. Caller passes the Inventory
 * row (or its threshold) to avoid a second DB round-trip.
 */
export function effectiveLowStockThreshold(
  perSkuThreshold: number | null | undefined,
  globalDefault: number,
): number {
  if (typeof perSkuThreshold === 'number' && perSkuThreshold >= 0) {
    return perSkuThreshold;
  }
  return globalDefault;
}
