'use server';

/**
 * Admin inventory actions (Sprint 6 S6-D1-T2 / S6-D3-T2 / S6-D6-T3).
 *
 * Receive / adjust are Owner+Ops; global threshold is Owner-only per ADR-016.
 * All mutations go through a transaction, decrement/increment `Inventory.currentQty`,
 * append an `InventoryMovement` row (append-only audit), and write an
 * `AuditLog` entry for the ops-level history.
 */
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { toLocalizedIssues } from '@/lib/validation/error-map';
import {
  receiveStockSchema,
  adjustInventorySchema,
  setSkuThresholdSchema,
  setGlobalThresholdSchema,
  type ReceiveStockInput,
  type AdjustInventoryInput,
  type SetSkuThresholdInput,
  type SetGlobalThresholdInput,
} from '@/lib/validation/inventory';
import { setGlobalLowStockThreshold } from '@/lib/settings/inventory';
import type { AdminRole } from '@prisma/client';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = {
  ok: false;
  errorKey: string;
  fieldErrors?: { path: (string | number)[]; key: string }[];
};
type ActionResult<T> = ActionOk<T> | ActionErr;

const STOCK_ROLES: AdminRole[] = ['OWNER', 'OPS'];

async function requireStockAdmin() {
  return requireAdmin(STOCK_ROLES);
}

function revalidateInventory() {
  revalidatePath('/admin/inventory', 'page');
  revalidatePath('/admin/products', 'page');
  revalidatePath('/admin', 'page');
}

export async function receiveStockAction(
  input: ReceiveStockInput,
): Promise<ActionResult<{ newQty: number }>> {
  const actor = await requireStockAdmin();
  const parsed = receiveStockSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.failed',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }
  const { productId, qty, reason } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return { ok: false, errorKey: 'product.not_found' };

  const newInventory = await prisma.$transaction(async (tx) => {
    const inv = await tx.inventory.upsert({
      where: { productId },
      create: { productId, currentQty: qty },
      update: { currentQty: { increment: qty } },
    });
    await tx.inventoryMovement.create({
      data: {
        productId,
        type: 'RECEIVE',
        qtyDelta: qty,
        reason: reason ?? null,
        actorId: actor.id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'inventory.receive',
        entityType: 'Product',
        entityId: productId,
        after: {
          qtyDelta: qty,
          newQty: inv.currentQty,
          reason: reason ?? null,
        } as never,
      },
    });
    return inv;
  });

  revalidateInventory();
  return { ok: true, data: { newQty: newInventory.currentQty } };
}

export async function adjustInventoryAction(
  input: AdjustInventoryInput,
): Promise<ActionResult<{ newQty: number }>> {
  const actor = await requireStockAdmin();
  const parsed = adjustInventorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.failed',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }
  const { productId, qtyDelta, reason } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return { ok: false, errorKey: 'product.not_found' };

  try {
    const newInventory = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.upsert({
        where: { productId },
        create: { productId, currentQty: Math.max(qtyDelta, 0) },
        update: { currentQty: { increment: qtyDelta } },
      });
      if (inv.currentQty < 0) {
        throw new Error('inventory.would_go_negative');
      }
      await tx.inventoryMovement.create({
        data: {
          productId,
          type: 'ADJUST',
          qtyDelta,
          reason,
          actorId: actor.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'inventory.adjust',
          entityType: 'Product',
          entityId: productId,
          after: { qtyDelta, newQty: inv.currentQty, reason } as never,
        },
      });
      return inv;
    });
    revalidateInventory();
    return { ok: true, data: { newQty: newInventory.currentQty } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'inventory.would_go_negative') {
      return { ok: false, errorKey: 'inventory.would_go_negative' };
    }
    throw err;
  }
}

export async function setSkuLowStockThresholdAction(
  input: SetSkuThresholdInput,
): Promise<ActionResult<{ productId: string; threshold: number | null }>> {
  const actor = await requireStockAdmin();
  const parsed = setSkuThresholdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.failed',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }
  const { productId, threshold } = parsed.data;
  const normalized = threshold ?? null;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return { ok: false, errorKey: 'product.not_found' };

  await prisma.inventory.upsert({
    where: { productId },
    create: { productId, currentQty: 0, lowStockThreshold: normalized },
    update: { lowStockThreshold: normalized },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'inventory.threshold_update',
      entityType: 'Product',
      entityId: productId,
      after: { threshold: normalized } as never,
    },
  });

  revalidateInventory();
  return { ok: true, data: { productId, threshold: normalized } };
}

export async function setGlobalLowStockThresholdAction(
  input: SetGlobalThresholdInput,
): Promise<ActionResult<{ threshold: number }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = setGlobalThresholdSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.failed',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  await setGlobalLowStockThreshold(parsed.data.threshold, actor.id);
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'inventory.global_threshold_update',
      after: { threshold: parsed.data.threshold } as never,
    },
  });

  revalidateInventory();
  return { ok: true, data: { threshold: parsed.data.threshold } };
}
