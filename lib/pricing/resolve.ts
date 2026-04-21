/**
 * Pricing resolution (Sprint 7).
 *
 * The single source of truth for how a product price is computed for a given
 * viewer. Used across catalog cards, product detail pages, cart, checkout,
 * order placement, and invoice snapshots so negotiated prices stay consistent
 * end-to-end.
 *
 * Resolution order (architecture §5.3 + PRD Feature 4):
 *   1. B2B with an active CompanyPriceOverride → `override` (custom EGP price).
 *   2. B2B with a tier carrying a default percent discount → `tier`
 *      (base * (1 - percent/100)).
 *   3. Everyone else (guests, B2C, B2B without any of the above) → `base`.
 *
 * Prices are Decimal-precise via Decimal.js (Prisma's runtime dep) and
 * half-even rounded to 2 decimal places for display + DB storage.
 */
import { Decimal } from '@prisma/client/runtime/library';
import type { PricingTierCode } from '@prisma/client';

export type PriceSource = 'override' | 'tier' | 'base';

export type PricingContext = {
  /** Null for guests + B2C shoppers. */
  tier?: {
    code: PricingTierCode;
    /** May be null for tier C (no blanket discount). */
    defaultDiscountPercent: Decimal | number | string | null;
  } | null;
  /**
   * Per-product custom prices. Wins over `tier`. Tier C companies rely on
   * this entirely; tier A/B can still carry overrides for specific SKUs.
   */
  overrides?: Map<string, Decimal | number | string>;
};

export type ResolvedPrice = {
  /** The final per-unit EGP price, rounded to 2 decimals. */
  finalPriceEgp: Decimal;
  /** What drove the price — useful for "You save X%" chips, invoice notes. */
  source: PriceSource;
  /** The pre-discount price. Equal to finalPriceEgp when source === 'base'. */
  basePriceEgp: Decimal;
  /**
   * Positive when the B2B price is strictly below the base price. Zero when
   * no discount applied (or when the override happens to equal base).
   */
  discountEgp: Decimal;
};

function toDecimal(
  value: Decimal | number | string | null | undefined,
): Decimal | null {
  if (value == null) return null;
  return value instanceof Decimal ? value : new Decimal(value);
}

function round2(value: Decimal): Decimal {
  // Half-even (banker's rounding) — matches how the UI + invoice arithmetic
  // already round downstream totals. Decimal.ROUND_HALF_EVEN = 6.
  return value.toDecimalPlaces(2, 6);
}

export function resolvePrice(
  product: { id: string; basePriceEgp: Decimal | number | string },
  ctx: PricingContext = {},
): ResolvedPrice {
  const base = round2(new Decimal(product.basePriceEgp as never));

  const override = ctx.overrides?.get(product.id);
  if (override != null) {
    const final = round2(new Decimal(override as never));
    return {
      finalPriceEgp: final,
      source: 'override',
      basePriceEgp: base,
      discountEgp: round2(Decimal.max(base.sub(final), 0)),
    };
  }

  const tierPercent = toDecimal(ctx.tier?.defaultDiscountPercent ?? null);
  if (tierPercent && tierPercent.gt(0)) {
    const discount = base.mul(tierPercent).div(100);
    const final = round2(base.sub(discount));
    return {
      finalPriceEgp: final,
      source: 'tier',
      basePriceEgp: base,
      discountEgp: round2(base.sub(final)),
    };
  }

  return {
    finalPriceEgp: base,
    source: 'base',
    basePriceEgp: base,
    discountEgp: new Decimal(0),
  };
}

/**
 * Batch resolver — the hot path on catalog/search pages. Same resolution
 * rules, applied per product, sharing a single PricingContext (so tier +
 * overrides are fetched once per request, not per row).
 */
export function resolvePrices<
  T extends { id: string; basePriceEgp: Decimal | number | string },
>(
  products: readonly T[],
  ctx: PricingContext = {},
): Map<string, ResolvedPrice> {
  const out = new Map<string, ResolvedPrice>();
  for (const p of products) {
    out.set(p.id, resolvePrice(p, ctx));
  }
  return out;
}
