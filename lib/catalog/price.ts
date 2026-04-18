/**
 * Price formatting. EGP only at MVP. Arabic locale uses Arabic-Indic digits;
 * English uses Latin digits. Both show "ج.م" as currency symbol in Arabic,
 * "EGP" in English — matches Egyptian e-commerce norms.
 */
import type { Decimal } from '@prisma/client/runtime/library';

export function formatEgp(
  value: number | string | Decimal,
  locale: 'ar' | 'en',
): string {
  const n = typeof value === 'number' ? value : Number(value.toString());
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return locale === 'ar'
    ? `${formatter.format(n)} ج.م`
    : `${formatter.format(n)} EGP`;
}
