/**
 * WhatsApp OTP service: generate, store (hashed), verify, invalidate.
 * All returns are action-result shaped so callers can map to UI errors cleanly.
 */
import { prisma } from '@/lib/db';
import { generateNumericOtp, sha256Hex } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { sendWhatsApp } from '@/lib/whatsapp';
import { renderOtp, type SupportedLocale } from '@/lib/whatsapp-templates';

const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;

export type OtpRequestResult =
  | { ok: true; devCode?: string }
  | { ok: false; errorKey: string };

export type OtpVerifyResult = { ok: true } | { ok: false; errorKey: string };

export async function issueOtp(
  phone: string,
  locale: SupportedLocale = 'ar',
): Promise<OtpRequestResult> {
  const code = generateNumericOtp(6);
  const codeHash = sha256Hex(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Invalidate any unused OTPs for this phone — only the latest is valid.
  await prisma.whatsAppOtp.updateMany({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  await prisma.whatsAppOtp.create({
    data: { phone, codeHash, expiresAt },
  });

  const sendResult = await sendWhatsApp({
    phone,
    body: renderOtp(code, locale),
  });

  if (!sendResult.ok) {
    logger.error(
      { phone: phone.slice(0, 4) + '****', error: sendResult.error },
      'otp.send.failed',
    );
    return { ok: false, errorKey: 'otp.send_failed' };
  }

  // In dev mode, surface the code to the server log and return it so the UI can
  // show a helpful hint. Never return the code in production.
  const devMode = process.env.OTP_DEV_MODE === 'true';
  if (devMode) {
    logger.warn(
      { phone: phone.slice(0, 4) + '****', code },
      'otp.dev_mode.issued',
    );
    return { ok: true, devCode: code };
  }

  return { ok: true };
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<OtpVerifyResult> {
  const codeHash = sha256Hex(code);
  const now = new Date();

  const otp = await prisma.whatsAppOtp.findFirst({
    where: { phone, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return { ok: false, errorKey: 'otp.incorrect' };
  if (otp.expiresAt <= now) return { ok: false, errorKey: 'otp.expired' };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, errorKey: 'otp.too_many_attempts' };
  }

  if (otp.codeHash !== codeHash) {
    await prisma.whatsAppOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, errorKey: 'otp.incorrect' };
  }

  await prisma.whatsAppOtp.update({
    where: { id: otp.id },
    data: { usedAt: now },
  });

  return { ok: true };
}

export async function cleanupExpiredOtps(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await prisma.whatsAppOtp.deleteMany({
    where: { OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }] },
  });
  return count;
}
