/**
 * Bilingual low-stock digest email (Sprint 6 S6-D3-T1).
 *
 * Sent daily at 08:00 Africa/Cairo by the worker cron to all OWNER/OPS admin
 * users with a populated email. Skipped entirely when the low-stock list is
 * empty so we don't train the recipients to ignore a daily "all clear" mail.
 */
import type { LowStockRow } from '@/lib/inventory/low-stock';

type Locale = 'ar' | 'en';

function subject(locale: Locale, count: number): string {
  if (locale === 'ar') return `تنبيه مخزون — ${count} منتج منخفض`;
  return `Low stock — ${count} product${count === 1 ? '' : 's'}`;
}

function text(locale: Locale, rows: LowStockRow[]): string {
  const isAr = locale === 'ar';
  const header = isAr
    ? 'المنتجات التالية على حد التنبيه أو أقل:'
    : 'The following products are at or below their low-stock threshold:';
  const lines = rows.map((r) => {
    const name = isAr ? r.nameAr : r.nameEn;
    return isAr
      ? `• ${name} (${r.sku}) — المتاح: ${r.currentQty} · الحد: ${r.effectiveThreshold}`
      : `• ${name} (${r.sku}) — available: ${r.currentQty}, threshold: ${r.effectiveThreshold}`;
  });
  const footer = isAr
    ? '\nافتح لوحة التحكم لاتخاذ إجراء: /ar/admin/inventory'
    : '\nOpen the admin panel to act: /en/admin/inventory';
  return `${header}\n\n${lines.join('\n')}\n${footer}`;
}

function html(locale: Locale, rows: LowStockRow[]): string {
  const isAr = locale === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const header = isAr
    ? 'المنتجات التالية على حد التنبيه أو أقل:'
    : 'The following products are at or below their low-stock threshold:';
  const headers = {
    sku: isAr ? 'الكود' : 'SKU',
    name: isAr ? 'المنتج' : 'Product',
    avail: isAr ? 'المتاح' : 'Available',
    thr: isAr ? 'الحد' : 'Threshold',
  };
  const listUrl = isAr ? '/ar/admin/inventory' : '/en/admin/inventory';
  const rowsHtml = rows
    .map((r) => {
      const name = isAr ? r.nameAr : r.nameEn;
      const qtyColor = r.currentQty <= 0 ? '#b54747' : '#8f6320';
      return `<tr>
        <td style="padding:8px 12px;font-family:monospace;font-size:12px;">${escapeHtml(r.sku)}</td>
        <td style="padding:8px 12px;">${escapeHtml(name)}</td>
        <td style="padding:8px 12px;color:${qtyColor};font-weight:600;">${r.currentQty}</td>
        <td style="padding:8px 12px;">${r.effectiveThreshold}</td>
      </tr>`;
    })
    .join('');
  return `<!doctype html><html lang="${locale}" dir="${dir}"><body style="font-family:system-ui,sans-serif;color:#0F172A;background:#FAFAF7;margin:0;padding:24px;">
    <div style="max-width:640px;margin:0 auto;">
      <h2 style="margin:0 0 12px;">${escapeHtml(subject(locale, rows.length))}</h2>
      <p style="margin:0 0 16px;">${escapeHtml(header)}</p>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #E5E2DA;border-radius:8px;overflow:hidden;">
        <thead style="background:#F3F1EC;">
          <tr>
            <th style="padding:8px 12px;text-align:${isAr ? 'right' : 'left'};font-size:12px;">${escapeHtml(headers.sku)}</th>
            <th style="padding:8px 12px;text-align:${isAr ? 'right' : 'left'};font-size:12px;">${escapeHtml(headers.name)}</th>
            <th style="padding:8px 12px;text-align:${isAr ? 'right' : 'left'};font-size:12px;">${escapeHtml(headers.avail)}</th>
            <th style="padding:8px 12px;text-align:${isAr ? 'right' : 'left'};font-size:12px;">${escapeHtml(headers.thr)}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p style="margin:16px 0 0;"><a href="${listUrl}" style="color:#0E7C86;">${escapeHtml(isAr ? 'افتح لوحة المخزون' : 'Open inventory dashboard')}</a></p>
    </div>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderLowStockDigest(
  locale: Locale,
  rows: LowStockRow[],
): { subject: string; text: string; html: string } {
  return {
    subject: subject(locale, rows.length),
    text: text(locale, rows),
    html: html(locale, rows),
  };
}
