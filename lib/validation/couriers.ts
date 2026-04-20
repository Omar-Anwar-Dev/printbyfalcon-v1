import { z } from 'zod';

export const courierSchema = z.object({
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : undefined)),
  position: z.coerce.number().int().min(0).max(10_000).default(0),
  active: z.boolean().default(true),
});

export type CourierInput = z.infer<typeof courierSchema>;
