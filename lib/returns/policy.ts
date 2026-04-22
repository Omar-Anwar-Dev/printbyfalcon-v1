import { prisma } from '@/lib/db';
import type { AdminRole } from '@prisma/client';

export type ReturnPolicy = {
  enabled: boolean;
  /** Max allowed days between order delivery and return recording. */
  windowDays: number;
  /** Minimum order total to qualify; `null` = no minimum. */
  minOrderEgp: number | null;
  /** Admin roles that may bypass policy checks with an `overrideReason`. */
  overrideRoles: AdminRole[];
};

const DEFAULT_POLICY: ReturnPolicy = {
  enabled: true,
  windowDays: 14,
  minOrderEgp: null,
  overrideRoles: ['OWNER', 'OPS', 'SALES_REP'],
};

const VALID_ROLES: readonly AdminRole[] = ['OWNER', 'OPS', 'SALES_REP'];

export function parseReturnPolicy(raw: unknown): ReturnPolicy {
  if (!raw || typeof raw !== 'object') return DEFAULT_POLICY;
  const obj = raw as Record<string, unknown>;
  const enabled = typeof obj.enabled === 'boolean' ? obj.enabled : true;
  const windowDays =
    typeof obj.windowDays === 'number' && obj.windowDays > 0
      ? Math.floor(obj.windowDays)
      : DEFAULT_POLICY.windowDays;
  const minOrderEgp =
    typeof obj.minOrderEgp === 'number' && obj.minOrderEgp >= 0
      ? obj.minOrderEgp
      : null;
  const overrideRoles = Array.isArray(obj.overrideRoles)
    ? obj.overrideRoles.filter(
        (r): r is AdminRole =>
          typeof r === 'string' &&
          (VALID_ROLES as readonly string[]).includes(r),
      )
    : DEFAULT_POLICY.overrideRoles;
  return { enabled, windowDays, minOrderEgp, overrideRoles };
}

export async function getReturnPolicy(): Promise<ReturnPolicy> {
  const row = await prisma.setting.findUnique({
    where: { key: 'returns.policy' },
  });
  return parseReturnPolicy(row?.value);
}

export async function saveReturnPolicy(
  policy: ReturnPolicy,
  actorId: string,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key: 'returns.policy' },
    update: {
      value: policy as never,
      updatedBy: actorId,
    },
    create: {
      key: 'returns.policy',
      value: policy as never,
      updatedBy: actorId,
    },
  });
}

export type ReturnCheckFailure =
  | { ok: false; reason: 'disabled' }
  | {
      ok: false;
      reason: 'window_expired';
      windowDays: number;
      daysSinceDelivery: number;
    }
  | {
      ok: false;
      reason: 'min_order';
      minOrderEgp: number;
      orderTotalEgp: number;
    }
  | { ok: false; reason: 'product_not_returnable'; sku: string }
  | { ok: false; reason: 'not_delivered' };

export type ReturnCheckResult = { ok: true } | ReturnCheckFailure;

export type CheckReturnContext = {
  orderDeliveredAt: Date | null;
  orderTotalEgp: number;
  items: Array<{ sku: string; returnable: boolean }>;
};

/**
 * Evaluate an attempted return against the active policy. Does NOT consult
 * override flags — callers decide whether to proceed despite failures.
 */
export function checkReturnPolicy(
  policy: ReturnPolicy,
  ctx: CheckReturnContext,
  now: Date = new Date(),
): ReturnCheckResult {
  if (!policy.enabled) return { ok: false, reason: 'disabled' };
  if (!ctx.orderDeliveredAt) return { ok: false, reason: 'not_delivered' };
  const daysSinceDelivery = Math.floor(
    (now.getTime() - ctx.orderDeliveredAt.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (daysSinceDelivery > policy.windowDays) {
    return {
      ok: false,
      reason: 'window_expired',
      windowDays: policy.windowDays,
      daysSinceDelivery,
    };
  }
  if (policy.minOrderEgp !== null && ctx.orderTotalEgp < policy.minOrderEgp) {
    return {
      ok: false,
      reason: 'min_order',
      minOrderEgp: policy.minOrderEgp,
      orderTotalEgp: ctx.orderTotalEgp,
    };
  }
  for (const item of ctx.items) {
    if (!item.returnable) {
      return { ok: false, reason: 'product_not_returnable', sku: item.sku };
    }
  }
  return { ok: true };
}

export function canOverrideReturnPolicy(
  policy: ReturnPolicy,
  role: AdminRole | null,
): boolean {
  if (!role) return false;
  return policy.overrideRoles.includes(role);
}
