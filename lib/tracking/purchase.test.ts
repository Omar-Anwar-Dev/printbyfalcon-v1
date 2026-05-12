import { describe, expect, it } from 'vitest';
import { buildPurchaseCustomData } from './purchase';

describe('buildPurchaseCustomData', () => {
  it('builds the canonical Meta Purchase shape', () => {
    const out = buildPurchaseCustomData({
      orderNumber: 'ORD-26-1005-00007',
      totalEgp: 460,
      items: [
        { productId: 'prod-a', qty: 2, unitPriceEgp: 200 },
        { productId: 'prod-b', qty: 1, unitPriceEgp: 60 },
      ],
    });
    expect(out).toEqual({
      content_type: 'product',
      content_ids: ['prod-a', 'prod-b'],
      contents: [
        { id: 'prod-a', quantity: 2, item_price: 200 },
        { id: 'prod-b', quantity: 1, item_price: 60 },
      ],
      num_items: 3,
      value: 460,
      currency: 'EGP',
      order_id: 'ORD-26-1005-00007',
    });
  });

  it('filters items with null productId out of content_ids/contents but keeps them in num_items', () => {
    const out = buildPurchaseCustomData({
      orderNumber: 'ORD-X',
      totalEgp: 100,
      items: [
        { productId: 'prod-a', qty: 1, unitPriceEgp: 50 },
        { productId: null, qty: 2, unitPriceEgp: 25 }, // archived/deleted product
      ],
    });
    expect(out.content_ids).toEqual(['prod-a']);
    expect(out.contents).toEqual([
      { id: 'prod-a', quantity: 1, item_price: 50 },
    ]);
    // num_items still counts ALL units, even the orphan rows — Meta's
    // "how many things did you sell" stays accurate.
    expect(out.num_items).toBe(3);
  });

  it('handles empty cart gracefully', () => {
    const out = buildPurchaseCustomData({
      orderNumber: 'ORD-X',
      totalEgp: 0,
      items: [],
    });
    expect(out.content_ids).toEqual([]);
    expect(out.contents).toEqual([]);
    expect(out.num_items).toBe(0);
    expect(out.value).toBe(0);
    expect(out.currency).toBe('EGP');
  });

  it('always sets currency to EGP', () => {
    // The type system locks `currency` to `'EGP' | undefined`; this asserts
    // the builder actually emits it (vs. leaving undefined).
    const out = buildPurchaseCustomData({
      orderNumber: 'X',
      totalEgp: 1,
      items: [{ productId: 'a', qty: 1, unitPriceEgp: 1 }],
    });
    expect(out.currency).toBe('EGP');
  });
});
