/**
 * Sprint 9 S9-D5 — promo code validation + discount computation.
 * DB-free tests — `validatePromoCode` hits prisma, so we cover the pure
 * `computeDiscount` helper here + `tryConsumePromoCode` math in the
 * runtime suite against a live DB.
 */
import { describe, expect, it } from 'vitest';
import { computeDiscount } from './validate';

describe('computeDiscount', () => {
  it('PERCENT 10% on 1000 EGP = 100', () => {
    expect(computeDiscount('PERCENT', 10, 1000)).toBe(100);
  });

  it('PERCENT 100% clamps to subtotal', () => {
    expect(computeDiscount('PERCENT', 100, 750)).toBe(750);
  });

  it('PERCENT rounds EGP to 2dp', () => {
    expect(computeDiscount('PERCENT', 7, 33.33)).toBeCloseTo(2.33, 2);
  });

  it('FIXED amount clamps to subtotal when larger', () => {
    expect(computeDiscount('FIXED', 500, 300)).toBe(300);
  });

  it('FIXED amount untouched when below subtotal', () => {
    expect(computeDiscount('FIXED', 50, 300)).toBe(50);
  });

  it('returns 0 for zero subtotal, regardless of type', () => {
    expect(computeDiscount('PERCENT', 50, 0)).toBe(0);
    expect(computeDiscount('FIXED', 100, 0)).toBe(0);
  });
});
