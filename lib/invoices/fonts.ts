/**
 * Font registration for react-pdf invoice rendering (Sprint 6 S6-D4-T1).
 *
 * Noto Sans Arabic variable TTF ships under `public/fonts/` (OFL license,
 * committed to the repo so invoice rendering doesn't depend on an external
 * CDN at send time). react-pdf's fontkit reads the default axis values from
 * the variable font — adequate for a monolingual Arabic invoice.
 *
 * Register is idempotent (subsequent calls with the same family are no-ops).
 * `ensureFontsRegistered()` is the single call site every renderer goes
 * through before building a PDF.
 */
import path from 'node:path';
import fs from 'node:fs';
import { Font } from '@react-pdf/renderer';

let registered = false;

export const INVOICE_FONT_FAMILY = 'NotoSansArabic';

export function ensureFontsRegistered(): void {
  if (registered) return;
  const ttfPath = path.join(
    process.cwd(),
    'public',
    'fonts',
    'NotoSansArabic.ttf',
  );
  if (!fs.existsSync(ttfPath)) {
    throw new Error(
      `Invoice font missing at ${ttfPath}. Repo should ship the TTF under public/fonts/.`,
    );
  }
  Font.register({
    family: INVOICE_FONT_FAMILY,
    src: ttfPath,
  });
  // react-pdf's default hyphenation callback breaks Arabic glyph shaping.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
