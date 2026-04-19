import { describe, expect, it } from 'vitest';
import { normalizeSearchTerm } from './search-vector';

describe('normalizeSearchTerm', () => {
  it('returns null for empty, null, undefined, or whitespace-only input', () => {
    expect(normalizeSearchTerm('')).toBeNull();
    expect(normalizeSearchTerm(null)).toBeNull();
    expect(normalizeSearchTerm(undefined)).toBeNull();
    expect(normalizeSearchTerm('   ')).toBeNull();
    expect(normalizeSearchTerm('\t\n')).toBeNull();
  });

  it('trims leading/trailing whitespace', () => {
    expect(normalizeSearchTerm('  toner  ')).toBe('toner');
    expect(normalizeSearchTerm('\nHP\t')).toBe('HP');
  });

  it('preserves Arabic characters verbatim', () => {
    expect(normalizeSearchTerm('  حبر  ')).toBe('حبر');
  });

  it('preserves multi-word queries with internal whitespace', () => {
    expect(normalizeSearchTerm('HP LaserJet M404')).toBe('HP LaserJet M404');
  });
});
