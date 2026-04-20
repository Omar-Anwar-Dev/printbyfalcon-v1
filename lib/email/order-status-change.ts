/**
 * Bilingual email mirror of the Whats360 status-change message (Sprint 5 S5-D4-T3).
 *
 * Per PRD Feature 5: B2C gets WhatsApp only; B2B gets WhatsApp + email. So
 * this renderer is only called from `updateOrderStatusAction` when the order
 * is type B2B and a contactEmail is present. Subject + text + html mirror
 * the Whats360 body so the customer sees the same copy via both channels.
 */
import {
  ORDER_STATUS_LABELS,
  type OrderStatusKey,
} from '@/lib/whatsapp-templates';

export type RenderStatusChangeEmailInput = {
  locale: 'ar' | 'en';
  orderNumber: string;
  newStatus: OrderStatusKey;
  recipientName: string;
  note?: string;
  courierName?: string;
  courierPhone?: string;
  waybill?: string;
  expectedDeliveryDate?: Date | null;
  orderUrl: string;
};

export function renderOrderStatusChangeEmail(
  input: RenderStatusChangeEmailInput,
): { subject: string; text: string; html: string } {
  const isAr = input.locale === 'ar';
  const label = ORDER_STATUS_LABELS[input.newStatus][input.locale];

  const subject = isAr
    ? `تحديث لطلبك ${input.orderNumber} — ${label}`
    : `Order ${input.orderNumber} update — ${label}`;

  const greet = isAr
    ? `أهلاً ${input.recipientName}،`
    : `Hi ${input.recipientName},`;
  const statusLine = isAr
    ? `الحالة الجديدة لطلبك رقم ${input.orderNumber}: ${label}.`
    : `The new status for your order ${input.orderNumber} is: ${label}.`;

  const lines: string[] = [greet, '', statusLine];
  if (input.courierName) {
    lines.push(
      isAr
        ? `شركة الشحن: ${input.courierName}`
        : `Courier: ${input.courierName}`,
    );
  }
  if (input.courierPhone) {
    lines.push(
      isAr
        ? `هاتف المندوب: ${input.courierPhone}`
        : `Courier phone: ${input.courierPhone}`,
    );
  }
  if (input.waybill) {
    lines.push(
      isAr ? `رقم البوليصة: ${input.waybill}` : `Waybill: ${input.waybill}`,
    );
  }
  if (input.expectedDeliveryDate) {
    const d = input.expectedDeliveryDate.toLocaleDateString(
      isAr ? 'ar-EG' : 'en-US',
    );
    lines.push(isAr ? `التسليم المتوقع: ${d}` : `Expected delivery: ${d}`);
  }
  if (input.note) {
    lines.push('', isAr ? `ملاحظة: ${input.note}` : `Note: ${input.note}`);
  }
  lines.push(
    '',
    isAr ? `راجع الطلب: ${input.orderUrl}` : `View order: ${input.orderUrl}`,
  );
  lines.push('', isAr ? 'برنت باي فالكون' : 'Print By Falcon');

  const text = lines.join('\n');

  const html = `<!DOCTYPE html>
<html lang="${input.locale}" dir="${isAr ? 'rtl' : 'ltr'}">
<body style="font-family: Arial, sans-serif; color: #0F172A; background: #FAFAF7; padding: 24px;">
  <table style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #E5E2DA; border-radius: 8px; padding: 24px;">
    <tr><td>
      <h1 style="font-size: 18px; margin: 0 0 16px 0;">${subject}</h1>
      <p style="margin: 0 0 12px 0;">${greet}</p>
      <p style="margin: 0 0 12px 0;">${statusLine}</p>
      ${input.courierName ? `<p style="margin: 0 0 6px 0;"><strong>${isAr ? 'شركة الشحن' : 'Courier'}:</strong> ${escapeHtml(input.courierName)}</p>` : ''}
      ${input.courierPhone ? `<p style="margin: 0 0 6px 0;"><strong>${isAr ? 'هاتف المندوب' : 'Courier phone'}:</strong> <a href="tel:${escapeHtml(input.courierPhone)}">${escapeHtml(input.courierPhone)}</a></p>` : ''}
      ${input.waybill ? `<p style="margin: 0 0 6px 0;"><strong>${isAr ? 'رقم البوليصة' : 'Waybill'}:</strong> <code>${escapeHtml(input.waybill)}</code></p>` : ''}
      ${input.expectedDeliveryDate ? `<p style="margin: 0 0 6px 0;"><strong>${isAr ? 'التسليم المتوقع' : 'Expected delivery'}:</strong> ${input.expectedDeliveryDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</p>` : ''}
      ${input.note ? `<p style="margin: 12px 0 0 0; padding: 12px; background: #F3F1EC; border-radius: 6px;">${escapeHtml(input.note)}</p>` : ''}
      <p style="margin: 24px 0 0 0;">
        <a href="${escapeHtml(input.orderUrl)}" style="color: #0A6B74; text-decoration: underline;">
          ${isAr ? 'فتح تفاصيل الطلب' : 'View order details'}
        </a>
      </p>
      <p style="margin: 24px 0 0 0; font-size: 12px; color: #6B6B6B;">
        ${isAr ? 'برنت باي فالكون' : 'Print By Falcon'}
      </p>
    </td></tr>
  </table>
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
