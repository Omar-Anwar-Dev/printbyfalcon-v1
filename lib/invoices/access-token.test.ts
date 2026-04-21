import { describe, it, expect } from 'vitest';
import {
  signInvoiceToken,
  verifyInvoiceToken,
  buildInvoicePublicUrl,
} from './access-token';

describe('invoice access-token', () => {
  it('sign/verify roundtrip', () => {
    const token = signInvoiceToken('inv_abc123');
    expect(verifyInvoiceToken('inv_abc123', token)).toBe(true);
  });

  it('rejects tampered token', () => {
    const token = signInvoiceToken('inv_abc123');
    const tampered = token.replace(/^./, (c) => (c === 'a' ? 'b' : 'a'));
    expect(verifyInvoiceToken('inv_abc123', tampered)).toBe(false);
  });

  it('rejects wrong invoice id', () => {
    const token = signInvoiceToken('inv_abc123');
    expect(verifyInvoiceToken('inv_xyz999', token)).toBe(false);
  });

  it('rejects empty + wrong-length tokens', () => {
    expect(verifyInvoiceToken('inv_abc123', '')).toBe(false);
    expect(verifyInvoiceToken('inv_abc123', 'short')).toBe(false);
  });

  it('builds a public URL with trailing-slash-safe base', () => {
    const url = buildInvoicePublicUrl('https://example.com/', 'inv_1');
    expect(url.startsWith('https://example.com/invoices/inv_1.pdf?t=')).toBe(
      true,
    );
  });
});
