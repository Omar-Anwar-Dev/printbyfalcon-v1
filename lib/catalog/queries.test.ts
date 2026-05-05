import { describe, expect, it } from 'vitest';
import { DEFAULT_PRODUCT_SORT, orderByFor, type ProductSort } from './queries';

describe('queries — orderByFor', () => {
  it('default sort is "recommended"', () => {
    expect(DEFAULT_PRODUCT_SORT).toBe('recommended');
  });

  it('"recommended" emits a compound order matching the supporting index', () => {
    expect(orderByFor('recommended')).toEqual([
      { popularityScore: 'desc' },
      { createdAt: 'desc' },
    ]);
  });

  it('falls back to "recommended" order on unknown values (default branch)', () => {
    // Cast to ProductSort to model a stale URL param landing here. Same
    // branch is also taken when callers omit `sort` entirely (see
    // listActiveProducts).
    expect(orderByFor('what-is-this' as unknown as ProductSort)).toEqual([
      { popularityScore: 'desc' },
      { createdAt: 'desc' },
    ]);
  });

  it('"newest" keeps the legacy single-key order', () => {
    expect(orderByFor('newest')).toEqual([{ createdAt: 'desc' }]);
  });

  it('"price-asc" / "price-desc" sort by base price only', () => {
    expect(orderByFor('price-asc')).toEqual([{ basePriceEgp: 'asc' }]);
    expect(orderByFor('price-desc')).toEqual([{ basePriceEgp: 'desc' }]);
  });
});
