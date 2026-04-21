import { z } from 'zod';

/** Receive stock — strictly positive qty; reason optional. */
export const receiveStockSchema = z.object({
  productId: z.string().cuid(),
  qty: z.coerce.number().int().min(1).max(1_000_000),
  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;

/** Adjust stock — signed delta; reason is required (audit / ops hygiene). */
export const adjustInventorySchema = z.object({
  productId: z.string().cuid(),
  qtyDelta: z.coerce
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((v) => v !== 0, {
      message: 'delta_must_be_nonzero',
    }),
  reason: z.string().trim().min(1).max(500),
});
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;

/**
 * Per-SKU low-stock threshold override. `null` (or undefined) clears the
 * override and the product falls back to the global default.
 */
export const setSkuThresholdSchema = z.object({
  productId: z.string().cuid(),
  threshold: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_000_000)
    .nullable()
    .optional(),
});
export type SetSkuThresholdInput = z.infer<typeof setSkuThresholdSchema>;

/** Global low-stock default (ADR for Sprint 6 kickoff: default = 5). */
export const setGlobalThresholdSchema = z.object({
  threshold: z.coerce.number().int().min(0).max(1_000_000),
});
export type SetGlobalThresholdInput = z.infer<typeof setGlobalThresholdSchema>;
