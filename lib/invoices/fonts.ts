/**
 * Font registration for react-pdf invoice rendering.
 *
 * Uses Tajawal (modern Arabic geometric sans-serif, OFL-licensed, committed
 * to the repo under public/fonts/).
 *
 * History:
 *   - Sprint 6: NotoSansArabic variable TTF — fontkit crash on variable fonts.
 *   - Sprint 6 → 15: Amiri 1.003 static TTFs — fixed fontkit crash but had
 *     incomplete contextual-form coverage. Words like "تاريخ", "الكمية",
 *     "لاختياركم" rendered with broken letter shaping (medial م dropped,
 *     يا ligature mangled, etc.) on PDF output.
 *   - Sprint 15 hotfix #3 attempt 1: Noto Naskh Arabic v2.021 — modern
 *     OpenType tables crash react-pdf's fontkit ("Cannot read properties
 *     of undefined (reading 'id')").
 *   - Sprint 15 hotfix #3 attempt 2: Tajawal v1.000 (Boutros International,
 *     Google Fonts). Simple OpenType tables (16 tables, vs 21+ for Noto) so
 *     fontkit handles it cleanly. Designed by Arabic typographers with
 *     correct contextual shaping for every standard Arabic letter
 *     combination including the ones Amiri 1.003 dropped.
 *
 * Register is idempotent (subsequent calls with the same family are no-ops).
 * `ensureFontsRegistered()` is the single call site every renderer goes
 * through before building a PDF.
 */
import path from 'node:path';
import fs from 'node:fs';
import { Font } from '@react-pdf/renderer';

let registered = false;

export const INVOICE_FONT_FAMILY = 'Tajawal';

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
  const regular = resolveFontPath('Tajawal-Regular.ttf');
  const bold = resolveFontPath('Tajawal-Bold.ttf');
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
