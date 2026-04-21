/**
 * Storefront pricing helpers — glue between catalog list queries and the
 * resolver. Keeps the "fetch user + context + resolve a batch" ceremony
 * out of every page component.
 */
import { getOptionalUser } from '@/lib/auth';
import { getPricingContextForUser } from '@/lib/pricing/context';
import { resolvePrices, type PricingContext } from '@/lib/pricing/resolve';

export type ViewerPrices = {
  ctx: PricingContext;
  /** productId → final price (Decimal-string), rounded to 2 decimals. */
  priceById: Map<string, string>;
};

/**
 * Batch-resolve catalog prices for the current viewer. Pass the list items
 * you already fetched; returns a Map from productId → final EGP price as a
 * Decimal-string (matching ProductListItem.basePriceEgp shape).
 */
export async function resolveViewerPrices<
  T extends { id: string; basePriceEgp: string | number },
>(items: readonly T[]): Promise<ViewerPrices> {
  const user = await getOptionalUser();
  const ctx = await getPricingContextForUser(user);
  const resolved = resolvePrices(items, ctx);
  const priceById = new Map<string, string>();
  for (const [id, r] of resolved) {
    priceById.set(id, r.finalPriceEgp.toString());
  }
  return { ctx, priceById };
}
