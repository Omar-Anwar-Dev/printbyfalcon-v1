/**
 * Shared AR/EN labels for the order status-action buttons (Sprint 5 bugfix).
 *
 * Kept out of the `'use client'` component file because the admin order detail
 * page (a Server Component) needs to build the labels object to pass down as
 * props — and Next.js forbids calling functions declared in a 'use client'
 * module from a server module. Plain-module exports here are importable from
 * both sides without crossing the RSC boundary.
 */
import type { OrderStatus } from '@prisma/client';

const AR: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'وضع بانتظار التأكيد',
  CONFIRMED: 'تأكيد الطلب',
  HANDED_TO_COURIER: 'تسليم لشركة الشحن',
  OUT_FOR_DELIVERY: 'جاري التسليم',
  DELIVERED: 'تأكيد التسليم',
  CANCELLED: 'إلغاء الطلب',
  RETURNED: 'تسجيل إرجاع',
  DELAYED_OR_ISSUE: 'وضع علامة تأخير / مشكلة',
};

const EN: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'Mark Pending',
  CONFIRMED: 'Confirm',
  HANDED_TO_COURIER: 'Mark Handed to Courier',
  OUT_FOR_DELIVERY: 'Mark Out for Delivery',
  DELIVERED: 'Mark Delivered',
  CANCELLED: 'Cancel order',
  RETURNED: 'Record Return',
  DELAYED_OR_ISSUE: 'Flag as Delayed / Issue',
};

export function defaultOrderStatusActionLabels(
  locale: 'ar' | 'en',
): Record<OrderStatus, string> {
  return locale === 'ar' ? AR : EN;
}
