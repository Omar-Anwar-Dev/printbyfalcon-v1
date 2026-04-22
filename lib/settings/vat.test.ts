/**
 * Sprint 9 S9-D6 — VAT line computation.
 */
import { describe, expect, it } from 'vitest';
import { computeLineVat } from './vat';

describe('computeLineVat', () => {
  it('returns 0 for vat-exempt items', () => {
    expect(computeLineVat(100, 3, true, 14)).toBe(0);
  });

  it('applies rate to unit × qty', () => {
    expect(computeLineVat(100, 3, false, 14)).toBe(42);
  });

  it('returns 0 when rate is 0', () => {
    expect(computeLineVat(100, 3, false, 0)).toBe(0);
  });

  it('rounds to 2dp', () => {
    // 33.33 × 1 × 0.14 = 4.6662 → 4.67
    expect(computeLineVat(33.33, 1, false, 14)).toBeCloseTo(4.67, 2);
  });

  it('fractional rate works', () => {
    expect(computeLineVat(100, 1, false, 10.5)).toBe(10.5);
  });
});
