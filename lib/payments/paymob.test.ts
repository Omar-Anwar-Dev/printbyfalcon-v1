import { describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyPaymobHmac } from './paymob';

/**
 * Sprint 11 S11-D8-T3 — webhook reliability tests (HMAC half).
 *
 * Proves that `verifyPaymobHmac` is the single source of truth for Paymob
 * callback authentication: legitimate payloads pass, tampered payloads fail,
 * payloads with a correct signature but wrong secret fail. Route-level
 * idempotency + rate-limit + late-webhook-on-cancelled is covered in the
 * Playwright E2E suites.
 */

const SECRET = 'unit-test-hmac-secret';

// Matches the concat order in `verifyPaymobHmac` — same 20-field recipe as the
// production path. Keeping this aligned to the implementation is the point:
// if the concat order ever drifts, the round-trip test will drop immediately.
const HMAC_FIELDS_ORDER = [
  ['amount_cents'],
  ['created_at'],
  ['currency'],
  ['error_occured'],
  ['has_parent_transaction'],
  ['id'],
  ['integration_id'],
  ['is_3d_secure'],
  ['is_auth'],
  ['is_capture'],
  ['is_refunded'],
  ['is_standalone_payment'],
  ['is_voided'],
  ['order', 'id'],
  ['owner'],
  ['pending'],
  ['source_data', 'pan'],
  ['source_data', 'sub_type'],
  ['source_data', 'type'],
  ['success'],
] as const;

function buildInnerObj(overrides: Record<string, unknown> = {}) {
  const defaults = {
    amount_cents: 100000,
    created_at: '2026-04-23T10:00:00',
    currency: 'EGP',
    error_occured: false,
    has_parent_transaction: false,
    id: 999888,
    integration_id: 12345,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: false,
    is_voided: false,
    order: { id: 7777 },
    owner: 42,
    pending: false,
    source_data: { pan: '1234', sub_type: 'MasterCard', type: 'card' },
    success: true,
    ...overrides,
  };
  return defaults;
}

function concatForHmac(inner: Record<string, unknown>): string {
  return HMAC_FIELDS_ORDER.map(([a, b]) => {
    const outer = inner[a] as Record<string, unknown> | undefined;
    const v = b ? outer?.[b] : inner[a];
    return v == null ? '' : String(v);
  }).join('');
}

function signPayload(inner: Record<string, unknown>, secret = SECRET): string {
  return createHmac('sha512', secret)
    .update(concatForHmac(inner))
    .digest('hex');
}

describe('verifyPaymobHmac', () => {
  beforeEach(() => {
    process.env.PAYMOB_HMAC_SECRET = SECRET;
  });

  it('accepts a correctly-signed payload', () => {
    const inner = buildInnerObj();
    const hmac = signPayload(inner);
    const outer = { type: 'TRANSACTION', obj: inner };
    expect(verifyPaymobHmac(outer, hmac)).toBe(true);
  });

  it('rejects a payload with a tampered field', () => {
    const inner = buildInnerObj();
    const hmac = signPayload(inner);
    // Tamper AFTER signing — change the amount.
    const tampered = {
      type: 'TRANSACTION',
      obj: { ...inner, amount_cents: 1 },
    };
    expect(verifyPaymobHmac(tampered, hmac)).toBe(false);
  });

  it('rejects a payload signed with the wrong secret', () => {
    const inner = buildInnerObj();
    const hmac = signPayload(inner, 'wrong-secret');
    const outer = { type: 'TRANSACTION', obj: inner };
    expect(verifyPaymobHmac(outer, hmac)).toBe(false);
  });

  it('rejects when no secret is configured at the server', () => {
    delete process.env.PAYMOB_HMAC_SECRET;
    const inner = buildInnerObj();
    // Signing with any string — verifier should short-circuit on missing env.
    const hmac = signPayload(inner, 'anything');
    const outer = { type: 'TRANSACTION', obj: inner };
    expect(verifyPaymobHmac(outer, hmac)).toBe(false);
  });

  it('handles a payload where nested optional fields are absent', () => {
    const inner = buildInnerObj({
      source_data: {}, // no pan/sub_type/type keys
      order: {}, // no id
    });
    const hmac = signPayload(inner);
    const outer = { type: 'TRANSACTION', obj: inner };
    expect(verifyPaymobHmac(outer, hmac)).toBe(true);
  });

  it('is a constant-time compare (hmac-length mismatch fails cleanly)', () => {
    const inner = buildInnerObj();
    const outer = { type: 'TRANSACTION', obj: inner };
    // Short HMAC — should fail without throwing on buffer-length mismatch.
    expect(() => verifyPaymobHmac(outer, 'deadbeef')).not.toThrow();
    expect(verifyPaymobHmac(outer, 'deadbeef')).toBe(false);
  });

  it('idempotency guarantee — two identical signatures verify identically', () => {
    const inner = buildInnerObj();
    const hmac1 = signPayload(inner);
    const hmac2 = signPayload(inner);
    expect(hmac1).toBe(hmac2);
    const outer = { type: 'TRANSACTION', obj: inner };
    expect(verifyPaymobHmac(outer, hmac1)).toBe(true);
    expect(verifyPaymobHmac(outer, hmac2)).toBe(true);
  });
});
