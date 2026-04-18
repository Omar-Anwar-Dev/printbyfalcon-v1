/**
 * Shared zod schemas for primitive inputs. Import into feature-specific schemas
 * to stay consistent (e.g., phone normalization is identical everywhere).
 */
import { z } from 'zod';

/**
 * Egyptian mobile number (01X XXXX XXXX). Accepts spaces/dashes; stores as
 * canonical E.164 with +20 prefix.
 */
export const egyptianPhoneSchema = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[\s-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^(?:\+?20)?01[0-25]\d{8}$/, { message: 'phone.invalid_eg' })
      .transform((v) => {
        // Strip optional international prefix, then drop the leading 0 from the
        // local form (01XXXXXXXXX), then re-prefix with +20 to land on E.164.
        const digits = v.replace(/^\+?20/, '').replace(/^0/, '');
        return `+20${digits}`;
      }),
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'email.invalid' });

export const passwordSchema = z
  .string()
  .min(10, { message: 'password.too_short' })
  .max(128, { message: 'password.too_long' })
  .regex(/[A-Z]/, { message: 'password.needs_uppercase' })
  .regex(/[a-z]/, { message: 'password.needs_lowercase' })
  .regex(/\d/, { message: 'password.needs_digit' });

export const nameSchema = z
  .string()
  .trim()
  .min(2, { message: 'name.too_short' })
  .max(80, { message: 'name.too_long' });

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: 'otp.invalid_format' });
