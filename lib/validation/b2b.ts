/**
 * B2B (Sprint 7) validation schemas.
 *
 * The `b2bApplicationSchema` is the public-facing signup form: applicants
 * self-submit their company data; admin reviews later. `b2bApplicationDecisionSchema`
 * covers the admin's approve/reject call.
 *
 * Phone + email normalization reuses the shared schemas in `./common.ts`.
 * Governorate is constrained to the Prisma enum so typos can't land in the DB.
 */
import { z } from 'zod';
import { Governorate } from '@prisma/client';
import {
  egyptianPhoneSchema,
  emailSchema,
  nameSchema,
  passwordSchema,
} from './common';

const trimmed = (min: number, max: number, key: string) =>
  z
    .string()
    .trim()
    .min(min, { message: key })
    .max(max, { message: 'field.too_long' });

/** Commercial registry number — Egyptian format is a 5-8 digit string,
 * but we store as-captured to keep ingest forgiving (some historical records
 * include branch suffixes). Admin can sanity-check on review. */
const crNumberSchema = trimmed(4, 32, 'b2b.cr.invalid');

/** Tax card number — Egyptian tax card is a 9-digit string, sometimes
 * formatted with dashes. Similar forgiving capture. */
const taxCardNumberSchema = trimmed(4, 32, 'b2b.tax.invalid');

const governorateSchema = z.nativeEnum(Governorate, {
  errorMap: () => ({ message: 'b2b.governorate.required' }),
});

export const b2bApplicationSchema = z.object({
  companyName: trimmed(2, 120, 'b2b.company.required'),
  crNumber: crNumberSchema,
  taxCardNumber: taxCardNumberSchema,
  contactName: nameSchema,
  phone: egyptianPhoneSchema,
  email: emailSchema,
  password: passwordSchema,
  governorate: governorateSchema,
  city: trimmed(2, 80, 'b2b.city.required'),
  addressLine: z
    .string()
    .trim()
    .max(200, { message: 'field.too_long' })
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  monthlyVolumeEstimate: z
    .string()
    .trim()
    .max(80, { message: 'field.too_long' })
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type B2BApplicationInput = z.infer<typeof b2bApplicationSchema>;

/** Admin decision payload — approve with a tier + credit terms, or reject
 * with a mandatory reason so the applicant knows what to fix on resubmit. */
export const b2bApplicationApproveSchema = z.object({
  applicationId: z.string().min(1),
  pricingTierCode: z.enum(['A', 'B', 'C']),
  creditTerms: z.enum(['NONE', 'NET_15', 'NET_30', 'CUSTOM']),
  // `.nullish()` instead of `.optional()` — HTML forms send `null` via
  // `formData.get()` when the input isn't rendered (our credit-limit field
  // is conditional on `creditTerms === 'CUSTOM'`). `.optional()` alone
  // rejects `null`, so the whole form fails with `validation.invalid`.
  creditLimitEgp: z
    .string()
    .nullish()
    .transform((v) => {
      if (!v || v.trim() === '') return null;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  note: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export const b2bApplicationRejectSchema = z.object({
  applicationId: z.string().min(1),
  reason: trimmed(10, 500, 'b2b.reject.reason.required'),
});

export type B2BApplicationApproveInput = z.infer<
  typeof b2bApplicationApproveSchema
>;
export type B2BApplicationRejectInput = z.infer<
  typeof b2bApplicationRejectSchema
>;

export const companyPriceOverrideSchema = z.object({
  companyId: z.string().min(1),
  sku: z.string().trim().min(1, { message: 'b2b.override.sku.required' }),
  customPriceEgp: z
    .string()
    .trim()
    .min(1)
    .transform((v) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error('b2b.override.price.invalid');
      }
      return n;
    }),
});

export const companyUpdateSchema = z.object({
  companyId: z.string().min(1),
  pricingTierCode: z.enum(['A', 'B', 'C']),
  creditTerms: z.enum(['NONE', 'NET_15', 'NET_30', 'CUSTOM']),
  // Same null-vs-undefined rationale as the approve schema above.
  creditLimitEgp: z
    .string()
    .nullish()
    .transform((v) => {
      if (!v || v.trim() === '') return null;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  checkoutPolicy: z.enum(['BOTH', 'SUBMIT_FOR_REVIEW_ONLY', 'PAY_NOW_ONLY']),
});

export type CompanyPriceOverrideInput = z.infer<
  typeof companyPriceOverrideSchema
>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
