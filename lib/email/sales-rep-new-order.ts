/**
 * Bilingual email to OWNER/SALES_REP when a B2B Submit-for-Review order lands
 * (Sprint 8 S8-D1-T3). Plain template — single recipient per job.
 */
const BRAND_AR = 'برنت باي فالكون';
const BRAND_EN = 'Print By Falcon';

export function renderSalesRepNewOrderEmail(args: {
  locale: 'ar' | 'en';
  orderNumber: string;
  companyName: string;
  placedByName: string;
  totalEgp: number;
  adminOrderUrl: string;
  queueUrl: string;
}): { subject: string; text: string; html: string } {
  const {
    locale,
    orderNumber,
    companyName,
    placedByName,
    totalEgp,
    adminOrderUrl,
    queueUrl,
  } = args;

  if (locale === 'ar') {
    const subject = `طلب B2B للمراجعة: ${orderNumber} — ${companyName}`;
    const text =
      `وصل طلب جديد بصيغة Submit-for-Review ومحتاج تأكيد من فريق المبيعات.\n\n` +
      `الشركة: ${companyName}\n` +
      `وضعه: ${placedByName}\n` +
      `رقم الطلب: ${orderNumber}\n` +
      `الإجمالي: ${totalEgp.toLocaleString('en-US')} ج.م\n\n` +
      `افتح الطلب مباشرة:\n${adminOrderUrl}\n\n` +
      `قائمة الطلبات بانتظار التأكيد:\n${queueUrl}\n\n` +
      BRAND_AR;
    const html = `<!doctype html><html dir="rtl"><body style="font-family:Tahoma,sans-serif;line-height:1.6">
<p>وصل طلب جديد بصيغة <strong>Submit-for-Review</strong> ومحتاج تأكيد من فريق المبيعات.</p>
<ul>
<li>الشركة: <strong>${escapeHtml(companyName)}</strong></li>
<li>وضعه: ${escapeHtml(placedByName)}</li>
<li>رقم الطلب: ${escapeHtml(orderNumber)}</li>
<li>الإجمالي: ${totalEgp.toLocaleString('en-US')} ج.م</li>
</ul>
<p><a href="${adminOrderUrl}">افتح الطلب مباشرة</a></p>
<p><a href="${queueUrl}">قائمة الطلبات بانتظار التأكيد</a></p>
<hr/><p style="color:#888">${BRAND_AR}</p>
</body></html>`;
    return { subject, text, html };
  }

  const subject = `B2B review requested: ${orderNumber} — ${companyName}`;
  const text =
    `A new B2B order was submitted for review and needs sales-team confirmation.\n\n` +
    `Company: ${companyName}\n` +
    `Placed by: ${placedByName}\n` +
    `Order: ${orderNumber}\n` +
    `Total: ${totalEgp.toLocaleString('en-US')} EGP\n\n` +
    `Open the order:\n${adminOrderUrl}\n\n` +
    `Pending-confirmation queue:\n${queueUrl}\n\n` +
    BRAND_EN;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6">
<p>A new B2B order was submitted for review and needs sales-team confirmation.</p>
<ul>
<li>Company: <strong>${escapeHtml(companyName)}</strong></li>
<li>Placed by: ${escapeHtml(placedByName)}</li>
<li>Order: ${escapeHtml(orderNumber)}</li>
<li>Total: ${totalEgp.toLocaleString('en-US')} EGP</li>
</ul>
<p><a href="${adminOrderUrl}">Open the order</a></p>
<p><a href="${queueUrl}">Pending-confirmation queue</a></p>
<hr/><p style="color:#888">${BRAND_EN}</p>
</body></html>`;
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
