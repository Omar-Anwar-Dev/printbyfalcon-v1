import { describe, expect, it } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { resolvePrice, resolvePrices } from './resolve';

const product = (id: string, base: number) => ({
  id,
  basePriceEgp: new Decimal(base),
});

describe('resolvePrice', () => {
  it('returns base price for guests / B2C (no tier, no overrides)', () => {
    const r = resolvePrice(product('p1', 1000));
    expect(r.source).toBe('base');
    expect(r.finalPriceEgp.toString()).toBe('1000');
    expect(r.discountEgp.toString()).toBe('0');
  });

  it('applies tier A (10%) discount', () => {
    const r = resolvePrice(product('p1', 1000), {
      tier: { code: 'A', defaultDiscountPercent: 10 },
    });
    expect(r.source).toBe('tier');
    expect(r.finalPriceEgp.toString()).toBe('900');
    expect(r.discountEgp.toString()).toBe('100');
  });

  it('applies tier B (15%) discount with half-even rounding', () => {
    const r = resolvePrice(product('p1', 1234.56), {
      tier: { code: 'B', defaultDiscountPercent: 15 },
    });
    expect(r.source).toBe('tier');
    // 1234.56 * 0.85 = 1049.376 → 1049.38 (half-even rounds .005 to even)
    expect(r.finalPriceEgp.toString()).toBe('1049.38');
  });

  it('tier C without percent behaves like base when no override exists', () => {
    const r = resolvePrice(product('p1', 500), {
      tier: { code: 'C', defaultDiscountPercent: null },
    });
    expect(r.source).toBe('base');
    expect(r.finalPriceEgp.toString()).toBe('500');
  });

  it('per-SKU override wins over tier discount', () => {
    const r = resolvePrice(product('p1', 1000), {
      tier: { code: 'A', defaultDiscountPercent: 10 },
      overrides: new Map([['p1', 700]]),
    });
    expect(r.source).toBe('override');
    expect(r.finalPriceEgp.toString()).toBe('700');
    expect(r.discountEgp.toString()).toBe('300');
  });

  it('override that exceeds base price reports zero discount (not negative)', () => {
    const r = resolvePrice(product('p1', 500), {
      overrides: new Map([['p1', 600]]),
    });
    expect(r.source).toBe('override');
    expect(r.finalPriceEgp.toString()).toBe('600');
    expect(r.discountEgp.toString()).toBe('0');
  });

  it('missing override in map falls through to tier', () => {
    const r = resolvePrice(product('p1', 1000), {
      tier: { code: 'B', defaultDiscountPercent: 15 },
      overrides: new Map([['other-product', 100]]),
    });
    expect(r.source).toBe('tier');
    expect(r.finalPriceEgp.toString()).toBe('850');
  });

  it('accepts string / Decimal / number for basePriceEgp interchangeably', () => {
    const rStr = resolvePrice({ id: 'p1', basePriceEgp: '1000' }, {});
    const rDec = resolvePrice(
      { id: 'p1', basePriceEgp: new Decimal(1000) },
      {},
    );
    const rNum = resolvePrice({ id: 'p1', basePriceEgp: 1000 }, {});
    expect(rStr.finalPriceEgp.toString()).toBe('1000');
    expect(rDec.finalPriceEgp.toString()).toBe('1000');
    expect(rNum.finalPriceEgp.toString()).toBe('1000');
  });
});

describe('resolvePrices', () => {
  it('batches resolution sharing a single context', () => {
    const out = resolvePrices(
      [product('a', 100), product('b', 200), product('c', 300)],
      {
        tier: { code: 'A', defaultDiscountPercent: 10 },
        overrides: new Map([['b', 150]]),
      },
    );
    expect(out.get('a')?.finalPriceEgp.toString()).toBe('90');
    expect(out.get('a')?.source).toBe('tier');
    expect(out.get('b')?.finalPriceEgp.toString()).toBe('150');
    expect(out.get('b')?.source).toBe('override');
    expect(out.get('c')?.finalPriceEgp.toString()).toBe('270');
    expect(out.get('c')?.source).toBe('tier');
  });

  it('empty products list returns empty map', () => {
    expect(resolvePrices([]).size).toBe(0);
  });
});
