/**
 * Order status state machine (Sprint 5 S5-D1-T3).
 *
 * Allowed transitions per PRD Feature 5 status pipeline:
 *   PENDING_CONFIRMATION → CONFIRMED | CANCELLED
 *   CONFIRMED            → HANDED_TO_COURIER | CANCELLED | DELAYED_OR_ISSUE
 *   HANDED_TO_COURIER    → OUT_FOR_DELIVERY | DELAYED_OR_ISSUE | CANCELLED (rare — courier lost/damaged)
 *   OUT_FOR_DELIVERY     → DELIVERED | RETURNED | DELAYED_OR_ISSUE
 *   DELIVERED            → RETURNED
 *   DELAYED_OR_ISSUE     → CONFIRMED | HANDED_TO_COURIER | OUT_FOR_DELIVERY | CANCELLED (recovery or abandonment)
 *   CANCELLED / RETURNED → terminal (no further transitions)
 */
import type { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['HANDED_TO_COURIER', 'CANCELLED', 'DELAYED_OR_ISSUE'],
  HANDED_TO_COURIER: ['OUT_FOR_DELIVERY', 'DELAYED_OR_ISSUE', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED', 'DELAYED_OR_ISSUE'],
  DELIVERED: ['RETURNED'],
  DELAYED_OR_ISSUE: [
    'CONFIRMED',
    'HANDED_TO_COURIER',
    'OUT_FOR_DELIVERY',
    'CANCELLED',
  ],
  CANCELLED: [],
  RETURNED: [],
};

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Statuses that release inventory reservations back to stock when entered.
 * Returned restocking is handled separately in the returns admin UI (S5-D7).
 */
export function statusReleasesInventory(status: OrderStatus): boolean {
  return status === 'CANCELLED';
}

/** Terminal states — no further transitions allowed. */
export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].length === 0;
}
