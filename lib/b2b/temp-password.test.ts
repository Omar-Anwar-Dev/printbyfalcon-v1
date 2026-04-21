import { describe, expect, it } from 'vitest';
import { generateTempPassword } from './temp-password';

describe('generateTempPassword', () => {
  it('emits a 12-char password by default', () => {
    expect(generateTempPassword()).toHaveLength(12);
  });

  it('respects explicit length', () => {
    expect(generateTempPassword(16)).toHaveLength(16);
  });

  it('always contains an uppercase, lowercase, and digit', () => {
    for (let i = 0; i < 50; i++) {
      const pwd = generateTempPassword();
      expect(pwd).toMatch(/[A-Z]/);
      expect(pwd).toMatch(/[a-z]/);
      expect(pwd).toMatch(/\d/);
    }
  });

  it('produces distinct passwords across consecutive calls', () => {
    const batch = Array.from({ length: 20 }, () => generateTempPassword());
    expect(new Set(batch).size).toBe(batch.length);
  });

  it('rejects absurdly short lengths', () => {
    expect(() => generateTempPassword(4)).toThrow();
  });

  it('never emits ambiguous glyphs (0/1/I/O/l/i/o)', () => {
    for (let i = 0; i < 30; i++) {
      expect(generateTempPassword(32)).not.toMatch(/[01IOilo]/);
    }
  });
});
