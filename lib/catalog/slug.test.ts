import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('lowercases + dashes spaces', () => {
    expect(slugify('HP LaserJet Pro M404')).toBe('hp-laserjet-pro-m404');
  });

  it('strips non-ascii combining marks', () => {
    expect(slugify('Café Résumé')).toBe('cafe-resume');
  });

  it('collapses consecutive dashes', () => {
    expect(slugify('foo --  bar')).toBe('foo-bar');
  });

  it('handles Arabic input by dropping non-ascii', () => {
    // Arabic letters are non-latin — they don't combine away, so the output
    // becomes empty. Seeder callers pass English copy as the seed in that case.
    expect(slugify('خرطوشة')).toBe('');
  });

  it('handles numeric and punctuation', () => {
    expect(slugify('HP.CF259A_v2')).toBe('hp-cf259a-v2');
  });
});

describe('uniqueSlug', () => {
  it('returns base slug when unused', async () => {
    const seen = new Set<string>();
    const r = await uniqueSlug('HP 59A', async (s) => seen.has(s));
    expect(r).toBe('hp-59a');
  });

  it('suffixes -2, -3 on collisions', async () => {
    const seen = new Set(['hp-59a', 'hp-59a-2']);
    const r = await uniqueSlug('HP 59A', async (s) => seen.has(s));
    expect(r).toBe('hp-59a-3');
  });

  it('falls back to "item" when seed is empty', async () => {
    const r = await uniqueSlug('', async () => false);
    expect(r).toBe('item');
  });
});
