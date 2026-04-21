/**
 * B2B welcome email — sent the moment admin approves an application. Carries
 * the temporary password (`mustChangePassword=true` on the User, forced-reset
 * on first login). Bilingual AR/EN; picks from the applicant's language
 * preference (defaults to AR since most applicants submit in Arabic).
 */
import { escapeHtml } from '@/lib/utils';

type Input = {
  companyName: string;
  contactName: string;
  email: string;
  tempPassword: string;
  pricingTierLabel: string;
  creditTermsLabel: string;
  loginUrl: string;
  /** Optional admin-authored note from the approval dialog. */
  note?: string;
  locale: 'ar' | 'en';
};

export type B2BWelcomeEmail = {
  subject: string;
  text: string;
  html: string;
};

export function renderB2BWelcomeEmail(input: Input): B2BWelcomeEmail {
  return input.locale === 'ar' ? renderAr(input) : renderEn(input);
}

function renderAr(input: Input): B2BWelcomeEmail {
  const subject = `تم اعتماد حساب ${input.companyName} — Print By Falcon`;
  const text = [
    `أهلًا ${input.contactName}،`,
    '',
    `سعدنا بالموافقة على طلب تسجيل شركة ${input.companyName}. حسابك الآن جاهز للدخول.`,
    '',
    `بيانات الدخول:`,
    `البريد: ${input.email}`,
    `كلمة المرور المؤقتة: ${input.tempPassword}`,
    '',
    `مستوى الأسعار: ${input.pricingTierLabel}`,
    `شروط الدفع: ${input.creditTermsLabel}`,
    '',
    input.note ? `ملاحظة من فريقنا: ${input.note}` : null,
    '',
    `عند تسجيل الدخول أول مرة، سنطلب منك تعيين كلمة مرور جديدة.`,
    `رابط تسجيل الدخول: ${input.loginUrl}`,
    '',
    'أهلًا بك في Print By Falcon — جاهزون لخدمة طلباتك.',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
  <div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.7">
    <p>أهلًا ${escapeHtml(input.contactName)}،</p>
    <p>سعدنا بالموافقة على طلب تسجيل شركة <strong>${escapeHtml(input.companyName)}</strong>. حسابك الآن جاهز للدخول.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px 0;font-weight:600">بيانات الدخول</p>
      <p style="margin:4px 0"><strong>البريد:</strong> <code dir="ltr">${escapeHtml(input.email)}</code></p>
      <p style="margin:4px 0"><strong>كلمة المرور المؤقتة:</strong> <code dir="ltr" style="background:#fef3c7;padding:2px 6px;border-radius:4px">${escapeHtml(input.tempPassword)}</code></p>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:4px 0"><strong>مستوى الأسعار:</strong> ${escapeHtml(input.pricingTierLabel)}</p>
      <p style="margin:4px 0"><strong>شروط الدفع:</strong> ${escapeHtml(input.creditTermsLabel)}</p>
    </div>
    ${input.note ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin:16px 0"><p style="margin:0"><strong>ملاحظة من فريقنا:</strong> ${escapeHtml(input.note)}</p></div>` : ''}
    <p>عند تسجيل الدخول أول مرة، سنطلب منك تعيين كلمة مرور جديدة.</p>
    <p><a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">تسجيل الدخول</a></p>
    <p style="color:#64748b;font-size:13px">أهلًا بك في Print By Falcon — جاهزون لخدمة طلباتك.</p>
  </div>`;

  return { subject, text, html };
}

function renderEn(input: Input): B2BWelcomeEmail {
  const subject = `${input.companyName}'s business account is approved — Print By Falcon`;
  const text = [
    `Hi ${input.contactName},`,
    '',
    `Good news — we've approved the business account for ${input.companyName}. You can sign in now.`,
    '',
    `Sign-in details:`,
    `Email: ${input.email}`,
    `Temporary password: ${input.tempPassword}`,
    '',
    `Pricing tier: ${input.pricingTierLabel}`,
    `Payment terms: ${input.creditTermsLabel}`,
    '',
    input.note ? `Note from our team: ${input.note}` : null,
    '',
    `You'll be asked to set a new password the first time you sign in.`,
    `Sign in: ${input.loginUrl}`,
    '',
    "Welcome aboard — we're ready to serve your orders.",
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">
    <p>Hi ${escapeHtml(input.contactName)},</p>
    <p>Good news — we've approved the business account for <strong>${escapeHtml(input.companyName)}</strong>. You can sign in now.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px 0;font-weight:600">Sign-in details</p>
      <p style="margin:4px 0"><strong>Email:</strong> <code>${escapeHtml(input.email)}</code></p>
      <p style="margin:4px 0"><strong>Temporary password:</strong> <code style="background:#fef3c7;padding:2px 6px;border-radius:4px">${escapeHtml(input.tempPassword)}</code></p>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:4px 0"><strong>Pricing tier:</strong> ${escapeHtml(input.pricingTierLabel)}</p>
      <p style="margin:4px 0"><strong>Payment terms:</strong> ${escapeHtml(input.creditTermsLabel)}</p>
    </div>
    ${input.note ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin:16px 0"><p style="margin:0"><strong>Note from our team:</strong> ${escapeHtml(input.note)}</p></div>` : ''}
    <p>You'll be asked to set a new password the first time you sign in.</p>
    <p><a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">Sign in</a></p>
    <p style="color:#64748b;font-size:13px">Welcome aboard — we're ready to serve your orders.</p>
  </div>`;

  return { subject, text, html };
}
