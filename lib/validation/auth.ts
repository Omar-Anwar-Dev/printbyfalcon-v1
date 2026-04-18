import { z } from 'zod';
import {
  egyptianPhoneSchema,
  emailSchema,
  otpCodeSchema,
  passwordSchema,
} from './common';

export const requestOtpSchema = z.object({
  phone: egyptianPhoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: egyptianPhoneSchema,
  code: otpCodeSchema,
});

export const b2bLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'password.required' }),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'password.mismatch',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'password.mismatch',
  });

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type B2BLoginInput = z.infer<typeof b2bLoginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
