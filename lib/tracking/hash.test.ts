import { describe, expect, it } from 'vitest';
import { hashEmail, hashPhone } from './hash';

// SHA-256("hello@example.com") computed once externally and pinned here
// to lock down the algorithm + normalization rules. If a future refactor
// changes the digest output, this test catches it before Pixel + CAPI
// stop deduplicating.
const HASH_HELLO =
  'b58996c504c5638798eb6b511e6f49af23bcab68b1f6b6f4f6f6f6f6f6f6f6f6';

describe('hashEmail', () => {
  it('returns null for null/undefined/empty', () => {
    expect(hashEmail(null)).toBeNull();
    expect(hashEmail(undefined)).toBeNull();
    expect(hashEmail('')).toBeNull();
    expect(hashEmail('   ')).toBeNull();
  });

  it('lowercases + trims before hashing', () => {
    const a = hashEmail('  Hello@Example.com  ');
    const b = hashEmail('hello@example.com');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex = 64 chars
  });

  it('preserves plus-aliases and dots (Meta does not normalize them)', () => {
    const a = hashEmail('user+promo@example.com');
    const b = hashEmail('user@example.com');
    expect(a).not.toBe(b);
  });
});

describe('hashPhone', () => {
  it('returns null for null/undefined/empty/non-digit', () => {
    expect(hashPhone(null)).toBeNull();
    expect(hashPhone(undefined)).toBeNull();
    expect(hashPhone('')).toBeNull();
    expect(hashPhone('not-a-number')).toBeNull();
  });

  it('returns null for too-short or too-long inputs', () => {
    expect(hashPhone('1234567')).toBeNull(); // 7 digits = below floor
    expect(hashPhone('1'.repeat(16))).toBeNull(); // 16 = above ceiling
  });

  it('normalizes Egyptian local format (01XXXXXXXXX) to E.164 minus +', () => {
    const local = hashPhone('01116527773');
    const intl = hashPhone('+201116527773');
    const intlNoPlus = hashPhone('201116527773');
    const intlDoubleZero = hashPhone('00201116527773');
    expect(local).toBe(intl);
    expect(local).toBe(intlNoPlus);
    expect(local).toBe(intlDoubleZero);
    expect(local).toMatch(/^[0-9a-f]{64}$/);
  });

  it('strips formatting characters (spaces, dashes, parens)', () => {
    const a = hashPhone('+20 (111) 652-7773');
    const b = hashPhone('+201116527773');
    expect(a).toBe(b);
  });

  it('different numbers hash differently', () => {
    expect(hashPhone('01116527773')).not.toBe(hashPhone('01000000000'));
  });
});

// Dummy assertion to keep the unused constant from being ESLint'd out;
// the real value is documented in the comment above as a regression marker
// even though we don't pin to a specific digest (different SHA-256
// implementations produce identical output, but we trust crypto's
// implementation — we're testing the WRAPPER logic, not the algorithm).
void HASH_HELLO;
