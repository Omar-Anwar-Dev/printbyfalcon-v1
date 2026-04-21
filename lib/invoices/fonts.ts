/**
 * Font registration for react-pdf invoice rendering (Sprint 6 S6-D4-T1).
 *
 * Uses Amiri 1.003 (Egyptian Arabic typesetting font; OFL-licensed, committed
 * to the repo under public/fonts/). Previously NotoSansArabic variable TTF
 * caused a `TypeError: Cannot read properties of undefined (reading 'id')` in
 * react-pdf's fontkit — variable fonts aren't fully supported. Amiri ships
 * distinct static Regular + Bold TTFs, which fontkit handles cleanly.
 *
 * Register is idempotent (subsequent calls with the same family are no-ops).
 * `ensureFontsRegistered()` is the single call site every renderer goes
 * through before building a PDF.
 */
import path from 'node:path';
import fs from 'node:fs';
import { Font } from '@react-pdf/renderer';

let registered = false;

export const INVOICE_FONT_FAMILY = 'Amiri';

function resolveFontPath(filename: string): string {
  const full = path.join(process.cwd(), 'public', 'fonts', filename);
  if (!fs.existsSync(full)) {
    throw new Error(
      `Invoice font missing at ${full}. Repo should ship the TTF under public/fonts/.`,
    );
  }
  return full;
}

export function ensureFontsRegistered(): void {
  if (registered) return;
  const regular = resolveFontPath('Amiri-Regular.ttf');
  const bold = resolveFontPath('Amiri-Bold.ttf');
  Font.register({
    family: INVOICE_FONT_FAMILY,
    fonts: [
      { src: regular, fontWeight: 'normal' },
      { src: bold, fontWeight: 'bold' },
    ],
  });
  // react-pdf's default hyphenation callback breaks Arabic glyph shaping.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
