import { describe, expect, it } from 'vitest';
import {
  b2bApplicationApproveSchema,
  b2bApplicationSchema,
  companyUpdateSchema,
} from './b2b';

/**
 * Regression test for the Sprint 7 `validation.invalid` hotfix — when an
 * optional form input isn't rendered (conditional field like `creditLimitEgp`
 * only shown for `creditTerms === 'CUSTOM'`), `formData.get('x')` returns
 * `null`. `.optional()` rejects `null` because null is not `undefined`.
 * `.nullish()` accepts both.
 */

describe('b2bApplicationApproveSchema — null FormData handling', () => {
  it('accepts null creditLimitEgp when creditTerms is not CUSTOM', () => {
    const r = b2bApplicationApproveSchema.safeParse({
      applicationId: 'app_1',
      pricingTierCode: 'B',
      creditTerms: 'NET_15',
      creditLimitEgp: null,
      note: 'welcome email',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.creditLimitEgp).toBeNull();
      expect(r.data.note).toBe('welcome email');
    }
  });

  it('accepts null note', () => {
    const r = b2bApplicationApproveSchema.safeParse({
      applicationId: 'app_1',
      pricingTierCode: 'A',
      creditTerms: 'NONE',
      creditLimitEgp: null,
      note: null,
    });
    expect(r.success).toBe(true);
  });

  it('still accepts a valid numeric creditLimitEgp string for CUSTOM', () => {
    const r = b2bApplicationApproveSchema.safeParse({
      applicationId: 'app_1',
      pricingTierCode: 'C',
      creditTerms: 'CUSTOM',
      creditLimitEgp: '50000',
      note: '',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.creditLimitEgp).toBe(50_000);
    }
  });
});

describe('companyUpdateSchema — null FormData handling', () => {
  it('accepts null creditLimitEgp for the terms editor', () => {
    const r = companyUpdateSchema.safeParse({
      companyId: 'co_1',
      pricingTierCode: 'B',
      creditTerms: 'NONE',
      creditLimitEgp: null,
      status: 'ACTIVE',
      checkoutPolicy: 'BOTH',
    });
    expect(r.success).toBe(true);
  });
});

describe('b2bApplicationSchema — optional strings', () => {
  it('accepts null addressLine + null monthlyVolumeEstimate', () => {
    const r = b2bApplicationSchema.safeParse({
      companyName: 'Nile Co.',
      crNumber: '12345',
      taxCardNumber: '987654',
      contactName: 'Hala Farouk',
      phone: '01012345678',
      email: 'hala@nile.example',
      password: 'SecureP@ss1',
      governorate: 'CAIRO',
      city: 'New Cairo',
      addressLine: null,
      monthlyVolumeEstimate: null,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.addressLine).toBeUndefined();
      expect(r.data.monthlyVolumeEstimate).toBeUndefined();
    }
  });
});
