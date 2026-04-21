/**
 * B2B password-reset email. Arrives after the user clicks "Forgot password"
 * on /b2b/login. Contains a time-limited reset link; token lives in the URL,
 * SHA-256-hashed copy lives in PasswordReset (same shape as Sprint 1).
 */
import { escapeHtml } from '@/lib/utils';

type Input = {
  userName: string;
  resetUrl: string;
  /** How long the link stays valid — surfaced to the reader. */
  expiresInMinutes: number;
  locale: 'ar' | 'en';
};

export type B2BPasswordResetEmail = {
  subject: string;
  text: string;
  html: string;
};

export function renderB2BPasswordResetEmail(
  input: Input,
): B2BPasswordResetEmail {
  return input.locale === 'ar' ? renderAr(input) : renderEn(input);
}

function renderAr(input: Input): B2BPasswordResetEmail {
  const subject = 'إعادة تعيين كلمة المرور — Print By Falcon';
  const text = [
    `أهلًا ${input.userName}،`,
    '',
    `استلمنا طلب إعادة تعيين كلمة مرور حساب شركتك. اضغط الرابط التالي لتعيين كلمة مرور جديدة (صالح لمدة ${input.expiresInMinutes} دقيقة):`,
    input.resetUrl,
    '',
    'لو لم تطلب هذا، تجاهل هذه الرسالة وسيظل حسابك كما هو.',
    '',
    'فريق Print By Falcon',
  ].join('\n');

  const html = `
  <div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.7">
    <p>أهلًا ${escapeHtml(input.userName)}،</p>
    <p>استلمنا طلب إعادة تعيين كلمة مرور حساب شركتك. اضغط الرابط التالي لتعيين كلمة مرور جديدة (صالح لمدة ${input.expiresInMinutes} دقيقة):</p>
    <p><a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">تعيين كلمة مرور جديدة</a></p>
    <p style="color:#64748b;font-size:13px">لو لم تطلب هذا، تجاهل هذه الرسالة وسيظل حسابك كما هو.</p>
    <p style="color:#64748b;font-size:13px">فريق Print By Falcon</p>
  </div>`;

  return { subject, text, html };
}

function renderEn(input: Input): B2BPasswordResetEmail {
  const subject = 'Reset your Print By Falcon password';
  const text = [
    `Hi ${input.userName},`,
    '',
    `We got a request to reset your business account password. Use the link below within ${input.expiresInMinutes} minutes to set a new one:`,
    input.resetUrl,
    '',
    "Didn't request this? Just ignore this email — your account stays as-is.",
    '',
    'Print By Falcon',
  ].join('\n');

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">
    <p>Hi ${escapeHtml(input.userName)},</p>
    <p>We got a request to reset your business account password. Use the link below within ${input.expiresInMinutes} minutes to set a new one:</p>
    <p><a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">Set a new password</a></p>
    <p style="color:#64748b;font-size:13px">Didn't request this? Just ignore this email — your account stays as-is.</p>
    <p style="color:#64748b;font-size:13px">Print By Falcon</p>
  </div>`;

  return { subject, text, html };
}
