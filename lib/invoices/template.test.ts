/**
 * Sprint 15 hotfix #3 — regression tests for invoice fonts.
 *
 * Why this test exists:
 *   The invoice has been broken three different ways across Sprint 15:
 *   1. Hotfix #1: react-pdf-incompatible styles caused 500 on download.
 *   2. Hotfix #2: 16-char SKUs overflowed their column.
 *   3. Hotfix #3: Amiri 1.003 had incomplete contextual-form coverage —
 *      words like "تاريخ", "الكمية", "لاختياركم" rendered with mangled
 *      letter shaping despite source being correct. Swapped to Noto Naskh
 *      Arabic v2.021 which has full Arabic Unicode coverage.
 *
 * What this test guards against:
 *   - Someone changes INVOICE_FONT_FAMILY back to a font with bad shaping.
 *   - Font files get deleted, corrupted, or replaced with HTML 404 pages
 *     (we hit this during the v2.021 download — github.com/.../raw redirected
 *     to an HTML page so the .ttf was actually a 14-byte text file).
 *   - ensureFontsRegistered() throws (file path mismatch, etc.).
 *
 * What this test does NOT cover:
 *   - End-to-end PDF rendering (react-pdf + vitest's esbuild transform have
 *     a known JSX-runtime mismatch — those tests belong in a Node harness
 *     or playwright e2e where the full bundler runs).
 *   - Visual correctness of glyph shaping (manual eyeball check on staging).
 */
import path from 'node:path';
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { ensureFontsRegistered, INVOICE_FONT_FAMILY } from './fonts';

describe('invoice fonts (regression: Sprint 15 hotfix #3)', () => {
  it('uses Tajawal — Amiri 1.003 had incomplete shaping; Noto Naskh v2.021 crashed fontkit', () => {
    expect(INVOICE_FONT_FAMILY).toBe('Tajawal');
  });

  it('Regular + Bold TTF files exist under public/fonts/', () => {
    const regular = path.join(
      process.cwd(),
      'public',
      'fonts',
      'Tajawal-Regular.ttf',
    );
    const bold = path.join(
      process.cwd(),
      'public',
      'fonts',
      'Tajawal-Bold.ttf',
    );
    expect(fs.existsSync(regular)).toBe(true);
    expect(fs.existsSync(bold)).toBe(true);
  });

  it('font files are real TTFs (not HTML 404 pages from a bad download)', () => {
    // Real Tajawal TTFs are ~60 KB each. A `curl` of a redirected GitHub URL
    // once silently produced a 14-byte HTML file that satisfied existsSync.
    // This guard catches that failure mode.
    const regular = path.join(
      process.cwd(),
      'public',
      'fonts',
      'Tajawal-Regular.ttf',
    );
    const bold = path.join(
      process.cwd(),
      'public',
      'fonts',
      'Tajawal-Bold.ttf',
    );
    expect(fs.statSync(regular).size).toBeGreaterThan(30_000);
    expect(fs.statSync(bold).size).toBeGreaterThan(30_000);

    // First 4 bytes of a TTF are the "scaler type". For modern TrueType
    // fonts that's 0x00010000. Older Mac fonts use "true" (0x74727565).
    const head = fs.readFileSync(regular).subarray(0, 4);
    const headHex = head.toString('hex');
    const isTtf = headHex === '00010000' || head.toString('ascii') === 'true';
    expect(isTtf).toBe(true);
  });

  it('ensureFontsRegistered does not throw', () => {
    expect(() => ensureFontsRegistered()).not.toThrow();
  });
});
