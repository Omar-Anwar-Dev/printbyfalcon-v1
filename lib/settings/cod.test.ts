/**
 * Sprint 9 S9-D3 — COD fee computation.
 */
import { describe, expect, it } from 'vitest';
import { computeCodFee, type CodPolicy } from './cod';

const basePolicy: CodPolicy = {
  enabled: true,
  feeType: 'FIXED',
  feeValue: 20,
  maxOrderEgp: 15000,
};

describe('computeCodFee', () => {
  it('returns 0 when COD disabled globally', () => {
    expect(computeCodFee(500, { ...basePolicy, enabled: false })).toBe(0);
  });

  it('returns the fixed fee unchanged', () => {
    expect(computeCodFee(500, basePolicy)).toBe(20);
  });

  it('PERCENT fee = subtotal × value/100, rounded to 2dp', () => {
    expect(
      computeCodFee(1500, { ...basePolicy, feeType: 'PERCENT', feeValue: 2 }),
    ).toBe(30);
    expect(
      computeCodFee(333.33, { ...basePolicy, feeType: 'PERCENT', feeValue: 1 }),
    ).toBeCloseTo(3.33, 2);
  });

  it('honours zero fee', () => {
    expect(computeCodFee(500, { ...basePolicy, feeValue: 0 })).toBe(0);
  });
});
