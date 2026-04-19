/**
 * Stock status resolution — placeholder until Sprint 6 wires the real
 * `Inventory` + `InventoryReservation` tables.
 *
 * MVP behaviour:
 *  - ACTIVE products return `IN_STOCK`.
 *  - Any product fetched via the ARCHIVED path gets `OUT_OF_STOCK` (rare; the
 *    public storefront filters those out, so this branch is defensive).
 *
 * Sprint 6 will replace `getStockStatus` body with:
 *   SELECT current_qty - SUM(active reservations) FROM Inventory WHERE ...
 *   and map:
 *     <= 0             → OUT_OF_STOCK
 *     > 0 && < low_threshold → LOW_STOCK
 *     >= low_threshold → IN_STOCK
 * Every caller only needs the `StockStatus` enum — the API is stable.
 */

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function getStockStatus(product: {
  status: 'ACTIVE' | 'ARCHIVED';
}): StockStatus {
  return product.status === 'ACTIVE' ? 'IN_STOCK' : 'OUT_OF_STOCK';
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
