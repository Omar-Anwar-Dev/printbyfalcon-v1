/**
 * Server-side WhatsApp message renderers (ADR-033).
 *
 * Each renderer returns a plain-text body ready for Whats360's /api/v1/send-text.
 * No Meta template approval required — copy lives here and ships with the build.
 *
 * Keep renderers small, deterministic, unit-testable. Callers pass normalized
 * domain values (not Prisma rows) so templates don't leak schema knowledge.
 */

export type SupportedLocale = 'ar' | 'en';

export type OrderStatusKey =
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'HANDED_TO_COURIER'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'DELAYED_OR_ISSUE';

export const ORDER_STATUS_LABELS: Record<
  OrderStatusKey,
  { ar: string; en: string }
> = {
  PENDING_CONFIRMATION: { ar: 'بانتظار التأكيد', en: 'Pending confirmation' },
  CONFIRMED: { ar: 'تم تأكيد الطلب', en: 'Confirmed' },
  HANDED_TO_COURIER: { ar: 'تم التسليم للشحن', en: 'Handed to courier' },
  OUT_FOR_DELIVERY: { ar: 'جاري التسليم', en: 'Out for delivery' },
  DELIVERED: { ar: 'تم التسليم', en: 'Delivered' },
  CANCELLED: { ar: 'تم إلغاء الطلب', en: 'Cancelled' },
  RETURNED: { ar: 'تم الإرجاع', en: 'Returned' },
  DELAYED_OR_ISSUE: { ar: 'متأخر / مشكلة', en: 'Delayed / Issue' },
};

const BRAND_AR = 'برنت باي فالكون';
const BRAND_EN = 'Print By Falcon';

export function renderOtp(code: string, locale: SupportedLocale): string {
  if (locale === 'ar') {
    return `رمز التحقق لحسابك في ${BRAND_AR}:\n\n${code}\n\nالرمز صالح لمدة 5 دقائق. لا تشاركه مع أي شخص.`;
  }
  return `Your ${BRAND_EN} verification code:\n\n${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.`;
}

export function renderOrderConfirmed(
  args: {
    orderNumber: string;
    totalEgp: number;
    paymentMethod: 'COD' | 'PAYMOB_CARD';
  },
  locale: SupportedLocale,
): string {
  const { orderNumber, totalEgp, paymentMethod } = args;

  if (locale === 'ar') {
    const methodAr =
      paymentMethod === 'COD' ? 'الدفع عند الاستلام' : 'بطاقة (باي موب)';
    return (
      `تم استلام طلبك بنجاح!\n\n` +
      `رقم الطلب: ${orderNumber}\n` +
      `الإجمالي: ${totalEgp} جنيه\n` +
      `طريقة الدفع: ${methodAr}\n\n` +
      `سنتواصل معك عند كل تحديث لحالة الطلب.\n\n` +
      BRAND_AR
    );
  }

  const methodEn =
    paymentMethod === 'COD' ? 'Cash on delivery' : 'Card (Paymob)';
  return (
    `Your order has been received!\n\n` +
    `Order number: ${orderNumber}\n` +
    `Total: ${totalEgp} EGP\n` +
    `Payment method: ${methodEn}\n\n` +
    `We'll reach out on every status change.\n\n` +
    BRAND_EN
  );
}

export function renderOrderStatusChange(
  args: {
    orderNumber: string;
    newStatus: OrderStatusKey;
    note?: string;
    courierName?: string;
    courierPhone?: string;
  },
  locale: SupportedLocale,
): string {
  const { orderNumber, newStatus, note, courierName, courierPhone } = args;
  const label = ORDER_STATUS_LABELS[newStatus][locale];

  if (locale === 'ar') {
    let body = `تحديث لطلبك رقم ${orderNumber}:\n\nالحالة: ${label}`;
    if (courierName) body += `\nشركة الشحن: ${courierName}`;
    if (courierPhone) body += `\nهاتف المندوب: ${courierPhone}`;
    if (note) body += `\n\nملاحظة: ${note}`;
    body += `\n\n${BRAND_AR}`;
    return body;
  }

  let body = `Update on your order ${orderNumber}:\n\nStatus: ${label}`;
  if (courierName) body += `\nCourier: ${courierName}`;
  if (courierPhone) body += `\nCourier phone: ${courierPhone}`;
  if (note) body += `\n\nNote: ${note}`;
  body += `\n\n${BRAND_EN}`;
  return body;
}

export function renderPaymentFailed(
  orderNumber: string,
  locale: SupportedLocale,
): string {
  if (locale === 'ar') {
    return (
      `لم يكتمل الدفع لطلبك رقم ${orderNumber}.\n\n` +
      `لا تقلق — طلبك لم يُلغَ. يمكنك المحاولة مرة أخرى من صفحة الطلب، ` +
      `أو الرد على هذه الرسالة للمساعدة.\n\n` +
      BRAND_AR
    );
  }
  return (
    `Payment didn't go through for your order ${orderNumber}.\n\n` +
    `Don't worry — your order isn't cancelled. You can try again from the ` +
    `order page, or reply to this message for help.\n\n` +
    BRAND_EN
  );
}

export function renderB2bPendingReview(
  args: { orderNumber: string; slaHours: number },
  locale: SupportedLocale,
): string {
  const { orderNumber, slaHours } = args;
  if (locale === 'ar') {
    return (
      `تم استلام طلب المراجعة رقم ${orderNumber}.\n\n` +
      `فريق المبيعات سيتواصل معك خلال ${slaHours} ساعة لإتمام التفاصيل.\n\n` +
      BRAND_AR
    );
  }
  return (
    `Your review request ${orderNumber} has been received.\n\n` +
    `Our sales team will reach out within ${slaHours} hours to finalize details.\n\n` +
    BRAND_EN
  );
}
