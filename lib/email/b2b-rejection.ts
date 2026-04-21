/**
 * B2B application rejection email (Sprint 7 S7-D5-T1). Sent after admin
 * rejects an application with a mandatory reason. Bilingual; Design A
 * rejections leave no User row behind so the applicant can resubmit with
 * the same email after resolving whatever the rejection flagged.
 */
import { escapeHtml } from '@/lib/utils';

type Input = {
  companyName: string;
  contactName: string;
  reason: string;
  /** URL to the signup form so they can resubmit directly. */
  registerUrl: string;
  locale: 'ar' | 'en';
};

export type B2BRejectionEmail = {
  subject: string;
  text: string;
  html: string;
};

export function renderB2BRejectionEmail(input: Input): B2BRejectionEmail {
  return input.locale === 'ar' ? renderAr(input) : renderEn(input);
}

function renderAr(input: Input): B2BRejectionEmail {
  const subject = `تحديث بخصوص طلب حساب شركة ${input.companyName} — Print By Falcon`;
  const text = [
    `أهلًا ${input.contactName}،`,
    '',
    `راجعنا طلب تسجيل حساب شركة ${input.companyName} ولم نتمكن من اعتماده في الوقت الحالي.`,
    '',
    `السبب:`,
    input.reason,
    '',
    `لو أمكنك معالجة النقطة أعلاه، يسعدنا استقبال طلب جديد:`,
    input.registerUrl,
    '',
    `لأي استفسار تواصل معنا مباشرة.`,
    '',
    'شكرًا لاهتمامك بالعمل مع Print By Falcon.',
  ].join('\n');

  const html = `
  <div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.7">
    <p>أهلًا ${escapeHtml(input.contactName)}،</p>
    <p>راجعنا طلب تسجيل حساب شركة <strong>${escapeHtml(input.companyName)}</strong> ولم نتمكن من اعتماده في الوقت الحالي.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px 0;font-weight:600">السبب</p>
      <p style="margin:0;white-space:pre-line">${escapeHtml(input.reason)}</p>
    </div>
    <p>لو أمكنك معالجة النقطة أعلاه، يسعدنا استقبال طلب جديد:</p>
    <p><a href="${escapeHtml(input.registerUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">تقديم طلب جديد</a></p>
    <p>لأي استفسار تواصل معنا مباشرة.</p>
    <p style="color:#64748b;font-size:13px">شكرًا لاهتمامك بالعمل مع Print By Falcon.</p>
  </div>`;

  return { subject, text, html };
}

function renderEn(input: Input): B2BRejectionEmail {
  const subject = `Update on ${input.companyName}'s business account — Print By Falcon`;
  const text = [
    `Hi ${input.contactName},`,
    '',
    `We've reviewed the business account request for ${input.companyName} and, unfortunately, can't approve it at this time.`,
    '',
    `Reason:`,
    input.reason,
    '',
    `If you can address the point above, we'd be happy to review a fresh application:`,
    input.registerUrl,
    '',
    `Feel free to reach out with any questions.`,
    '',
    'Thank you for your interest in Print By Falcon.',
  ].join('\n');

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">
    <p>Hi ${escapeHtml(input.contactName)},</p>
    <p>We've reviewed the business account request for <strong>${escapeHtml(input.companyName)}</strong> and, unfortunately, can't approve it at this time.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px 0;font-weight:600">Reason</p>
      <p style="margin:0;white-space:pre-line">${escapeHtml(input.reason)}</p>
    </div>
    <p>If you can address the point above, we'd be happy to review a fresh application:</p>
    <p><a href="${escapeHtml(input.registerUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">Submit a new application</a></p>
    <p>Feel free to reach out with any questions.</p>
    <p style="color:#64748b;font-size:13px">Thank you for your interest in Print By Falcon.</p>
  </div>`;

  return { subject, text, html };
}
