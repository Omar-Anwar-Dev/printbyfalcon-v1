import type { AdminRole } from '@prisma/client';

/**
 * Canonical role matrix — single source of truth for admin authorization.
 * Every admin page + Server Action calls `requireAdmin(ROLE_MATRIX.xxx)`.
 *
 * PRD Feature 6:
 *   - OWNER      → full access
 *   - OPS        → orders, status, courier, returns, inventory
 *   - SALES_REP  → B2B queues, tier/credit assignments, customer read
 */
export const ROLE_MATRIX = {
  /** Everything Owner-only — settings, user management, tier pricing. */
  OWNER_ONLY: ['OWNER'] as const,

  /** Catalog writes (products, brands, categories, printer models, images). */
  CATALOG: ['OWNER', 'OPS'] as const,

  /** Inventory writes (receive, adjust, thresholds). */
  STOCK: ['OWNER', 'OPS'] as const,

  /** Courier CRUD. */
  COURIERS: ['OWNER', 'OPS'] as const,

  /** Order mgmt — status, notes, cancellations, COD paid, returns. */
  ORDERS: ['OWNER', 'OPS'] as const,

  /** Returns — record, process, release stock. */
  RETURNS: ['OWNER', 'OPS'] as const,

  /** B2B review — applications, company edits, confirmation. */
  B2B_REVIEW: ['OWNER', 'SALES_REP'] as const,

  /** Customer (B2C) management — profile view, deactivate. */
  CUSTOMERS: ['OWNER', 'SALES_REP'] as const,

  /** Order detail view — all 3 roles can inspect an order. */
  ORDER_VIEW: ['OWNER', 'OPS', 'SALES_REP'] as const,

  /** Sprint 12 — closed-beta feedback triage. */
  FEEDBACK: ['OWNER', 'OPS'] as const,
} satisfies Record<string, readonly AdminRole[]>;

export type RoleMatrixKey = keyof typeof ROLE_MATRIX;

/**
 * Widget visibility on admin home (/admin).
 * Owner sees everything; Ops hides revenue; Sales Rep hides inventory + revenue.
 */
export const DASHBOARD_WIDGETS = {
  // Revenue + sales — OWNER only.
  salesToday: ['OWNER'] as const,
  salesWeek: ['OWNER'] as const,
  salesMonth: ['OWNER'] as const,
  salesTrend: ['OWNER'] as const,
  topCustomers: ['OWNER'] as const,

  // Ops queues — OWNER + OPS.
  newOrders: ['OWNER', 'OPS'] as const,
  lowStock: ['OWNER', 'OPS'] as const,
  returnsPending: ['OWNER', 'OPS'] as const,
  topProducts: ['OWNER', 'OPS'] as const,

  // Sprint 12 — Whats360 device health (M1 single-number posture, ADR-063 + R3-v2).
  whats360Status: ['OWNER', 'OPS'] as const,

  // B2B / sales-rep queues — OWNER + SALES_REP.
  b2bPendingApplications: ['OWNER', 'SALES_REP'] as const,
  b2bPendingConfirmation: ['OWNER', 'SALES_REP'] as const,
} satisfies Record<string, readonly AdminRole[]>;

export type DashboardWidgetKey = keyof typeof DASHBOARD_WIDGETS;

export function canSeeWidget(
  role: AdminRole | null,
  key: DashboardWidgetKey,
): boolean {
  if (!role) return false;
  return (DASHBOARD_WIDGETS[key] as readonly AdminRole[]).includes(role);
}

export function canAct(role: AdminRole | null, key: RoleMatrixKey): boolean {
  if (!role) return false;
  return (ROLE_MATRIX[key] as readonly AdminRole[]).includes(role);
}
