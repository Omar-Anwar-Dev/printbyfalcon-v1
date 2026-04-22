/**
 * Promo code validation + discount calculation (Sprint 9 S9-D5-T2 / T3).
 *
 * Validation (read-only, call from checkout preview): checks code exists,
 * active, within date window, within usage cap, and cart meets minOrder.
 *
 * Atomic increment (S9-D5-T3): conditional `updateMany` that bumps
 * `usedCount` only when it's strictly below `usageLimit`. If zero rows
 * updated → the code is exhausted — caller raises an error so the order
 * rolls back. Same race-safe pattern as ADR-036 inventory decrement.
 *
 * MVP rule: one promo code per order (enforced by `Order.promoCodeId`
 * being a scalar FK + caller validating only one code at a time).
 */
import type { PromoCode, PromoCodeType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type PromoValidationError =
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'usage_limit_reached'
  | 'min_order_not_met';

export type PromoValidationResult =
  | { ok: true; promoCode: PromoCode; discountEgp: number }
  | { ok: false; error: PromoValidationError };

/**
 * Validate a promo code at checkout preview. `subtotalEgp` is the cart
 * subtotal AFTER B2B tier/override discounts — promo code stacks on top.
 */
export async function validatePromoCode(
  code: string,
  subtotalEgp: number,
  now: Date = new Date(),
): Promise<PromoValidationResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: 'not_found' };
  const row = await prisma.promoCode.findUnique({
    where: { code: normalized },
  });
  if (!row) return { ok: false, error: 'not_found' };
  if (!row.active) return { ok: false, error: 'inactive' };
  if (row.validFrom && now < row.validFrom)
    return { ok: false, error: 'not_started' };
  if (row.validTo && now > row.validTo) return { ok: false, error: 'expired' };
  if (row.usageLimit !== null && row.usedCount >= row.usageLimit)
    return { ok: false, error: 'usage_limit_reached' };
  const minOrder = row.minOrderEgp !== null ? Number(row.minOrderEgp) : 0;
  if (subtotalEgp < minOrder) return { ok: false, error: 'min_order_not_met' };

  const discountEgp = computeDiscount(
    row.type,
    Number(row.value),
    subtotalEgp,
    row.maxDiscountEgp !== null ? Number(row.maxDiscountEgp) : null,
  );
  return { ok: true, promoCode: row, discountEgp };
}

export function computeDiscount(
  type: PromoCodeType,
  value: number,
  subtotalEgp: number,
  maxDiscountEgp: number | null = null,
): number {
  let discount: number;
  if (type === 'PERCENT') {
    discount = (subtotalEgp * value) / 100;
  } else {
    // FIXED.
    discount = value;
  }
  // Apply optional absolute cap.
  if (maxDiscountEgp !== null && maxDiscountEgp >= 0) {
    discount = Math.min(discount, maxDiscountEgp);
  }
  // Never exceed the subtotal itself.
  return roundEgp(Math.min(discount, subtotalEgp));
}

/**
 * Atomically increment `usedCount` by 1 when it's strictly below the
 * usageLimit. Pass the same `tx` as the order-creation transaction so a
 * mid-flow failure rolls both back.
 *
 * @returns the updated row, or null when the code is exhausted (caller
 *          must abort the transaction).
 */
export async function tryConsumePromoCode(
  tx: Prisma.TransactionClient,
  promoCodeId: string,
): Promise<PromoCode | null> {
  const code = await tx.promoCode.findUnique({ where: { id: promoCodeId } });
  if (!code) return null;
  if (code.usageLimit === null) {
    // Unlimited — just bump the counter (no guard needed).
    return tx.promoCode.update({
      where: { id: promoCodeId },
      data: { usedCount: { increment: 1 } },
    });
  }
  // Guarded increment: only if usedCount < usageLimit. Matches ADR-036.
  const hit = await tx.promoCode.updateMany({
    where: { id: promoCodeId, usedCount: { lt: code.usageLimit } },
    data: { usedCount: { increment: 1 } },
  });
  if (hit.count === 0) return null;
  return tx.promoCode.findUniqueOrThrow({ where: { id: promoCodeId } });
}

function roundEgp(n: number): number {
  return Math.round(n * 100) / 100;
}
