/**
 * Zod schemas for catalog admin mutations. Shared between client forms
 * (react-hook-form + zodResolver) and server-side Server Action validation —
 * single source of truth per docs/architecture.md §9.4.
 */
import { z } from 'zod';

// Name/description/SKU text fields — length-bounded to reject junk paste jobs
// without being user-hostile about normal content.
const nameField = z.string().trim().min(2).max(160);
const slugField = z
  .string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9-]+$/, { message: 'slug.format' });
const descriptionField = z.string().trim().max(4000);
const skuField = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/, { message: 'sku.format' });

export const brandSchema = z.object({
  nameAr: nameField,
  nameEn: nameField,
  slug: slugField.optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});
export type BrandInput = z.infer<typeof brandSchema>;

export const categorySchema = z.object({
  nameAr: nameField,
  nameEn: nameField,
  slug: slugField.optional(),
  parentId: z.string().cuid().nullable().optional(),
  position: z.coerce.number().int().min(0).max(9999).default(0),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const productSchema = z.object({
  sku: skuField,
  brandId: z.string().cuid(),
  categoryId: z.string().cuid(),
  slug: slugField.optional(),
  nameAr: nameField,
  nameEn: nameField,
  descriptionAr: descriptionField,
  descriptionEn: descriptionField,
  // Specs come from a key/value editor; serialize to JSON before dispatch.
  specs: z.record(z.string(), z.string()).default({}),
  basePriceEgp: z.coerce.number().nonnegative().max(10_000_000),
  vatExempt: z.coerce.boolean().default(false),
  authenticity: z.enum(['GENUINE', 'COMPATIBLE']).default('GENUINE'),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});
export type ProductInput = z.infer<typeof productSchema>;

export const printerModelSchema = z.object({
  brandId: z.string().cuid(),
  modelName: z.string().trim().min(1).max(120),
  slug: slugField.optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});
export type PrinterModelInput = z.infer<typeof printerModelSchema>;

export const productImageUpdateSchema = z.object({
  id: z.string().cuid(),
  position: z.coerce.number().int().min(0).max(999).optional(),
  altAr: z.string().trim().max(200).nullable().optional(),
  altEn: z.string().trim().max(200).nullable().optional(),
});
export type ProductImageUpdateInput = z.infer<typeof productImageUpdateSchema>;
