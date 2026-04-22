import { describe, expect, it } from 'vitest';
import {
  canOverrideReturnPolicy,
  checkReturnPolicy,
  parseReturnPolicy,
  type ReturnPolicy,
} from './policy';

const basePolicy: ReturnPolicy = {
  enabled: true,
  windowDays: 14,
  minOrderEgp: null,
  overrideRoles: ['OWNER', 'OPS', 'SALES_REP'],
};

const now = new Date('2026-05-01T12:00:00Z');
const returnable = [{ sku: 'HP-CF259A', returnable: true }];
const nonReturnable = [{ sku: 'INK-A', returnable: false }];

describe('parseReturnPolicy', () => {
  it('returns defaults for missing / non-object input', () => {
    expect(parseReturnPolicy(null).enabled).toBe(true);
    expect(parseReturnPolicy(undefined).windowDays).toBe(14);
    expect(parseReturnPolicy('').minOrderEgp).toBeNull();
  });

  it('coerces bad field values to defaults', () => {
    const p = parseReturnPolicy({
      enabled: true,
      windowDays: -5,
      minOrderEgp: -10,
      overrideRoles: ['WAT', 'OWNER', 42],
    });
    expect(p.windowDays).toBe(14);
    expect(p.minOrderEgp).toBeNull();
    expect(p.overrideRoles).toEqual(['OWNER']);
  });

  it('preserves valid values', () => {
    const p = parseReturnPolicy({
      enabled: false,
      windowDays: 30,
      minOrderEgp: 500,
      overrideRoles: ['OWNER'],
    });
    expect(p).toEqual({
      enabled: false,
      windowDays: 30,
      minOrderEgp: 500,
      overrideRoles: ['OWNER'],
    });
  });
});

describe('checkReturnPolicy', () => {
  it('rejects when disabled', () => {
    const res = checkReturnPolicy(
      { ...basePolicy, enabled: false },
      {
        orderDeliveredAt: new Date('2026-04-28'),
        orderTotalEgp: 1000,
        items: returnable,
      },
      now,
    );
    expect(res.ok).toBe(false);
    expect(res.ok ? null : res.reason).toBe('disabled');
  });

  it('rejects when order was never delivered', () => {
    const res = checkReturnPolicy(
      basePolicy,
      {
        orderDeliveredAt: null,
        orderTotalEgp: 1000,
        items: returnable,
      },
      now,
    );
    expect(res.ok ? null : res.reason).toBe('not_delivered');
  });

  it('rejects when beyond the return window', () => {
    const res = checkReturnPolicy(
      basePolicy,
      {
        orderDeliveredAt: new Date('2026-04-01'), // 30d ago > 14d window
        orderTotalEgp: 1000,
        items: returnable,
      },
      now,
    );
    expect(res.ok).toBe(false);
    if (!res.ok && res.reason === 'window_expired') {
      expect(res.windowDays).toBe(14);
      expect(res.daysSinceDelivery).toBeGreaterThan(14);
    }
  });

  it('accepts when within window + no min order', () => {
    const res = checkReturnPolicy(
      basePolicy,
      {
        orderDeliveredAt: new Date('2026-04-28'), // 3d ago
        orderTotalEgp: 100,
        items: returnable,
      },
      now,
    );
    expect(res.ok).toBe(true);
  });

  it('rejects when order total below min', () => {
    const res = checkReturnPolicy(
      { ...basePolicy, minOrderEgp: 500 },
      {
        orderDeliveredAt: new Date('2026-04-28'),
        orderTotalEgp: 300,
        items: returnable,
      },
      now,
    );
    expect(res.ok).toBe(false);
    if (!res.ok && res.reason === 'min_order') {
      expect(res.minOrderEgp).toBe(500);
      expect(res.orderTotalEgp).toBe(300);
    }
  });

  it('rejects when any item is flagged non-returnable', () => {
    const res = checkReturnPolicy(
      basePolicy,
      {
        orderDeliveredAt: new Date('2026-04-28'),
        orderTotalEgp: 1000,
        items: nonReturnable,
      },
      now,
    );
    expect(res.ok).toBe(false);
    if (!res.ok && res.reason === 'product_not_returnable') {
      expect(res.sku).toBe('INK-A');
    }
  });
});

describe('canOverrideReturnPolicy', () => {
  it('returns false for null role', () => {
    expect(canOverrideReturnPolicy(basePolicy, null)).toBe(false);
  });
  it('returns true when role is in overrideRoles list', () => {
    expect(canOverrideReturnPolicy(basePolicy, 'OPS')).toBe(true);
  });
  it('returns false when role is excluded', () => {
    expect(
      canOverrideReturnPolicy(
        { ...basePolicy, overrideRoles: ['OWNER'] },
        'OPS',
      ),
    ).toBe(false);
  });
});
