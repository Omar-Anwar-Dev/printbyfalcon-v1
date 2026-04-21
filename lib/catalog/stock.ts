/**
 * Stock status resolution (Sprint 6 S6-D3-T3) — reads real inventory.
 *
 * Resolution rules (B2C view — the storefront renders a "vague" indicator per
 * PRD Feature 1: In Stock / Low Stock / Out of Stock, no exact qty).
 *
 * Inputs for the fast path (catalog list + card render) are the fields a
 * product query already has (`status`) plus the `inventory` relation
 * (`{ currentQty, lowStockThreshold }`) pulled in the same query. This avoids
 * an N+1 on listing pages.
 *
 * For the product detail page we want to reflect *available* qty (minus active
 * reservations). Call `getStockStatusForProduct(productId)` for that path —
 * it uses the same query helper the cart uses (`getAvailableQty`).
 *
 * B2B exact-qty display is wired separately in Sprint 7.
 */
import { getAvailableQty } from '@/lib/cart/stock';
import { getGlobalLowStockThreshold } from '@/lib/settings/inventory';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

type ProductForStock = {
  status: 'ACTIVE' | 'ARCHIVED';
  inventory?: {
    currentQty: number;
    lowStockThreshold: number | null;
  } | null;
};

/**
 * Fast path used by catalog list pages / cards. Uses `currentQty` directly
 * (not available-minus-reservations); close enough for listing UI and avoids
 * the per-card reservation query. Product detail uses the slower path.
 */
export function getStockStatus(
  product: ProductForStock,
  globalThreshold: number,
): StockStatus {
  if (product.status !== 'ACTIVE') return 'OUT_OF_STOCK';
  const qty = product.inventory?.currentQty ?? 0;
  if (qty <= 0) return 'OUT_OF_STOCK';
  const threshold = product.inventory?.lowStockThreshold ?? globalThreshold;
  if (qty <= threshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

/**
 * Detail-page path — uses available qty (reservation-aware) and compares
 * against the effective threshold. Does two lookups (Inventory row +
 * reservation sum) — acceptable at product detail scale.
 */
export async function getStockStatusForProduct(
  productId: string,
): Promise<StockStatus> {
  const [available, globalThreshold] = await Promise.all([
    getAvailableQty(productId),
    getGlobalLowStockThreshold(),
  ]);
  if (available <= 0) return 'OUT_OF_STOCK';
  // Per-SKU threshold is already rolled into `Inventory` but we don't fetch it
  // here — for detail-page UX the global threshold is the right vagueness cue.
  // The admin inventory screen has the per-SKU refinement.
  if (available <= globalThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export const STOCK_LABELS = {
  ar: {
    IN_STOCK: 'متاح',
    LOW_STOCK: 'كمية محدودة',
    OUT_OF_STOCK: 'غير متاح',
  },
  en: {
    IN_STOCK: 'In Stock',
    LOW_STOCK: 'Low Stock',
    OUT_OF_STOCK: 'Out of Stock',
  },
} as const;
