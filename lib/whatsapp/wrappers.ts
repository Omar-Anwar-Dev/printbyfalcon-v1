/**
 * Sprint 15 — typed wrappers around `renderTemplateFromDb`.
 *
 * Each wrapper:
 *   1. Maps domain args (e.g. order status, courier info) to template variables.
 *   2. Tries the DB-driven template via `renderTemplateOrFallback`.
 *   3. Falls back to the hardcoded `lib/whatsapp-templates.ts` function if the
 *      template row is missing or `isActive: false`.
 *
 * Call sites in `app/actions/*.ts` use these instead of the hardcoded
 * functions directly. OTP path stays on the hardcoded `renderOtp` (auth-
 * critical, ADR-067).
 */

import {
  renderOrderStatusChange,
  renderB2bPendingReview,
  renderB2bOrderConfirmedByRep,
  type OrderStatusKey,
  type SupportedLocale,
} from '@/lib/whatsapp-templates';
import { renderTemplateOrFallback } from '@/lib/whatsapp/render-template';

/**
 * Order status-change message. Status-specific template if we shipped one;
 * hardcoded otherwise. Templates exist for HANDED_TO_COURIER, DELIVERED,
 * CANCELLED — see `lib/whatsapp/templates-seed.ts`.
 */
export async function renderOrderStatusChangeMessage(
  args: {
    orderNumber: string;
    newStatus: OrderStatusKey;
    note?: string;
    courierName?: string;
    courierPhone?: string;
  },
  locale: SupportedLocale,
): Promise<string> {
  const keyMap: Partial<Record<OrderStatusKey, string>> = {
    HANDED_TO_COURIER: 'order.handed_to_courier',
    DELIVERED: 'order.delivered',
    CANCELLED: 'order.cancelled',
  };
  const templateKey = keyMap[args.newStatus];

  if (!templateKey) {
    // No DB template for this status — go straight to hardcoded.
    return renderOrderStatusChange(args, locale);
  }

  const courierPhoneLine = args.courierPhone
    ? locale === 'ar'
      ? `📞 موبايل المندوب: ${args.courierPhone}\n`
      : `📞 Driver phone: ${args.courierPhone}\n`
    : '';
  const reasonLine = args.note
    ? locale === 'ar'
      ? `📝 السبب: ${args.note}\n`
      : `📝 Reason: ${args.note}\n`
    : '';

  return renderTemplateOrFallback(
    templateKey,
    locale,
    {
      orderNumber: args.orderNumber,
      courierName: args.courierName ?? '',
      courierPhoneLine,
      // ETA + refundNote are template-defined optional vars; we don't track
      // ETA today, refund flow is out-of-band.
      etaLine: '',
      reasonLine,
      refundNoteLine: '',
    },
    () => renderOrderStatusChange(args, locale),
  );
}

/**
 * B2B pending-review message. Sent at order submission for the
 * Submit-for-Review path.
 */
export async function renderB2bPendingReviewMessage(
  args: {
    orderNumber: string;
    slaHours: number;
    companyName?: string;
    total?: string;
  },
  locale: SupportedLocale,
): Promise<string> {
  return renderTemplateOrFallback(
    'b2b.pending_review',
    locale,
    {
      orderNumber: args.orderNumber,
      slaHours: args.slaHours,
      // Optional vars — pass empty if caller didn't provide. The seed template
      // for b2b.pending_review uses {{companyName}} + {{total}} so callers
      // SHOULD populate these going forward; legacy callers fall back cleanly.
      companyName: args.companyName ?? '',
      total: args.total ?? '',
    },
    () => renderB2bPendingReview(args, locale),
  );
}

/**
 * B2B order confirmed by sales rep — sent after rep flips the order status
 * + sets the agreed payment terms.
 */
export async function renderB2bOrderConfirmedByRepMessage(
  args: { orderNumber: string; paymentMethodNote: string; repNote?: string },
  locale: SupportedLocale,
): Promise<string> {
  const repNoteLine = args.repNote
    ? locale === 'ar'
      ? `\n📝 ملاحظة: ${args.repNote}`
      : `\n📝 Note: ${args.repNote}`
    : '';
  return renderTemplateOrFallback(
    'b2b.confirmed',
    locale,
    {
      orderNumber: args.orderNumber,
      paymentTerms: args.paymentMethodNote,
      repNoteLine,
    },
    () => renderB2bOrderConfirmedByRep(args, locale),
  );
}
