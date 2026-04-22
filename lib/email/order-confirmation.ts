/**
 * Order-confirmation email template (bilingual). The worker's `send-email`
 * job takes the rendered subject/text/html; we avoid MJML/react-email here
 * to keep Sprint 4 light — upgrade target is Sprint 6 when PDF invoicing
 * lands and the email also needs to attach the invoice.
 */

type Item = {
  nameAr: string;
  nameEn: string;
  sku: string;
  qty: number;
  lineTotalEgp: string;
};

type RenderInput = {
  locale: 'ar' | 'en';
  orderNumber: string;
  recipientName: string;
  paymentMethod: string;
  items: Item[];
  subtotalEgp: string;
  shippingEgp: string;
  /// Sprint 9: optional additional totals. Rendered when non-zero.
  codFeeEgp?: string;
  discountEgp?: string;
  vatEgp?: string;
  totalEgp: string;
  orderUrl: string;
};

export function renderOrderConfirmationEmail(input: RenderInput): {
  subject: string;
  text: string;
  html: string;
} {
  const isAr = input.locale === 'ar';
  const subject = isAr
    ? `تأكيد طلبك ${input.orderNumber} — برينت باي فالكون`
    : `Your order ${input.orderNumber} is confirmed — Print By Falcon`;

  const greet = isAr
    ? `أهلًا ${input.recipientName}،`
    : `Hi ${input.recipientName},`;

  const intro = isAr
    ? 'شكرًا لطلبك من برينت باي فالكون. تم تأكيد الطلب وسنتواصل معك قريبًا للتسليم.'
    : 'Thanks for ordering from Print By Falcon. Your order is confirmed and our team will be in touch shortly.';

  const itemLines = input.items
    .map((i) => {
      const name = isAr ? i.nameAr : i.nameEn;
      return `• ${name} × ${i.qty} — ${i.lineTotalEgp} EGP (${i.sku})`;
    })
    .join('\n');

  const paymentLabel =
    input.paymentMethod === 'COD'
      ? isAr
        ? 'الدفع عند الاستلام'
        : 'Cash on delivery'
      : isAr
        ? 'بطاقة بنكية (Paymob)'
        : 'Credit/Debit card (Paymob)';

  const text = [
    greet,
    '',
    intro,
    '',
    isAr ? `رقم الطلب: ${input.orderNumber}` : `Order: ${input.orderNumber}`,
    isAr ? `طريقة الدفع: ${paymentLabel}` : `Payment: ${paymentLabel}`,
    '',
    isAr ? 'المنتجات:' : 'Items:',
    itemLines,
    '',
    isAr
      ? `الإجمالي قبل الشحن: ${input.subtotalEgp} ج.م`
      : `Subtotal: ${input.subtotalEgp} EGP`,
    input.discountEgp
      ? isAr
        ? `الخصم: -${input.discountEgp} ج.م`
        : `Discount: -${input.discountEgp} EGP`
      : null,
    isAr
      ? `الشحن: ${input.shippingEgp} ج.م`
      : `Shipping: ${input.shippingEgp} EGP`,
    input.codFeeEgp
      ? isAr
        ? `رسوم الدفع عند الاستلام: ${input.codFeeEgp} ج.م`
        : `COD fee: ${input.codFeeEgp} EGP`
      : null,
    input.vatEgp
      ? isAr
        ? `ضريبة القيمة المضافة: ${input.vatEgp} ج.م`
        : `VAT: ${input.vatEgp} EGP`
      : null,
    isAr ? `الإجمالي: ${input.totalEgp} ج.م` : `Total: ${input.totalEgp} EGP`,
    '',
    isAr
      ? `تابع حالة الطلب: ${input.orderUrl}`
      : `Track your order: ${input.orderUrl}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const rows = input.items
    .map((i) => {
      const name = isAr ? i.nameAr : i.nameEn;
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          <strong>${escapeHtml(name)}</strong> × ${i.qty}
          <br /><span style="font-family:monospace;color:#888;font-size:12px">${escapeHtml(i.sku)}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:${isAr ? 'left' : 'right'}">${escapeHtml(i.lineTotalEgp)} EGP</td>
      </tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#222;">
  <h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(subject)}</h1>
  <p>${escapeHtml(greet)}</p>
  <p>${escapeHtml(intro)}</p>
  <p>
    <strong>${isAr ? 'رقم الطلب' : 'Order'}:</strong> ${escapeHtml(input.orderNumber)}<br />
    <strong>${isAr ? 'طريقة الدفع' : 'Payment'}:</strong> ${escapeHtml(paymentLabel)}
  </p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    ${rows}
    <tr>
      <td style="padding:8px 0;"><strong>${isAr ? 'الإجمالي' : 'Total'}</strong></td>
      <td style="padding:8px 0;text-align:${isAr ? 'left' : 'right'}"><strong>${escapeHtml(input.totalEgp)} EGP</strong></td>
    </tr>
  </table>
  <p><a href="${escapeHtml(input.orderUrl)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">${isAr ? 'تتبع الطلب' : 'View order'}</a></p>
</body>
</html>`;

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
