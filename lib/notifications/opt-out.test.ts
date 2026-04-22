import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory NotificationOptOut store for the mock.
const rows = new Map<string, { source: string; reason: string | null }>();

vi.mock('@/lib/db', () => ({
  prisma: {
    notificationOptOut: {
      findUnique: vi.fn(async (args: { where: { phone: string } }) => {
        const r = rows.get(args.where.phone);
        return r ? { phone: args.where.phone, ...r } : null;
      }),
      create: vi.fn(
        async (args: {
          data: {
            phone: string;
            source: string;
            reason: string | null;
            createdBy: string | null;
          };
        }) => {
          rows.set(args.data.phone, {
            source: args.data.source,
            reason: args.data.reason,
          });
          return { id: 'cuid', ...args.data };
        },
      ),
      deleteMany: vi.fn(async (args: { where: { phone: string } }) => {
        const existed = rows.delete(args.where.phone);
        return { count: existed ? 1 : 0 };
      }),
    },
  },
}));

import {
  detectOptOutMessage,
  normalizeEgyptianPhone,
  isCustomerOptedOut,
  recordOptOut,
  clearOptOut,
} from './opt-out';

describe('normalizeEgyptianPhone', () => {
  it('accepts +20-prefixed E.164', () => {
    expect(normalizeEgyptianPhone('+201012345678')).toBe('201012345678');
  });

  it('accepts 20-prefixed (no plus)', () => {
    expect(normalizeEgyptianPhone('201012345678')).toBe('201012345678');
  });

  it('accepts national 0-prefix', () => {
    expect(normalizeEgyptianPhone('01012345678')).toBe('201012345678');
  });

  it('accepts bare 10-digit national', () => {
    expect(normalizeEgyptianPhone('1012345678')).toBe('201012345678');
  });

  it('strips whitespace and dashes', () => {
    expect(normalizeEgyptianPhone('+20 101-234-5678')).toBe('201012345678');
  });

  it('rejects too-short inputs', () => {
    expect(normalizeEgyptianPhone('+20123')).toBeNull();
    expect(normalizeEgyptianPhone('')).toBeNull();
  });

  it('rejects non-numeric inputs', () => {
    expect(normalizeEgyptianPhone('abcdef')).toBeNull();
  });
});

describe('detectOptOutMessage', () => {
  it('matches STOP in any case', () => {
    expect(detectOptOutMessage('STOP')).toBe(true);
    expect(detectOptOutMessage('stop')).toBe(true);
    expect(detectOptOutMessage('Stop')).toBe(true);
  });

  it('matches UNSUBSCRIBE', () => {
    expect(detectOptOutMessage('unsubscribe')).toBe(true);
  });

  it('matches Arabic opt-out keywords', () => {
    expect(detectOptOutMessage('إلغاء')).toBe(true);
    expect(detectOptOutMessage('الغاء')).toBe(true);
    expect(detectOptOutMessage('ايقاف')).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    expect(detectOptOutMessage('  STOP  ')).toBe(true);
  });

  it('does NOT match STOP embedded in a longer message', () => {
    expect(detectOptOutMessage('please do not STOP my order')).toBe(false);
    expect(detectOptOutMessage('stop sending me wrong items')).toBe(false);
  });

  it('does NOT match similar-but-different keywords', () => {
    expect(detectOptOutMessage('stopped')).toBe(false);
    expect(detectOptOutMessage('hello')).toBe(false);
  });

  it('handles null/undefined/empty', () => {
    expect(detectOptOutMessage(null)).toBe(false);
    expect(detectOptOutMessage(undefined)).toBe(false);
    expect(detectOptOutMessage('')).toBe(false);
  });
});

describe('recordOptOut / isCustomerOptedOut', () => {
  beforeEach(() => {
    rows.clear();
  });

  it('records and looks up by any phone format', async () => {
    await recordOptOut({ phone: '+201012345678', source: 'WHATSAPP_KEYWORD' });
    expect(await isCustomerOptedOut('01012345678')).toBe(true);
    expect(await isCustomerOptedOut('1012345678')).toBe(true);
  });

  it('returns false for non-opted-out phones', async () => {
    expect(await isCustomerOptedOut('+201099999999')).toBe(false);
  });

  it('is idempotent — second recordOptOut for same phone is a no-op', async () => {
    const a = await recordOptOut({
      phone: '+201012345678',
      source: 'WHATSAPP_KEYWORD',
    });
    const b = await recordOptOut({
      phone: '+201012345678',
      source: 'ADMIN',
      reason: 'support ticket',
    });
    expect(a.recorded).toBe(true);
    expect(b.recorded).toBe(false);
    expect(await isCustomerOptedOut('+201012345678')).toBe(true);
  });

  it('rejects invalid phones and returns false', async () => {
    const result = await recordOptOut({
      phone: 'not-a-phone',
      source: 'ADMIN',
    });
    expect(result.recorded).toBe(false);
    expect(result.phone).toBeNull();
  });

  it('clearOptOut removes the record', async () => {
    await recordOptOut({ phone: '+201012345678', source: 'WHATSAPP_KEYWORD' });
    const cleared = await clearOptOut('+201012345678');
    expect(cleared.cleared).toBe(true);
    expect(await isCustomerOptedOut('+201012345678')).toBe(false);
  });

  it('clearOptOut on a non-recorded phone is a no-op', async () => {
    const cleared = await clearOptOut('+201099999999');
    expect(cleared.cleared).toBe(false);
  });

  it('fails open when phone cannot be normalised (does not hide user from notifications)', async () => {
    expect(await isCustomerOptedOut('garbage')).toBe(false);
  });
});
